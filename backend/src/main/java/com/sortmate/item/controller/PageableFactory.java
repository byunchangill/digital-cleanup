package com.sortmate.item.controller;

import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.Set;

/** 계약 페이지네이션 표준(page 0-base, size 최대 100, sort=field,dir) → Pageable. */
final class PageableFactory {

    private static final int MAX_SIZE = 100;
    private static final Set<String> SORTABLE = Set.of("savedAt", "title", "expiryDate", "createdAt");

    private PageableFactory() {
    }

    static Pageable of(int page, int size, String sort) {
        if (page < 0) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "page는 0 이상이어야 합니다.");
        }
        int cappedSize = Math.min(Math.max(size, 1), MAX_SIZE);
        return PageRequest.of(page, cappedSize, parseSort(sort));
    }

    private static Sort parseSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "savedAt");
        }
        String[] parts = sort.split(",");
        String field = parts[0].trim();
        if (!SORTABLE.contains(field)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "지원하지 않는 sort 필드입니다: " + field);
        }
        Sort.Direction dir = (parts.length > 1 && "asc".equalsIgnoreCase(parts[1].trim()))
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(dir, field);
    }
}
