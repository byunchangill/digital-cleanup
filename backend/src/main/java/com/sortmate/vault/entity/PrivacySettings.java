package com.sortmate.vault.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 사용자당 1개. privacy_controls 화면의 3개 토글(기본값: 학습 true / 통계 false / 제안 true).
 */
@Entity
@Table(name = "privacy_settings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PrivacySettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long userId;

    @Column(nullable = false)
    private boolean aiTrainingConsent = true;

    @Column(nullable = false)
    private boolean usageStatsSharing = false;

    @Column(nullable = false)
    private boolean personalizedSuggestions = true;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    public PrivacySettings(Long userId) {
        this.userId = userId;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public void setAiTrainingConsent(boolean v) {
        this.aiTrainingConsent = v;
    }

    public void setUsageStatsSharing(boolean v) {
        this.usageStatsSharing = v;
    }

    public void setPersonalizedSuggestions(boolean v) {
        this.personalizedSuggestions = v;
    }
}
