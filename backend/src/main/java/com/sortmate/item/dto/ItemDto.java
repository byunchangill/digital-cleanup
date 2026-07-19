package com.sortmate.item.dto;

import com.sortmate.item.entity.Item;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * 계약 "Item 표준 표현"(목록/상세 공통).
 * vaulted=true면 thumbnailUrl을 null로 마스킹하고 잠금 표시용 메타만 반환한다.
 */
public record ItemDto(
        Long id,
        String type,
        String title,
        String category,
        String thumbnailUrl,
        String sourceApp,
        Long fileSize,
        String mimeType,
        List<String> tags,
        boolean aiClassified,
        LocalDate expiryDate,
        boolean expiringSoon,
        boolean favorite,
        boolean vaulted,
        Instant savedAt
) {
    public static ItemDto of(Item item) {
        boolean masked = item.isVaulted();
        return new ItemDto(
                item.getId(),
                item.getType().name(),
                item.getTitle(),
                item.getCategory(),
                masked ? null : item.getThumbnailUrl(),
                item.getSourceApp(),
                item.getFileSize(),
                item.getMimeType(),
                List.copyOf(item.getTags()),
                item.isAiClassified(),
                item.getExpiryDate(),
                item.isExpiringSoon(),
                item.isFavorite(),
                item.isVaulted(),
                item.getSavedAt()
        );
    }
}
