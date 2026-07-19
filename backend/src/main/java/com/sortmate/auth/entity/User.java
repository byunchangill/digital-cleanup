package com.sortmate.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private AuthProvider provider;

    /** 소셜 provider 고유 ID (EMAIL 계정은 null) */
    @Column
    private String providerId;

    /** BCrypt 해시. provider=EMAIL 계정만 값 존재. */
    @Column
    private String passwordHash;

    /** 권한(admin 인가 축). 기본 USER. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Role role;

    /** 표시용 플랜 배지(admin). 기본 FREE. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private UserPlan plan;

    /** 회원 상태(admin). 기본 ACTIVE. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private UserStatus status;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @Builder
    public User(String email, String displayName, AuthProvider provider,
                String providerId, String passwordHash,
                Role role, UserPlan plan, UserStatus status) {
        this.email = email;
        this.displayName = displayName;
        this.provider = provider;
        this.providerId = providerId;
        this.passwordHash = passwordHash;
        this.role = role != null ? role : Role.USER;
        this.plan = plan != null ? plan : UserPlan.FREE;
        this.status = status != null ? status : UserStatus.ACTIVE;
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

    public void updatePasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
        this.updatedAt = Instant.now();
    }
}
