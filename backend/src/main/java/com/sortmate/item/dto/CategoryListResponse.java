package com.sortmate.item.dto;

import java.util.List;

/** ITEM-14 카테고리 목록 응답. */
public record CategoryListResponse(List<CategoryCount> categories) {

    public record CategoryCount(String name, long itemCount) {
    }
}
