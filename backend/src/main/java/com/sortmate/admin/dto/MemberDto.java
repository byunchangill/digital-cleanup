package com.sortmate.admin.dto;

import com.sortmate.auth.entity.User;

import java.time.Instant;

/** ADM-02/03 회원 목록 행. storageUsedBytes는 Item.fileSize 합으로 파생 주입. */
public record MemberDto(
        Long id,
        String displayName,
        String email,
        Instant joinedAt,
        long storageUsedBytes,
        long storageQuotaBytes,
        double storagePercent,
        String plan,
        String status
) {
    /** [가정] 할당량 상수 50GB(화면 "/ 50 GB" 고정). */
    public static final long STORAGE_QUOTA_BYTES = 53_687_091_200L;

    public static MemberDto of(User user, long storageUsedBytes) {
        double percent = STORAGE_QUOTA_BYTES == 0 ? 0
                : Math.round((double) storageUsedBytes / STORAGE_QUOTA_BYTES * 1000.0) / 10.0;
        return new MemberDto(
                user.getId(),
                user.getDisplayName(),
                user.getEmail(),
                user.getCreatedAt(),
                storageUsedBytes,
                STORAGE_QUOTA_BYTES,
                percent,
                user.getPlan().name(),
                user.getStatus().name()
        );
    }
}
