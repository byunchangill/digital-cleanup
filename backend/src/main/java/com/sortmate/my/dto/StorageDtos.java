package com.sortmate.my.dto;

import java.time.Instant;
import java.util.List;

/** MY-07 저장공간 상세 DTO(계약 my.md). */
public final class StorageDtos {

    private StorageDtos() {
    }

    public record CategoryUsage(String type, String label, long bytes, int itemCount, int percent) {
    }

    public record LargestItem(Long itemId, String title, String type, String thumbnailUrl,
                              long bytes, Instant modifiedAt) {
    }

    public record Insight(String type, String label) {
    }

    public record StorageDetailResponse(
            long usedBytes,
            long totalBytes,
            int usedPercent,
            String planName,
            boolean limitReached,
            long reclaimableBytes,
            List<CategoryUsage> categories,
            List<LargestItem> largestItems,
            List<Insight> insights) {
    }
}
