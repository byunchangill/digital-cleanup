package com.sortmate.my.service;

import com.sortmate.cleanup.service.CleanupService;
import com.sortmate.item.entity.Item;
import com.sortmate.item.entity.ItemType;
import com.sortmate.item.repository.ItemRepository;
import com.sortmate.my.dto.StorageDtos.CategoryUsage;
import com.sortmate.my.dto.StorageDtos.Insight;
import com.sortmate.my.dto.StorageDtos.LargestItem;
import com.sortmate.my.dto.StorageDtos.StorageDetailResponse;
import com.sortmate.my.entity.Plan;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * MY-07 저장공간 상세. 유형별 분해 + 대용량 자산 + 인사이트 + 플랜 한도.
 * ponytail: 소유자 전체 스캔 O(n) 집계(개인/데모 스케일). reclaimableBytes·totalBytes는
 * 각각 CleanupService(CLEAN-01)·PlanService에서 재사용해 의미 중복 정의를 피한다.
 */
@Service
public class StorageService {

    private static final int LARGEST_LIMIT = 5;
    private static final long LARGE_ASSET_INSIGHT_THRESHOLD = 100L * 1024 * 1024; // 100MB

    private final ItemRepository itemRepository;
    private final PlanService planService;
    private final CleanupService cleanupService;

    public StorageService(ItemRepository itemRepository, PlanService planService,
                          CleanupService cleanupService) {
        this.itemRepository = itemRepository;
        this.planService = planService;
        this.cleanupService = cleanupService;
    }

    @Transactional(readOnly = true)
    public StorageDetailResponse storage(Long userId) {
        List<Item> items = itemRepository.findByOwnerId(userId);
        long usedBytes = items.stream().filter(i -> i.getFileSize() != null)
                .mapToLong(Item::getFileSize).sum();

        Plan plan = planService.currentPlan(userId);
        long totalBytes = plan.getStorageBytes();
        int usedPercent = totalBytes == 0 ? 0
                : (int) Math.min(100, Math.round(100.0 * usedBytes / totalBytes));
        boolean limitReached = usedBytes >= totalBytes;

        long reclaimableBytes = cleanupService.dashboard(userId).storage().reclaimableBytes();

        return new StorageDetailResponse(usedBytes, totalBytes, usedPercent, plan.getDisplayName(),
                limitReached, reclaimableBytes,
                categories(items, usedBytes), largestItems(items), insights(items, usedPercent));
    }

    // ── 유형별 분해 ────────────────────────────────────────────
    private List<CategoryUsage> categories(List<Item> items, long usedBytes) {
        // type코드 → [label, bytes, count] 누적(삽입 순서 보존 후 bytes 내림차순 정렬)
        Map<String, long[]> bytesCount = new LinkedHashMap<>();
        Map<String, String> labels = new LinkedHashMap<>();
        for (Item item : items) {
            String[] tl = storageType(item);
            String code = tl[0];
            labels.putIfAbsent(code, tl[1]);
            long[] agg = bytesCount.computeIfAbsent(code, k -> new long[2]);
            agg[0] += item.getFileSize() == null ? 0 : item.getFileSize();
            agg[1] += 1;
        }
        List<CategoryUsage> out = new ArrayList<>();
        for (Map.Entry<String, long[]> e : bytesCount.entrySet()) {
            long bytes = e.getValue()[0];
            int count = (int) e.getValue()[1];
            int percent = usedBytes == 0 ? 0 : (int) Math.round(100.0 * bytes / usedBytes);
            out.add(new CategoryUsage(e.getKey(), labels.get(e.getKey()), bytes, count, percent));
        }
        out.sort(Comparator.comparingLong(CategoryUsage::bytes).reversed());
        return out;
    }

    /** Item → 저장공간 분류(type, label). video mime는 VIDEO로 우선 분류. */
    private String[] storageType(Item item) {
        String mime = item.getMimeType();
        if (mime != null && mime.startsWith("video")) {
            return new String[]{"VIDEO", "동영상"};
        }
        ItemType type = item.getType();
        return switch (type) {
            case SCREENSHOT -> new String[]{"SCREENSHOT", "스크린샷"};
            case DOCUMENT -> new String[]{"DOCUMENT", "문서"};
            case LINK -> new String[]{"LINK", "링크"};
            case IMAGE -> new String[]{"IMAGE", "이미지"};
            case MEMO -> new String[]{"MEMO", "메모"};
        };
    }

    // ── 대용량 자산 상위 N ─────────────────────────────────────
    private List<LargestItem> largestItems(List<Item> items) {
        return items.stream()
                .filter(i -> i.getFileSize() != null && i.getFileSize() > 0)
                .sorted(Comparator.comparingLong(Item::getFileSize).reversed())
                .limit(LARGEST_LIMIT)
                .map(i -> new LargestItem(i.getId(), i.getTitle(), i.getType().name(),
                        i.isVaulted() ? null : i.getThumbnailUrl(), // vaulted 썸네일 마스킹(item 계약 공유)
                        i.getFileSize(), i.getUpdatedAt()))
                .toList();
    }

    // ── 인사이트 ───────────────────────────────────────────────
    private List<Insight> insights(List<Item> items, int usedPercent) {
        List<Insight> out = new ArrayList<>();
        if (usedPercent >= 80) {
            out.add(new Insight("GROWTH", "저장공간이 빠르게 차고 있어요"));
        }
        boolean hasLargeAsset = items.stream()
                .anyMatch(i -> i.getFileSize() != null && i.getFileSize() >= LARGE_ASSET_INSIGHT_THRESHOLD);
        if (hasLargeAsset) {
            out.add(new Insight("LARGE_ASSETS", "대용량 자산이 공간을 많이 차지해요"));
        }
        if (items.stream().anyMatch(Item::isVaulted)) {
            out.add(new Insight("VAULT_SYNCED", "시크릿 볼트가 안전하게 동기화되어 있어요"));
        }
        out.add(new Insight("ENCRYPTED", "모든 데이터는 종단간 암호화됩니다"));
        return out;
    }
}
