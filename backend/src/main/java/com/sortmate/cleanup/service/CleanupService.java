package com.sortmate.cleanup.service;

import com.sortmate.cleanup.dto.CleanupDashboardResponse;
import com.sortmate.cleanup.dto.CleanupDashboardResponse.Category;
import com.sortmate.cleanup.dto.CleanupDashboardResponse.OptimizationInsight;
import com.sortmate.cleanup.dto.CleanupDashboardResponse.Storage;
import com.sortmate.cleanup.dto.CleanupReportResponse;
import com.sortmate.cleanup.dto.CleanupReportResponse.Breakdown;
import com.sortmate.cleanup.dto.CleanupReportResponse.Cumulative;
import com.sortmate.cleanup.dto.CleanupReportResponse.Hygiene;
import com.sortmate.cleanup.dto.CleanupReportResponse.Suggestion;
import com.sortmate.cleanup.dto.CleanupReportResponse.Weekly;
import com.sortmate.cleanup.dto.DuplicateDtos.DismissResponse;
import com.sortmate.cleanup.dto.DuplicateDtos.DuplicateCandidateDto;
import com.sortmate.cleanup.dto.DuplicateDtos.DuplicateGroupDto;
import com.sortmate.cleanup.dto.DuplicateDtos.DuplicateGroupListResponse;
import com.sortmate.cleanup.dto.DuplicateDtos.ResolveResponse;
import com.sortmate.cleanup.dto.RunDtos.ByTypeResult;
import com.sortmate.cleanup.dto.RunDtos.RunResponse;
import com.sortmate.cleanup.dto.ScreenshotDtos.ReasonCount;
import com.sortmate.cleanup.dto.ScreenshotDtos.ScreenshotCandidateDto;
import com.sortmate.cleanup.dto.ScreenshotDtos.ScreenshotListResponse;
import com.sortmate.cleanup.dto.SettingsDtos.SettingsResponse;
import com.sortmate.cleanup.dto.SettingsDtos.SettingsUpdateRequest;
import com.sortmate.cleanup.entity.CleanupGroup;
import com.sortmate.cleanup.entity.CleanupGroupStatus;
import com.sortmate.cleanup.entity.CleanupSettings;
import com.sortmate.cleanup.entity.CleanupStat;
import com.sortmate.cleanup.entity.DuplicateCandidate;
import com.sortmate.cleanup.entity.ScreenshotCandidate;
import com.sortmate.cleanup.entity.ScreenshotCandidateStatus;
import com.sortmate.cleanup.entity.ScreenshotReason;
import com.sortmate.cleanup.repository.CleanupGroupRepository;
import com.sortmate.cleanup.repository.CleanupSettingsRepository;
import com.sortmate.cleanup.repository.CleanupStatRepository;
import com.sortmate.cleanup.repository.ScreenshotCandidateRepository;
import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import com.sortmate.item.dto.ToggleResponses.DeleteResponse;
import com.sortmate.item.entity.Item;
import com.sortmate.item.repository.ItemRepository;
import com.sortmate.item.service.ItemService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * cleanup 도메인 서비스(CLEAN-01~10, CLEAN-06 제외=ITEM-09 직접 재사용).
 * 실제 삭제 물리로직은 ItemService.delete(ITEM-09)를 재사용하며, 본 서비스는
 * 그룹 상태 전이·집계·성과 누적을 래핑한다.
 * ponytail: 대시보드/리포트 집계는 소유자 전체 스캔(O(n)) — 개인/데모 스케일 충분.
 */
@Service
public class CleanupService {

    private static final int MAX_SIZE = 100;
    private static final int DEFAULT_SIZE = 20;
    /** [가정] 데모 저장공간 할당량(usedPercent 파생 기준). 실제 스토리지 미연동. */
    static final long STORAGE_QUOTA_BYTES = 5L * 1024 * 1024 * 1024;
    private static final Set<String> RUN_TYPES =
            Set.of("DUPLICATE", "EXPIRING_COUPON", "UNNECESSARY_SCREENSHOT");

    private final CleanupGroupRepository groupRepository;
    private final ScreenshotCandidateRepository screenshotRepository;
    private final CleanupSettingsRepository settingsRepository;
    private final CleanupStatRepository statRepository;
    private final ItemRepository itemRepository;
    private final ItemService itemService;

