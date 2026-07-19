package com.sortmate.vault.entity;

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
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 계정 데이터 삭제 요청. 즉시 파기가 아닌 접수(PENDING). 실제 파기는 유예 후 서버 배치.
 */
@Entity
@Table(name = "account_deletion_requests")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AccountDeletionRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Instant requestedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private DeletionStatus status;

    /** 실제 파기 예정 시각(유예 기간 후). */
    @Column
    private Instant scheduledPurgeAt;

    public AccountDeletionRequest(Long userId, Instant scheduledPurgeAt) {
        this.userId = userId;
        this.scheduledPurgeAt = scheduledPurgeAt;
        this.status = DeletionStatus.PENDING;
    }

    @PrePersist
    void onCreate() {
        if (this.requestedAt == null) {
            this.requestedAt = Instant.now();
        }
    }
}
