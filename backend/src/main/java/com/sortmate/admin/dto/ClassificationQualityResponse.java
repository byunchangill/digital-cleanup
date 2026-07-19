package com.sortmate.admin.dto;

import java.util.List;

/** ADM-05 분류 품질(avgAccuracy만 실집계 근사, 나머지는 데모). */
public record ClassificationQualityResponse(
        double avgAccuracy,
        double deltaPercent,
        List<TrendPoint> trend,
        List<Cluster> clusters,
        Suggestion suggestion
) {
    public record TrendPoint(String date, double accuracy) {
    }

    public record Cluster(
            String categoryA,
            String categoryB,
            String biasLevel,
            double correctionRate,
            long eventCount
    ) {
    }

    public record Suggestion(String title, String detail) {
    }
}
