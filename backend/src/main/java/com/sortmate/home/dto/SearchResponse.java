package com.sortmate.home.dto;

import java.util.List;

/** HOME-02 자연어 검색 응답. 빈 결과도 200 + results:[]로 반환한다. */
public record SearchResponse(
        String query,
        List<SearchInterpretation> interpretations,
        List<SearchResultItem> results,
        List<RefinedFilter> refinedFilters,
        String assistantHint,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext
) {
}
