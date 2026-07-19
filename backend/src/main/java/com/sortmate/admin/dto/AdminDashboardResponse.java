package com.sortmate.admin.dto;

import java.time.Instant;
import java.util.List;

/** ADM-01 운영 대시보드 집계(adm_001 + adm_003_2 KPI 공용). */
public record AdminDashboardResponse(
        long totalUsers,
        double totalUsersDeltaPercent,
        long savedToday,
        long totalItems,
        double aiSuccessRate,
        int aiAvgResponseMs,
        String aiStatus,
        int activeSessions,
        long unresolvedCs,
        long urgentCs,
        String serverStatus,
        double uptimePercent,
        List<RecentSubscriber> recentSubscribers,
        List<RecentInquiry> recentInquiries
) {
    public record RecentSubscriber(
            Long id,
            String displayName,
            String email,
            String plan,
            String status,
            Instant joinedAt
    ) {
    }

    public record RecentInquiry(
            Long id,
            String subject,
            String type,
            String urgency
    ) {
    }
}