    public CleanupService(CleanupGroupRepository groupRepository,
                          ScreenshotCandidateRepository screenshotRepository,
                          CleanupSettingsRepository settingsRepository,
                          CleanupStatRepository statRepository,
                          ItemRepository itemRepository,
                          ItemService itemService) {
        this.groupRepository = groupRepository;
        this.screenshotRepository = screenshotRepository;
        this.settingsRepository = settingsRepository;
        this.statRepository = statRepository;
        this.itemRepository = itemRepository;
        this.itemService = itemService;
    }

    // ── CLEAN-01 대시보드 ──────────────────────────────────────
    @Transactional(readOnly = true)
    public CleanupDashboardResponse dashboard(Long ownerId) {
        List<Item> items = itemRepository.findByOwnerId(ownerId);
        long totalUsed = items.stream().filter(i -> i.getFileSize() != null)
                .mapToLong(Item::getFileSize).sum();

        List<CleanupGroup> pendingGroups = groupRepository.findByUserIdAndStatus(ownerId, CleanupGroupStatus.PENDING);
        long duplicateCount = pendingGroups.stream().mapToLong(g -> g.getCandidates().size()).sum();
        long dupReclaimable = pendingGroups.stream().mapToLong(CleanupGroup::getEstimatedSaveBytes).sum();

        long expiringCount = items.stream().filter(Item::isExpiringSoon).count();

        List<ScreenshotCandidate> screenshots = existingPendingScreenshots(ownerId);
        long screenshotCount = screenshots.size();
        long screenshotReclaimable = sumScreenshotBytes(ownerId, screenshots);

        List<Category> categories = new ArrayList<>();
        if (duplicateCount > 0) {
            categories.add(new Category("DUPLICATE", "중복 자료", "비슷한 사진이 묶여 있어요",
                    duplicateCount, "READY", "/cleanup/duplicates"));
        }
        if (expiringCount > 0) {
            categories.add(new Category("EXPIRING_COUPON", "만료 예정 쿠폰", "곧 만료되는 쿠폰이 있어요",
                    expiringCount, "READY", "/library?expiringSoon=true"));
        }
        if (screenshotCount > 0) {
            categories.add(new Category("UNNECESSARY_SCREENSHOT", "불필요한 스크린샷",
                    "일회성이거나 흐릿한 캡처를 찾았어요", screenshotCount, "READY", "/cleanup/screenshots"));
        }

        long reclaimableBytes = dupReclaimable + screenshotReclaimable;
        int usedPercent = totalUsed == 0 ? 0
                : (int) Math.min(100, Math.round(100.0 * totalUsed / STORAGE_QUOTA_BYTES));
        int unusedPercent = totalUsed == 0 ? 0
                : (int) Math.min(100, Math.round(100.0 * reclaimableBytes / totalUsed));
        Storage storage = new Storage(usedPercent, unusedPercent, reclaimableBytes);

        OptimizationInsight insight = buildInsight(items);

        return new CleanupDashboardResponse(storage, categories, insight);
    }

    private OptimizationInsight buildInsight(List<Item> items) {
        long uncategorized = items.stream()
                .filter(i -> i.getCategory() == null || i.getCategory().isBlank())
                .count();
        if (uncategorized == 0) {
            return null;
        }
        return new OptimizationInsight("최적화 제안",
                "분류되지 않은 항목 " + uncategorized + "개를 정리하면 검색과 로딩 속도를 개선할 수 있습니다.");
    }

