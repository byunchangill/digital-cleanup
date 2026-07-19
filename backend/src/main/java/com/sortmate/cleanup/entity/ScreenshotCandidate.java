package com.sortmate.cleanup.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 불필요 스크린샷 후보(계약 CLEAN-05). itemId로 Item 참조(제목/썸네일은 조회 시 Item에서).
 * 실제 삭제는 ITEM-09 재사용 → 삭제되면 Item이 사라지므로 목록에서 자동 제외한다.
 */
@Entity
@Table(name = "cleanup_screenshot_candidates")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ScreenshotCandidate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Long itemId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ScreenshotReason reason;

    @Column(nullable = false, length = 300)
    private String recommendationText;

    @Column(nullable = false)
    private Instant capturedAt;

    @Column(nullable = false)
    private boolean defaultSelected;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ScreenshotCandidateStatus status;

    @Builder
    public ScreenshotCandidate(Long userId, Long itemId, ScreenshotReason reason,
                               String recommendationText, Instant capturedAt,
                               boolean defaultSelected, ScreenshotCandidateStatus status) {
        this.userId = userId;
        this.itemId = itemId;
        this.reason = reason;
        this.recommendationText = recommendationText;
        this.capturedAt = capturedAt;
        this.defaultSelected = defaultSelected;
        this.status = status == null ? ScreenshotCandidateStatus.PENDING : status;
    }

    public void markTrashed() {
        this.status = ScreenshotCandidateStatus.TRASHED;
    }
}
