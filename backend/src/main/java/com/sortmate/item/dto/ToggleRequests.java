package com.sortmate.item.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** 토글/일괄 요청 DTO 모음. */
public final class ToggleRequests {

    private ToggleRequests() {
    }

    /** ITEM-08 즐겨찾기 토글. */
    public record FavoriteRequest(
            @NotNull(message = "favorite는 필수입니다.") Boolean favorite) {
    }

    /** ITEM-12 vault 토글. */
    public record VaultRequest(
            @NotNull(message = "vaulted는 필수입니다.") Boolean vaulted) {
    }

    /** ITEM-09 삭제 / ITEM-13 공유: id 배열만. */
    public record IdsRequest(
            @NotEmpty(message = "ids는 1개 이상이어야 합니다.") List<Long> ids) {
    }

    /** ITEM-10 일괄 카테고리 이동. */
    public record BulkCategoryRequest(
            @NotEmpty(message = "ids는 1개 이상이어야 합니다.") List<Long> ids,
            @NotNull(message = "category는 필수입니다.") String category) {
    }

    /** ITEM-11 일괄 태그 추가. */
    public record BulkTagsRequest(
            @NotEmpty(message = "ids는 1개 이상이어야 합니다.") List<Long> ids,
            @NotEmpty(message = "tags는 1개 이상이어야 합니다.")
            List<@Size(max = 30, message = "각 태그는 최대 30자입니다.") String> tags) {
    }
}
