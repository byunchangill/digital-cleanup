package com.sortmate.my.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

/** 알림 인박스 항목(계약 my.md MY-01/02). 설정이 아닌 조회형 인박스. */
@Entity
@Table(name = "notifications")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private NotificationCategory category;

    /** 세부 종류(AI_COMPLETE|DUPLICATE_FOUND|COUPON_EXPIRING|VAULT_BACKUP 등). */
    @Column(nullable = false, length = 32)
    private String type;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "text")
    private String body;

    @Column
    private String actionRoute;

    @Column
    private String actionLabel;

    @Column(nullable = false)
    private boolean read;

    @Column(nullable = false)
    private Instant createdAt;

    @Builder
    public Notification(Long userId, NotificationCategory category, String type, String title,
                        String body, String actionRoute, String actionLabel, boolean read,
                        Instant createdAt) {
        this.userId = userId;
        this.category = category;
        this.type = type;
        this.title = title;
        this.body = body;
        this.actionRoute = actionRoute;
        this.actionLabel = actionLabel;
        this.read = read;
        this.createdAt = createdAt;
    }

    @PrePersist
    void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
    }

    public void markRead() {
        this.read = true;
    }
}
