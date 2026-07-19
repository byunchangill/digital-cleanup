package com.sortmate.cleanup.entity;

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
 * 사용자당 1행 정리 설정(계약 CLEAN-09/10). 기본값은 화면 초기 상태 근거.
 */
@Entity
@Table(name = "cleanup_settings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CleanupSettings {

    static final int MIN_THRESHOLD = 30;
    static final int MAX_THRESHOLD = 365;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long userId;

    @Column(nullable = false)
    private boolean autoTrashExpired;

    @Column(nullable = false)
    private boolean smartScreenshotDetection;

    @Column(nullable = false)
    private int unusedThresholdDays;

    @Column(nullable = false)
    private Instant updatedAt;

    private CleanupSettings(Long userId) {
        this.userId = userId;
        this.autoTrashExpired = true;        // 화면 초기: ON
        this.smartScreenshotDetection = false; // 화면 초기: OFF
        this.unusedThresholdDays = 90;       // 화면 초기 슬라이더 값
    }

    /** 기본값으로 신규 설정 생성. */
    public static CleanupSettings defaults(Long userId) {
        return new CleanupSettings(userId);
    }

    @PrePersist
    @PreUpdate
    void touch() {
        this.updatedAt = Instant.now();
    }

    public void setAutoTrashExpired(boolean v) {
        this.autoTrashExpired = v;
    }

    public void setSmartScreenshotDetection(boolean v) {
        this.smartScreenshotDetection = v;
    }

    public void setUnusedThresholdDays(int days) {
        this.unusedThresholdDays = days;
    }
}
