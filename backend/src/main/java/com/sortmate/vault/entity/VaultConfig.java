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
 * 사용자당 1개. PIN 해시·앱잠금·생체동의·시도 초과 상태를 보관한다(vault.md 데이터 모델).
 * 볼트 세션(잠금 해제 상태)은 여기 저장하지 않고 단기 vaultToken으로만 표현한다.
 */
@Entity
@Table(name = "vault_configs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VaultConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long userId;

    /** 6자리 PIN의 BCrypt 해시. null이면 미설정. */
    @Column
    private String pinHash;

    @Column
    private Instant pinSetAt;

    @Column(nullable = false)
    private boolean appLockEnabled;

    @Column(nullable = false)
    private boolean biometricEnabled;

    @Column(nullable = false)
    private int failedAttempts;

    /** 시도 초과 잠금 해제 예정 시각. null이면 잠금 아님. */
    @Column
    private Instant lockedUntil;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    public VaultConfig(Long userId) {
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

    public boolean hasPin() {
        return pinHash != null;
    }

    /** 시도 초과로 현재 잠긴 상태인지. */
    public boolean isLockedOut() {
        return lockedUntil != null && lockedUntil.isAfter(Instant.now());
    }

    public long retryAfterSeconds() {
        if (!isLockedOut()) {
            return 0;
        }
        return Math.max(0, java.time.Duration.between(Instant.now(), lockedUntil).getSeconds());
    }

    public void setPin(String pinHash) {
        this.pinHash = pinHash;
        this.pinSetAt = Instant.now();
        this.appLockEnabled = true;
        this.failedAttempts = 0;
        this.lockedUntil = null;
    }

    public void setBiometricEnabled(boolean enabled) {
        this.biometricEnabled = enabled;
    }

    public void recordSuccess() {
        this.failedAttempts = 0;
        this.lockedUntil = null;
    }

    /** 실패 1회 기록. 임계치 도달 시 lockoutSeconds 동안 잠근다. */
    public void recordFailure(int maxAttempts, long lockoutSeconds) {
        this.failedAttempts += 1;
        if (this.failedAttempts >= maxAttempts) {
            this.lockedUntil = Instant.now().plusSeconds(lockoutSeconds);
            this.failedAttempts = 0;
        }
    }
}
