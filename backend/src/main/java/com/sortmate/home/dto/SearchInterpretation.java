package com.sortmate.home.dto;

/** HOME-02 질의 해석 칩. type: PERIOD | ITEM_TYPE | LOCATION | KEYWORD. */
public record SearchInterpretation(
        String type,
        String label,   // 예: "기간: 6월"
        String value    // 예: "2024-06"
) {
}
