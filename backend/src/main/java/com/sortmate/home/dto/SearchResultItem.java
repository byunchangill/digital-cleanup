package com.sortmate.home.dto;

import com.sortmate.item.dto.ItemDto;
import com.sortmate.item.entity.Item;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * 검색 결과 카드 = Item 표준 표현(vaulted 마스킹 포함) + matchScore.
 * ItemDto.of의 마스킹 로직을 재사용하고 필드를 평탄화하여 계약의
 * "...Item 표준 표현 + matchScore" 단일 오브젝트로 직렬화한다.
 * (@JsonUnwrapped는 record 컴포넌트에 미지원이라 명시적으로 펼친다.)
 */
public record SearchResultItem(
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
        int matchScore
) {
    public static SearchResultItem of(Item item, int matchScore) {
        ItemDto d = ItemDto.of(item);
        return new SearchResultItem(
                d.id(), d.type(), d.title(), d.category(), d.thumbnailUrl(), d.sourceApp(),
                d.fileSize(), d.mimeType(), d.tags(), d.aiClassified(), d.expiryDate(),
                d.expiringSoon(), d.favorite(), d.vaulted(), d.savedAt(), matchScore);
    }
}
