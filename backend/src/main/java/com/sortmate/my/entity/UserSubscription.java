package com.sortmate.my.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 사용자-플랜 구독 관계(계약 my.md MY-08/09).
 * 행이 없으면 FREE로 간주. PREMIUM 업그레이드 시 1행 upsert.
 */
@Entity
@Table(name = "user_subscriptions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Plan plan;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SubscriptionStatus status;

    @Column
    private Instant currentPeriodEnd;

    public UserSubscription(Long userId, Plan plan, SubscriptionStatus status, Instant currentPeriodEnd) {
        this.userId = userId;
        this.plan = plan;
        this.status = status;
        this.currentPeriodEnd = currentPeriodEnd;
    }

    /** stub 구독 활성화(채택안 A: 결제 없이 즉시 ACTIVE). */
    public void activate(Plan plan, Instant currentPeriodEnd) {
        this.plan = plan;
        this.status = SubscriptionStatus.ACTIVE;
        this.currentPeriodEnd = currentPeriodEnd;
    }
}
