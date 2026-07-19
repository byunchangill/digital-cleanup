package com.sortmate.item.dto;

import com.sortmate.item.entity.Item;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * 아이템 상세(ITEM-04). 표준 표현 + body/fileUrl/aiSummary.
 * vaulted=true면 thumbnailUrl·fileUrl·aiSummary를 null로 마스킹한다.
 */
public record ItemDetailDto(
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
        Instant savedAt,
        String body,
        String fileUrl,
        String aiSummary
) {
    public static ItemDetailDto of(Item item) {
        boolean masked = item.isVaulted();
        return new ItemDetailDto(
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
                item.getSavedAt(),
                item.getBody(),
                masked ? null : item.getFileUrl(),
                masked ? null : item.getAiSummary()
        );
    }
}
