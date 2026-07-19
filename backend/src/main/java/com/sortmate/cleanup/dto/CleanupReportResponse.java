package com.sortmate.cleanup.dto;

import java.util.List;

/** CLEAN-08 정리 리포트(주간/누적/위생점수/제안). 읽기 전용. */
public record CleanupReportResponse(
        Weekly weekly,
        Cumulative cumulative,
        Hygiene hygiene,
        List<Suggestion> suggestions
) {
    public record Weekly(long savedBytes, String message) {
    }

    public record Cumulative(long savedBytes, int savedBytesChangePercent, long duplicatesRemoved) {
    }

    public record Hygiene(int score, String grade, List<Breakdown> breakdown) {
    }

    public record Breakdown(String key, String label, int percent) {
    }

    public record Suggestion(String type, String title, String description, Long count, String actionRoute) {
    }
}
