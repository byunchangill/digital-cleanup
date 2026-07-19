package com.sortmate.item.dto;

import java.time.Instant;
import java.util.List;

/** 소규모 응답 DTO 모음(토글/일괄/공유). */
public final class ToggleResponses {

    private ToggleResponses() {
    }

    /** ITEM-08 즐겨찾기 토글 응답. */
    public record FavoriteResponse(Long id, boolean favorite) {
    }

    /** ITEM-12 vault 토글 응답. */
    public record VaultResponse(Long id, boolean vaulted) {
    }

    /** ITEM-09 삭제 응답. */
    public record DeleteResponse(int deletedCount, List<Long> failedIds) {
    }

    /** ITEM-10/11 일괄 수정 응답. */
    public record BulkUpdateResponse(int updatedCount, List<Long> failedIds) {
    }

    /** ITEM-13 공유 응답. */
    public record ShareResponse(String shareUrl, Instant expiresAt) {
    }

    /** ITEM-15 AI 재분석 접수 응답(stub). */
    public record ReanalyzeResponse(Long id, String status, String message) {
    }
}
