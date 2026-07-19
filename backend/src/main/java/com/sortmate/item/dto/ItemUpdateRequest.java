package com.sortmate.item.dto;

import jakarta.validation.constraints.Size;

import java.util.List;

/** ITEM-06 부분 수정 요청. 전달된 필드만 변경. */
public record ItemUpdateRequest(
        @Size(max = 200, message = "title은 최대 200자입니다.")
        String title,
        String body,
        String category,
        List<@Size(max = 30, message = "각 태그는 최대 30자입니다.") String> tags
) {
    /** 최소 1개 필드가 존재하는지. */
    public boolean isEmpty() {
        return title == null && body == null && category == null && tags == null;
    }
}
