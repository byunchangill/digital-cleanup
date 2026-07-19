package com.sortmate.admin.entity;

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

/**
 * CS 문의 티켓(ADM-04). 실제 CS 시스템 연동 범위 밖 → 데모 시드 전용, 조회만.
 */
@Entity
@Table(name = "cs_tickets")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CsTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String subject;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CsTicketType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private CsUrgency urgency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private CsStatus status;

    @Column(nullable = false)
    private Instant createdAt;

    @Builder
    public CsTicket(String subject, CsTicketType type, CsUrgency urgency,
                    CsStatus status, Instant createdAt) {
        this.subject = subject;
        this.type = type;
        this.urgency = urgency;
        this.status = status;
        this.createdAt = createdAt;
    }

    @PrePersist
    void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
    }
}
