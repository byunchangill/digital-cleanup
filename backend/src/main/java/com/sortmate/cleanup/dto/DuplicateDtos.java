package com.sortmate.cleanup.dto;

import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;

/** CLEAN-02/03/04 중복 그룹 관련 요청/응답 DTO 모음. */
public final class DuplicateDtos {

    private DuplicateDtos() {
    }

    /** CLEAN-02 목록 응답(계약: groups + 페이지네이션 플랫). */
    public record DuplicateGroupListResponse(
            List<DuplicateGroupDto> groups,
            int page,
            int size,
            long totalElements,
            int totalPages,
            boolean hasNext
    ) {
    }

    public record DuplicateGroupDto(
            Long groupId,
            String type,
            String summary,
            long estimatedSaveBytes,
            List<DuplicateCandidateDto> candidates
    ) {
    }

    public record DuplicateCandidateDto(
            Long itemId,
            String thumbnailUrl,
            int width,
            int height,
            long fileSize,
            Instant capturedAt,
            boolean recommendedKeep
    ) {
    }

    /** CLEAN-03 정리 실행 요청. */
    public record ResolveRequest(
            @NotNull(message = "keepItemId는 필수입니다.") Long keepItemId) {
    }

    /** CLEAN-03 정리 실행 응답. */
    public record ResolveResponse(
            Long groupId,
            String status,
            Long keptItemId,
            List<Long> deletedItemIds,
            long savedBytes,
            List<Long> failedIds
    ) {
    }

    /** CLEAN-04 그룹 해제 응답. */
    public record DismissResponse(Long groupId, String status) {
    }
}
