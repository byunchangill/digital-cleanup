package com.sortmate.my.dto;

import com.sortmate.my.entity.Notification;

import java.time.Instant;
import java.util.List;

/** MY-01/02 알림 인박스 DTO(계약 my.md). */
public final class NotificationDtos {

    private NotificationDtos() {
    }

    public record NotificationDto(
            Long id,
            String category,
            String type,
            String title,
            String body,
            String actionRoute,
            String actionLabel,
            boolean read,
            Instant createdAt) {

        public static NotificationDto of(Notification n) {
            return new NotificationDto(n.getId(), n.getCategory().name(), n.getType(),
                    n.getTitle(), n.getBody(), n.getActionRoute(), n.getActionLabel(),
                    n.isRead(), n.getCreatedAt());
        }
    }

    /** MY-01 응답: 페이지네이션 + unreadCount(뱃지). */
    public record NotificationListResponse(
            List<NotificationDto> notifications,
            long unreadCount,
            int page,
            int size,
            long totalElements,
            int totalPages,
            boolean hasNext) {
    }

    /** MY-02 요청: ids 지정 또는 all=true. */
    public record ReadRequest(List<Long> ids, Boolean all) {

        public boolean markAll() {
            return Boolean.TRUE.equals(all);
        }

        public boolean isEmpty() {
            return !markAll() && (ids == null || ids.isEmpty());
        }
    }

    public record ReadResponse(int updatedCount, long unreadCount) {
    }
}
