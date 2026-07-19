package com.sortmate.item.dto;

import com.sortmate.item.entity.Item;

import java.time.Instant;
import java.util.List;

/** ITEM-01 갤러리 가져오기 응답. */
public record ImportResponse(int importedCount, List<ImportedItem> items) {

    public record ImportedItem(Long id, String type, String title, String thumbnailUrl, Instant savedAt) {
        public static ImportedItem of(Item item) {
            return new ImportedItem(item.getId(), item.getType().name(),
                    item.getTitle(), item.getThumbnailUrl(), item.getSavedAt());
        }
    }
}
