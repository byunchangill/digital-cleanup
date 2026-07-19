package com.sortmate.cleanup.dto;

import java.time.Instant;
import java.util.List;

/** CLEAN-05 불필요 스크린샷 후보 목록 DTO 모음. */
public final class ScreenshotDtos {

    private ScreenshotDtos() {
    }

    public record ScreenshotListResponse(
            List<ScreenshotCandidateDto> candidates,
            List<ReasonCount> reasonCounts,
            int page,
            int size,
            long totalElements,
            int totalPages,
            boolean hasNext
    ) {
    }

    public record ScreenshotCandidateDto(
            Long id,
            Long itemId,
            String thumbnailUrl,
            String title,
            String reason,
            String reasonLabel,
            String recommendationText,
            Instant capturedAt,
            boolean defaultSelected
    ) {
    }

    public record ReasonCount(String reason, String label, long count) {
    }
}
