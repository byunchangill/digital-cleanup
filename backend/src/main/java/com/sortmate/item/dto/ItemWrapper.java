package com.sortmate.item.dto;

/** 계약의 { "item": {...} } 응답 형태 래퍼. */
public record ItemWrapper<T>(T item) {
    public static <T> ItemWrapper<T> of(T item) {
        return new ItemWrapper<>(item);
    }
}
