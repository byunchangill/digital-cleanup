package com.sortmate.home.dto;

import java.util.Map;

/**
 * HOME-02 상세 필터 추천. params는 프론트가 다음 HOME-02 호출 쿼리에 병합해 재질의하는
 * 자유 형식 힌트(서버-프론트 합의 key). 현재 서버가 해석하는 key: favorite, category.
 */
public record RefinedFilter(
        String id,
        String title,
        String description,
        Map<String, Object> params
) {
}
