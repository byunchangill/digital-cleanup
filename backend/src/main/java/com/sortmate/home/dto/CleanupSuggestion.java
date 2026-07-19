package com.sortmate.home.dto;

/** HOME-01 정리 제안 카드. 조회 시점 동적 산출(영속 엔티티 없음). */
public record CleanupSuggestion(
        String type,          // DUPLICATE_PHOTOS | EXPIRING_ITEMS
        String title,         // 예: "중복 사진 12건이 있어요"
        long count,
        String actionLabel,   // 예: "정리하기" / "확인하기"
        String actionRoute    // 예: "/cleanup/duplicates", "/library?filter=expiring"
) {
}
