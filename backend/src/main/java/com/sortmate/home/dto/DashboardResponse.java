package com.sortmate.home.dto;

import com.sortmate.item.dto.CategoryListResponse.CategoryCount;
import com.sortmate.item.dto.ItemDto;

import java.util.List;

/**
 * HOME-01 대시보드 집계 응답.
 * recentItems는 ITEM-03(sort=savedAt,desc) 형태, categories는 ITEM-14 형태를 그대로 재사용한다.
 */
public record DashboardResponse(
        List<CleanupSuggestion> suggestions,
        List<ItemDto> recentItems,
        List<CategoryCount> categories
) {
}
