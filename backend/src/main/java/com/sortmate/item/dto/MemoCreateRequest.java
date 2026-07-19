package com.sortmate.item.dto;

import jakarta.validation.constraints.Size;

import java.util.List;

/** ITEM-02 메모 생성 요청. 모든 필드 선택. */
public record MemoCreateRequest(
        @Size(max = 200, message = "title은 최대 200자입니다.")
        String title,
        String body,
        List<@Size(max = 30, message = "각 태그는 최대 30자입니다.") String> tags,
        String category,
        Boolean vaulted,
        List<Long> attachmentIds
) {
}
