package com.sortmate.my.dto;

import com.sortmate.my.entity.ExportJob;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;

/** MY-03~06 내보내기 DTO(계약 my.md). */
public final class ExportDtos {

    private ExportDtos() {
    }

    // ── MY-03 옵션 조회 ────────────────────────────────────────
    public record DataTypeOption(String type, String label, String description, boolean defaultSelected) {
    }

    public record DestinationOption(String type, String label, boolean available, boolean defaultSelected) {
    }

    public record ExportOptionsResponse(
            int itemCount,
            long estimatedBytes,
            long splitThresholdBytes,
            List<DataTypeOption> dataTypes,
            List<DestinationOption> destinations) {
    }

    // ── MY-04 시작 요청 ────────────────────────────────────────
    public record ExportStartRequest(
            @NotEmpty(message = "dataTypes는 1개 이상이어야 합니다.")
            List<String> dataTypes,
            @NotNull(message = "destination은 필수입니다.")
            String destination) {
    }

    /** MY-04 접수(202) 응답. */
    public record ExportJobResponse(
            Long exportJobId,
            String status,
            int progressPercent,
            int itemCount,
            long estimatedBytes,
            Instant createdAt) {

        public static ExportJobResponse of(ExportJob j) {
            return new ExportJobResponse(j.getId(), j.getStatus().name(), j.getProgressPercent(),
                    j.getItemCount(), j.getEstimatedBytes(), j.getCreatedAt());
        }
    }

    // ── MY-05 진행 조회(폴링) ──────────────────────────────────
    public record ExportProgressResponse(
            Long exportJobId,
            String status,
            int progressPercent,
            String currentTask,
            int itemCount,
            long estimatedBytes,
            Long resultBytes,
            String downloadUrl,
            boolean encrypted,
            Instant createdAt,
            Instant completedAt,
            String error) {

        public static ExportProgressResponse of(ExportJob j) {
            return new ExportProgressResponse(j.getId(), j.getStatus().name(), j.getProgressPercent(),
                    j.getCurrentTask(), j.getItemCount(), j.getEstimatedBytes(), j.getResultBytes(),
                    j.getDownloadUrl(), j.isEncrypted(), j.getCreatedAt(), j.getCompletedAt(), j.getError());
        }
    }

    // ── MY-06 취소 응답 ────────────────────────────────────────
    public record ExportCancelResponse(Long exportJobId, String status) {
    }
}
