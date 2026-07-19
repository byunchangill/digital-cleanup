package com.sortmate.cleanup.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * 중복 자료 그룹(계약 CLEAN-02/03/04). type은 항상 DUPLICATE(명세 가정).
 * 후보(DuplicateCandidate)는 그룹 소유이며 화질 우수순(recommendedKeep 우선) 정렬로 노출한다.
 */
@Entity
@Table(name = "cleanup_groups")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CleanupGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 300)
    private String summary;

    @Column(nullable = false)
    private Long estimatedSaveBytes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private CleanupGroupStatus status;

    @OneToMany(mappedBy = "group", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("recommendedKeep DESC, fileSize DESC")
    private List<DuplicateCandidate> candidates = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Builder
    public CleanupGroup(Long userId, String summary, Long estimatedSaveBytes, CleanupGroupStatus status) {
        this.userId = userId;
        this.summary = summary;
        this.estimatedSaveBytes = estimatedSaveBytes;
        this.status = status == null ? CleanupGroupStatus.PENDING : status;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }

    public void addCandidate(DuplicateCandidate candidate) {
        candidate.assignGroup(this);
        this.candidates.add(candidate);
    }

    public void markResolved() {
        this.status = CleanupGroupStatus.RESOLVED;
    }

    public void markDismissed() {
        this.status = CleanupGroupStatus.DISMISSED;
    }

    /** PENDING이 아니면 이미 처리된 그룹(재처리 불가). */
    public boolean isPending() {
        return this.status == CleanupGroupStatus.PENDING;
    }

    public boolean containsItem(Long itemId) {
        return candidates.stream().anyMatch(c -> c.getItemId().equals(itemId));
    }
}
