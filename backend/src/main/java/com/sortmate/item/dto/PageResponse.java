package com.sortmate.item.dto;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/** 목록 공통 페이지네이션 봉투(계약 페이지네이션 표준). */
public record PageResponse<T>(
        List<T> items,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext
) {
    public static <E, T> PageResponse<T> of(Page<E> page, Function<E, T> mapper) {
        return new PageResponse<>(
                page.getContent().stream().map(mapper).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.hasNext()
        );
    }
}
