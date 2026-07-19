package com.sortmate.vault.dto;

import com.sortmate.item.entity.Item;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** vault 모듈 요청/응답 DTO 모음(계약 vault.md). */
public final class VaultDtos {

    private VaultDtos() {
    }

    /** 6자리 숫자 PIN 정규식(vault.md ^\d{6}$). */
    public static final String PIN_REGEX = "^\\d{6}$";

    // ── VAULT-01 PIN 설정/변경 ─────────────────────────────────
    public record PinSetRequest(
            @NotBlank(message = "newPin은 필수입니다.")
            @Pattern(regexp = PIN_REGEX, message = "PIN은 정확히 6자리 숫자여야 합니다.")
            String newPin,
            @Pattern(regexp = PIN_REGEX, message = "currentPin은 6자리 숫자여야 합니다.")
            String currentPin,
            Boolean biometricEnabled) {
    }

    public record PinSetResponse(boolean pinSet, boolean biometricEnabled, Instant pinSetAt) {
    }

    // ── VAULT-02 상태 조회 ─────────────────────────────────────
    public record VaultStatusResponse(
            boolean pinSet,
            boolean appLockEnabled,
            boolean biometricEnabled,
            boolean unlocked,
            boolean lockedOut,
            Long retryAfter) {
    }

    // ── VAULT-03 잠금 해제 ─────────────────────────────────────
    public record UnlockRequest(
            @NotBlank(message = "pin은 필수입니다.")
            @Pattern(regexp = PIN_REGEX, message = "PIN은 정확히 6자리 숫자여야 합니다.")
            String pin) {
    }

    public record UnlockResponse(String vaultToken, String tokenType, long expiresIn) {
    }

    // ── VAULT-04 마스킹 해제 열람 ──────────────────────────────
    public record VaultItemWrapper(VaultItem item) {
    }

    public record VaultItem(
            Long id,
            String type,
            String title,
            String subtitle,
            String category,
            boolean vaulted,
            String thumbnailUrl,
            String fileUrl,
            String aiSummary,
            List<String> tags,
            String sourceApp,
            String mimeType,
            Long fileSize,
            String resolution,
            boolean verified,
            LocalDate expiryDate,
            Instant savedAt) {

        /** vaulted 아이템을 마스킹 없이 전체 노출로 변환. */
        public static VaultItem of(Item item) {
            // subtitle/resolution/verified는 화면 근거가 약한 [가정] 필드 → 미보유. 각각 null/null/false.
            return new VaultItem(
                    item.getId(),
                    item.getType().name(),
                    item.getTitle(),
                    null,
                    item.getCategory(),
                    item.isVaulted(),
                    item.getThumbnailUrl(),
                    item.getFileUrl(),
                    item.getAiSummary(),
                    List.copyOf(item.getTags()),
                    item.getSourceApp(),
                    item.getMimeType(),
                    item.getFileSize(),
                    null,
                    false,
                    item.getExpiryDate(),
                    item.getSavedAt());
        }
    }

    // ── VAULT-05/06 프라이버시 설정 ────────────────────────────
    public record PrivacyResponse(
            boolean aiTrainingConsent,
            boolean usageStatsSharing,
            boolean personalizedSuggestions) {
    }

    /** 모든 필드 선택. 최소 1개는 서비스에서 검증. */
    public record PrivacyUpdateRequest(
            Boolean aiTrainingConsent,
            Boolean usageStatsSharing,
            Boolean personalizedSuggestions) {

        public boolean isEmpty() {
            return aiTrainingConsent == null && usageStatsSharing == null && personalizedSuggestions == null;
        }
    }

    // ── VAULT-07 계정 삭제 요청 ────────────────────────────────
    public record DeletionRequestBody(
            @AssertTrue(message = "confirm은 true여야 합니다.") boolean confirm) {
    }

    public record DeletionResponse(String status, Instant requestedAt,
                                   long gracePeriodDays, Instant scheduledPurgeAt) {
    }
}