    // ── CLEAN-02 중복 그룹 목록 ────────────────────────────────
    @Transactional(readOnly = true)
    public DuplicateGroupListResponse listDuplicates(int page, int size, Long ownerId) {
        validatePage(page);
        Pageable pageable = PageRequest.of(page, cappedSize(size), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<CleanupGroup> groups = groupRepository.findByUserIdAndStatus(
                ownerId, CleanupGroupStatus.PENDING, pageable);

        // 페이지 내 모든 후보의 Item 썸네일/마스킹 조회
        Set<Long> itemIds = groups.getContent().stream()
                .flatMap(g -> g.getCandidates().stream())
                .map(DuplicateCandidate::getItemId)
                .collect(Collectors.toSet());
        Map<Long, Item> itemMap = itemMap(ownerId, itemIds);

        List<DuplicateGroupDto> dtos = groups.getContent().stream()
                .map(g -> toGroupDto(g, itemMap))
                .toList();

        return new DuplicateGroupListResponse(dtos, groups.getNumber(), groups.getSize(),
                groups.getTotalElements(), groups.getTotalPages(), groups.hasNext());
    }

    private DuplicateGroupDto toGroupDto(CleanupGroup g, Map<Long, Item> itemMap) {
        List<DuplicateCandidateDto> candidates = g.getCandidates().stream()
                .map(c -> new DuplicateCandidateDto(
                        c.getItemId(),
                        thumbnail(itemMap.get(c.getItemId())),
                        c.getWidth(), c.getHeight(), c.getFileSize(),
                        c.getCapturedAt(), c.isRecommendedKeep()))
                .toList();
        return new DuplicateGroupDto(g.getId(), "DUPLICATE", g.getSummary(),
                g.getEstimatedSaveBytes(), candidates);
    }

    // ── CLEAN-03 정리 실행(유지 1 + 나머지 삭제) ────────────────
    @Transactional
    public ResolveResponse resolve(Long ownerId, Long groupId, Long keepItemId) {
        if (keepItemId == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "keepItemId는 필수입니다.");
        }
        CleanupGroup group = groupRepository.findByIdAndUserId(groupId, ownerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CLEANUP_GROUP_NOT_FOUND));
        if (!group.isPending()) {
            throw new BusinessException(ErrorCode.CLEANUP_GROUP_ALREADY_RESOLVED);
        }
        if (!group.containsItem(keepItemId)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "keepItemId가 그룹 후보에 속하지 않습니다.");
        }

        List<Long> deleteIds = group.getCandidates().stream()
                .map(DuplicateCandidate::getItemId)
                .filter(id -> !id.equals(keepItemId))
                .toList();

        Map<Long, Long> bytesByItem = group.getCandidates().stream()
                .collect(Collectors.toMap(DuplicateCandidate::getItemId, DuplicateCandidate::getFileSize, (a, b) -> a));

        DeleteResponse deleteResult = itemService.delete(ownerId, deleteIds);
        Set<Long> failed = new LinkedHashSet<>(deleteResult.failedIds());
        List<Long> deletedItemIds = deleteIds.stream().filter(id -> !failed.contains(id)).toList();
        long savedBytes = deletedItemIds.stream().mapToLong(id -> bytesByItem.getOrDefault(id, 0L)).sum();

        group.markResolved();
        addSavings(ownerId, savedBytes, deletedItemIds.size());

        return new ResolveResponse(group.getId(), group.getStatus().name(), keepItemId,
                deletedItemIds, savedBytes, new ArrayList<>(failed));
    }

    // ── CLEAN-04 그룹 해제("중복이 아니에요") ───────────────────
    @Transactional
    public DismissResponse dismiss(Long ownerId, Long groupId) {
        CleanupGroup group = groupRepository.findByIdAndUserId(groupId, ownerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CLEANUP_GROUP_NOT_FOUND));
        if (!group.isPending()) {
            throw new BusinessException(ErrorCode.CLEANUP_GROUP_ALREADY_RESOLVED);
        }
        group.markDismissed();
        return new DismissResponse(group.getId(), group.getStatus().name());
    }

    // ── CLEAN-05 불필요 스크린샷 후보 목록 ─────────────────────
    @Transactional(readOnly = true)
    public ScreenshotListResponse listScreenshots(Long ownerId, String reasonRaw, int page, int size) {
        validatePage(page);
        ScreenshotReason reasonFilter = parseReason(reasonRaw);

        List<ScreenshotCandidate> all = existingPendingScreenshots(ownerId);
        Map<Long, Item> itemMap = itemMap(ownerId,
                all.stream().map(ScreenshotCandidate::getItemId).collect(Collectors.toSet()));

        // reasonCounts: 필터 무관 전체 후보 기준([가정])
        List<ReasonCount> reasonCounts = reasonCounts(all);

        List<ScreenshotCandidate> filtered = reasonFilter == null ? all
                : all.stream().filter(c -> c.getReason() == reasonFilter).toList();

        int cappedSize = cappedSize(size);
        long total = filtered.size();
        int from = Math.min(page * cappedSize, filtered.size());
        int to = Math.min(from + cappedSize, filtered.size());
        List<ScreenshotCandidateDto> candidates = filtered.subList(from, to).stream()
                .map(c -> toScreenshotDto(c, itemMap.get(c.getItemId())))
                .toList();
        int totalPages = (int) Math.ceil((double) total / cappedSize);
        boolean hasNext = (page + 1) < totalPages;

        return new ScreenshotListResponse(candidates, reasonCounts, page, cappedSize, total, totalPages, hasNext);
    }

    private ScreenshotCandidateDto toScreenshotDto(ScreenshotCandidate c, Item item) {
        String title = item != null ? item.getTitle() : "스크린샷";
        return new ScreenshotCandidateDto(c.getId(), c.getItemId(), thumbnail(item), title,
                c.getReason().name(), c.getReason().getLabel(), c.getRecommendationText(),
                c.getCapturedAt(), c.isDefaultSelected());
    }

    private List<ReasonCount> reasonCounts(List<ScreenshotCandidate> candidates) {
        List<ReasonCount> out = new ArrayList<>();
        for (ScreenshotReason r : ScreenshotReason.values()) {
            long count = candidates.stream().filter(c -> c.getReason() == r).count();
            if (count > 0) {
                out.add(new ReasonCount(r.name(), r.getLabel(), count));
            }
        }
        return out;
    }

    // ── CLEAN-07 한꺼번에 정리하기 ─────────────────────────────
    @Transactional
    public RunResponse run(Long ownerId, List<String> typesRaw) {
        Set<String> types = parseRunTypes(typesRaw);

        List<ByTypeResult> byType = new ArrayList<>();
        List<Long> resolvedGroupIds = new ArrayList<>();
        Set<Long> failed = new LinkedHashSet<>();
        int totalDeleted = 0;
        long totalSaved = 0L;

        if (types.contains("DUPLICATE")) {
            int deleted = 0;
            long saved = 0L;
            for (CleanupGroup group : groupRepository.findByUserIdAndStatus(ownerId, CleanupGroupStatus.PENDING)) {
                Long keepId = pickKeep(group);
                Map<Long, Long> bytesByItem = group.getCandidates().stream()
                        .collect(Collectors.toMap(DuplicateCandidate::getItemId, DuplicateCandidate::getFileSize, (a, b) -> a));
                List<Long> deleteIds = group.getCandidates().stream()
                        .map(DuplicateCandidate::getItemId)
                        .filter(id -> !id.equals(keepId))
                        .toList();
                DeleteResponse res = itemService.delete(ownerId, deleteIds);
                Set<Long> groupFailed = new LinkedHashSet<>(res.failedIds());
                failed.addAll(groupFailed);
                List<Long> ok = deleteIds.stream().filter(id -> !groupFailed.contains(id)).toList();
                deleted += ok.size();
                saved += ok.stream().mapToLong(id -> bytesByItem.getOrDefault(id, 0L)).sum();
                group.markResolved();
                resolvedGroupIds.add(group.getId());
            }
            totalDeleted += deleted;
            totalSaved += saved;
            byType.add(new ByTypeResult("DUPLICATE", deleted, saved));
        }

        if (types.contains("UNNECESSARY_SCREENSHOT")) {
            List<ScreenshotCandidate> selected = existingPendingScreenshots(ownerId).stream()
                    .filter(ScreenshotCandidate::isDefaultSelected)
                    .toList();
            Map<Long, Item> itemMap = itemMap(ownerId,
                    selected.stream().map(ScreenshotCandidate::getItemId).collect(Collectors.toSet()));
            List<Long> deleteIds = selected.stream().map(ScreenshotCandidate::getItemId).toList();
            DeleteResponse res = itemService.delete(ownerId, deleteIds);
            Set<Long> ssFailed = new LinkedHashSet<>(res.failedIds());
            failed.addAll(ssFailed);
            int deleted = 0;
            long saved = 0L;
            for (ScreenshotCandidate c : selected) {
                if (ssFailed.contains(c.getItemId())) {
                    continue;
                }
                c.markTrashed();
                deleted++;
                Item item = itemMap.get(c.getItemId());
                if (item != null && item.getFileSize() != null) {
                    saved += item.getFileSize();
                }
            }
            totalDeleted += deleted;
            totalSaved += saved;
            byType.add(new ByTypeResult("UNNECESSARY_SCREENSHOT", deleted, saved));
        }

        addSavings(ownerId, totalSaved, byType.stream()
                .filter(b -> b.type().equals("DUPLICATE")).mapToLong(ByTypeResult::deletedCount).sum());

        return new RunResponse(totalDeleted, totalSaved, resolvedGroupIds, byType, new ArrayList<>(failed));
    }

    /** 추천 유지본 우선, 없으면 첫 후보. */
    private Long pickKeep(CleanupGroup group) {
        return group.getCandidates().stream()
                .filter(DuplicateCandidate::isRecommendedKeep)
                .map(DuplicateCandidate::getItemId)
                .findFirst()
                .orElseGet(() -> group.getCandidates().get(0).getItemId());
    }

    // ── CLEAN-08 리포트 ────────────────────────────────────────
    @Transactional(readOnly = true)
    public CleanupReportResponse report(Long ownerId) {
        CleanupStat stat = statRepository.findByUserId(ownerId).orElseGet(() -> CleanupStat.empty(ownerId));
        List<Item> items = itemRepository.findByOwnerId(ownerId);

        Weekly weekly = new Weekly(stat.getWeeklySavedBytes(), "이번 주도 잘 정리하고 있어요!");
        Cumulative cumulative = new Cumulative(stat.getCumulativeSavedBytes(),
                stat.getSavedBytesChangePercent(), stat.getDuplicatesRemoved());
        Hygiene hygiene = buildHygiene(items, stat);
        List<Suggestion> suggestions = buildReportSuggestions(items);

        return new CleanupReportResponse(weekly, cumulative, hygiene, suggestions);
    }

    private Hygiene buildHygiene(List<Item> items, CleanupStat stat) {
        int total = items.size();
        int tagAccuracy = total == 0 ? 0
                : (int) Math.round(100.0 * items.stream().filter(Item::isAiClassified).count() / total);
        int vaultOrganization = total == 0 ? 0
                : (int) Math.round(100.0 * items.stream()
                .filter(i -> i.getCategory() != null && !i.getCategory().isBlank()).count() / total);
        int cleanupFrequency = (int) Math.min(100, 60 + Math.min(40, stat.getDuplicatesRemoved()));
        int score = (int) Math.round((tagAccuracy + vaultOrganization + cleanupFrequency) / 3.0);
        List<Breakdown> breakdown = List.of(
                new Breakdown("tagAccuracy", "태그 정확도", tagAccuracy),
                new Breakdown("vaultOrganization", "보관함 정리", vaultOrganization),
                new Breakdown("cleanupFrequency", "정리 빈도", cleanupFrequency));
        return new Hygiene(score, grade(score), breakdown);
    }

    private String grade(int score) {
        if (score >= 85) return "훌륭함";
        if (score >= 70) return "좋음";
        if (score >= 50) return "보통";
        return "개선 필요";
    }

    private List<Suggestion> buildReportSuggestions(List<Item> items) {
        List<Suggestion> out = new ArrayList<>();
        Instant sixMonthsAgo = Instant.now().minus(180, ChronoUnit.DAYS);
        long oldScreenshots = items.stream()
                .filter(i -> i.getType() == com.sortmate.item.entity.ItemType.SCREENSHOT)
                .filter(i -> i.getSavedAt().isBefore(sixMonthsAgo))
                .count();
        if (oldScreenshots > 0) {
            out.add(new Suggestion("OLD_SCREENSHOTS", "오래된 스크린샷",
                    "6개월 동안 열어보지 않은 항목 " + oldScreenshots + "개", oldScreenshots, "/cleanup/screenshots"));
        }
        long largeMedia = items.stream()
                .filter(i -> i.getFileSize() != null && i.getFileSize() > 2L * 1024 * 1024)
                .count();
        if (largeMedia > 0) {
            out.add(new Suggestion("LARGE_MEDIA", "대용량 미디어",
                    "용량이 큰 미디어 " + largeMedia + "개", largeMedia, "/library?sort=fileSize,desc"));
        }
        return out;
    }

    // ── CLEAN-09 설정 조회 ─────────────────────────────────────
    @Transactional(readOnly = true)
    public SettingsResponse getSettings(Long ownerId) {
        CleanupSettings settings = settingsRepository.findByUserId(ownerId)
                .orElseGet(() -> CleanupSettings.defaults(ownerId));
        return SettingsResponse.of(settings, monthlySaved(ownerId));
    }

    // ── CLEAN-10 설정 저장 ─────────────────────────────────────
    @Transactional
    public SettingsResponse updateSettings(Long ownerId, SettingsUpdateRequest req) {
        if (req.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "수정할 설정이 최소 1개 필요합니다.");
        }
        CleanupSettings settings = settingsRepository.findByUserId(ownerId)
                .orElseGet(() -> settingsRepository.save(CleanupSettings.defaults(ownerId)));
        if (req.autoTrashExpired() != null) {
            settings.setAutoTrashExpired(req.autoTrashExpired());
        }
        if (req.smartScreenshotDetection() != null) {
            settings.setSmartScreenshotDetection(req.smartScreenshotDetection());
        }
        if (req.unusedThresholdDays() != null) {
            settings.setUnusedThresholdDays(req.unusedThresholdDays());
        }
        settingsRepository.save(settings);
        return SettingsResponse.of(settings, monthlySaved(ownerId));
    }

    // ── 내부 헬퍼 ──────────────────────────────────────────────

    private long monthlySaved(Long ownerId) {
        return statRepository.findByUserId(ownerId).map(CleanupStat::getMonthlySavedBytes).orElse(0L);
    }

    private void addSavings(Long ownerId, long bytes, long removedDuplicates) {
        if (bytes <= 0 && removedDuplicates <= 0) {
            return;
        }
        CleanupStat stat = statRepository.findByUserId(ownerId)
                .orElseGet(() -> statRepository.save(CleanupStat.empty(ownerId)));
        stat.addSavings(bytes, removedDuplicates);
    }

    /** 삭제된 Item을 참조하는 후보는 자동 제외(존재하는 Item만 남긴다). */
    private List<ScreenshotCandidate> existingPendingScreenshots(Long ownerId) {
        List<ScreenshotCandidate> pending = screenshotRepository.findByUserIdAndStatus(
                ownerId, ScreenshotCandidateStatus.PENDING);
        if (pending.isEmpty()) {
            return pending;
        }
        Set<Long> existing = itemMap(ownerId,
                pending.stream().map(ScreenshotCandidate::getItemId).collect(Collectors.toSet())).keySet();
        return pending.stream().filter(c -> existing.contains(c.getItemId())).toList();
    }

    private long sumScreenshotBytes(Long ownerId, List<ScreenshotCandidate> candidates) {
        Map<Long, Item> map = itemMap(ownerId,
                candidates.stream().map(ScreenshotCandidate::getItemId).collect(Collectors.toSet()));
        return candidates.stream()
                .map(c -> map.get(c.getItemId()))
                .filter(i -> i != null && i.getFileSize() != null)
                .mapToLong(Item::getFileSize).sum();
    }

    private Map<Long, Item> itemMap(Long ownerId, Set<Long> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return itemRepository.findByOwnerIdAndIdIn(ownerId, ids).stream()
                .collect(Collectors.toMap(Item::getId, Function.identity()));
    }

    /** vaulted면 썸네일 마스킹(item 계약 공유). Item 없으면 null. */
    private String thumbnail(Item item) {
        if (item == null || item.isVaulted()) {
            return null;
        }
        return item.getThumbnailUrl();
    }

    private void validatePage(int page) {
        if (page < 0) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "page는 0 이상이어야 합니다.");
        }
    }

    private int cappedSize(int size) {
        if (size <= 0) {
            return DEFAULT_SIZE;
        }
        return Math.min(size, MAX_SIZE);
    }

    private ScreenshotReason parseReason(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return ScreenshotReason.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "reason은 ONE_TIME|BLURRY|INFO만 허용됩니다.");
        }
    }

    private Set<String> parseRunTypes(List<String> raw) {
        if (raw == null || raw.isEmpty()) {
            return RUN_TYPES; // 생략 시 전체
        }
        Set<String> out = new LinkedHashSet<>();
        for (String t : raw) {
            String norm = t == null ? "" : t.trim().toUpperCase(Locale.ROOT);
            if (!RUN_TYPES.contains(norm)) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                        "types는 DUPLICATE|EXPIRING_COUPON|UNNECESSARY_SCREENSHOT만 허용됩니다.");
            }
            out.add(norm);
        }
        return out;
    }
}
