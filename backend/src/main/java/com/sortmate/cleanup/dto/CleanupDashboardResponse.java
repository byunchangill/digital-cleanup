package com.sortmate.cleanup.dto;

import java.util.List;

/** CLEAN-01 정리 대시보드. 저장공간 요약 + 카테고리 카드 + 최적화 제안. */
public record CleanupDashboardResponse(
        Storage storage,
        List<Category> categories,
        OptimizationInsight optimizationInsight
) {
    public record Storage(int usedPercent, int unusedPercent, long reclaimableBytes) {
    }

    public record Category(
            String type,
            String title,
            String description,
            long count,
            String scanStatus,
            String actionRoute
    ) {
    }

    public record OptimizationInsight(String title, String message) {
    }
}
