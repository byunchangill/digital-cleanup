package com.sortmate.cleanup.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 중복 그룹 후보(계약 CLEAN-02). 해상도/용량/촬영일은 Item에 없는 값이라 후보 행에 보존한다.
 * itemId로 Item을 참조(썸네일/마스킹은 조회 시 Item에서 확인).
 */
@Entity
@Table(name = "cleanup_duplicate_candidates")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DuplicateCandidate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = jakarta.persistence.FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private CleanupGroup group;

    @Column(nullable = false)
    private Long itemId;

    @Column(nullable = false)
    private int width;

    @Column(nullable = false)
    private int height;

    @Column(nullable = false)
    private long fileSize;

    @Column(nullable = false)
    private Instant capturedAt;

    @Column(nullable = false)
    private boolean recommendedKeep;

    @Builder
    public DuplicateCandidate(Long itemId, int width, int height, long fileSize,
                              Instant capturedAt, boolean recommendedKeep) {
        this.itemId = itemId;
        this.width = width;
        this.height = height;
        this.fileSize = fileSize;
        this.capturedAt = capturedAt;
        this.recommendedKeep = recommendedKeep;
    }

    void assignGroup(CleanupGroup group) {
        this.group = group;
    }
}
