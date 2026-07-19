package com.sortmate.my.service;

import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import com.sortmate.item.entity.Item;
import com.sortmate.item.repository.ItemRepository;
import com.sortmate.my.dto.ExportDtos.DataTypeOption;
import com.sortmate.my.dto.ExportDtos.DestinationOption;
import com.sortmate.my.dto.ExportDtos.ExportCancelResponse;
import com.sortmate.my.dto.ExportDtos.ExportJobResponse;
import com.sortmate.my.dto.ExportDtos.ExportOptionsResponse;
import com.sortmate.my.dto.ExportDtos.ExportProgressResponse;
import com.sortmate.my.dto.ExportDtos.ExportStartRequest;
import com.sortmate.my.entity.DataType;
import com.sortmate.my.entity.Destination;
import com.sortmate.my.entity.ExportJob;
import com.sortmate.my.entity.ExportStatus;
import com.sortmate.my.repository.ExportJobRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** MY-03~06 데이터 내보내기 서비스. */
@Service
public class ExportService {

    /** 2GB 초과 시 분할 안내(계약 my.md MY-03). */
    static final long SPLIT_THRESHOLD_BYTES = 2L * 1024 * 1024 * 1024;

    private final ExportJobRepository jobRepository;
    private final ItemRepository itemRepository;

    public ExportService(ExportJobRepository jobRepository, ItemRepository itemRepository) {
        this.jobRepository = jobRepository;
        this.itemRepository = itemRepository;
    }

    // ── MY-03 옵션 조회 ────────────────────────────────────────
    @Transactional(readOnly = true)
    public ExportOptionsResponse options(Long userId) {
        List<Item> items = itemRepository.findByOwnerId(userId);
        long estimated = sumBytes(items);
        List<DataTypeOption> dataTypes = List.of(
                new DataTypeOption("JSON_METADATA", "JSON 메타데이터", "AI 태그, 소스 URL 및 타임스탬프", true),
                new DataTypeOption("ORIGINAL_FILES", "원본 파일", "고해상도 스크린샷 및 미디어", true));
        List<DestinationOption> destinations = List.of(
                new DestinationOption("DOWNLOAD", "직접 다운로드 (.zip)", true, true),
                new DestinationOption("GOOGLE_DRIVE", "구글 드라이브", false, false),
                new DestinationOption("EMAIL", "이메일로 전송", false, false));
        return new ExportOptionsResponse(items.size(), estimated, SPLIT_THRESHOLD_BYTES, dataTypes, destinations);
    }

    // ── MY-04 시작(202, 비동기 잡) ─────────────────────────────
    @Transactional
    public ExportJobResponse start(Long userId, ExportStartRequest req) {
        Set<DataType> dataTypes = parseDataTypes(req.dataTypes());
        Destination destination = parseDestination(req.destination());
        if (!destination.isAvailable()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    destination.name() + " 저장 위치는 아직 지원되지 않습니다.");
        }
        requireNoRunningJob(userId);

        List<Item> items = itemRepository.findByOwnerId(userId);
        ExportJob job = jobRepository.save(
                new ExportJob(userId, dataTypes, destination, items.size(), sumBytes(items)));
        return ExportJobResponse.of(job);
    }

    // ── MY-05 진행 조회(폴링) ──────────────────────────────────
    @Transactional
    public ExportProgressResponse progress(Long userId, Long jobId) {
        ExportJob job = jobRepository.findByIdAndUserId(jobId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.EXPORT_JOB_NOT_FOUND));
        job.settle(Instant.now());
        return ExportProgressResponse.of(job);
    }

    // ── MY-06 취소 ─────────────────────────────────────────────
    @Transactional
    public ExportCancelResponse cancel(Long userId, Long jobId) {
        ExportJob job = jobRepository.findByIdAndUserId(jobId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.EXPORT_JOB_NOT_FOUND));
        job.settle(Instant.now());
        if (job.isTerminal()) {
            throw new BusinessException(ErrorCode.EXPORT_NOT_CANCELABLE);
        }
        job.cancel();
        return new ExportCancelResponse(job.getId(), job.getStatus().name());
    }

    // ── 내부 헬퍼 ──────────────────────────────────────────────
    private void requireNoRunningJob(Long userId) {
        Instant now = Instant.now();
        boolean running = jobRepository
                .findByUserIdAndStatusNotIn(userId,
                        List.of(ExportStatus.DONE, ExportStatus.FAILED, ExportStatus.CANCELED))
                .stream()
                .peek(j -> j.settle(now)) // 시간 경과로 완료된 잡은 여기서 종료 전이(멱등)
                .anyMatch(j -> !j.isTerminal());
        if (running) {
            throw new BusinessException(ErrorCode.EXPORT_ALREADY_RUNNING);
        }
    }

    private long sumBytes(List<Item> items) {
        return items.stream().filter(i -> i.getFileSize() != null).mapToLong(Item::getFileSize).sum();
    }

    private Set<DataType> parseDataTypes(List<String> raw) {
        Set<DataType> out = new LinkedHashSet<>();
        for (String s : raw) {
            try {
                out.add(DataType.valueOf(s.trim().toUpperCase(Locale.ROOT)));
            } catch (IllegalArgumentException | NullPointerException e) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                        "dataTypes는 JSON_METADATA|ORIGINAL_FILES만 허용됩니다.");
            }
        }
        if (out.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "dataTypes는 1개 이상이어야 합니다.");
        }
        return out;
    }

    private Destination parseDestination(String raw) {
        try {
            return Destination.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "destination은 DOWNLOAD|GOOGLE_DRIVE|EMAIL만 허용됩니다.");
        }
    }
}
