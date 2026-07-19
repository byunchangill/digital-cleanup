package com.sortmate.item.dto;

import com.sortmate.item.entity.Item;

import java.time.LocalDate;
import java.util.List;

/** ITEM-05 관련 아이템 응답. */
public record RelatedItemsResponse(List<RelatedItem> items) {

    public record RelatedItem(Long id, String title, String thumbnailUrl, LocalDate expiryDate) {
        public static RelatedItem of(Item item) {
            return new RelatedItem(item.getId(), item.getTitle(),
                    item.isVaulted() ? null : item.getThumbnailUrl(), item.getExpiryDate());
        }
    }
}
