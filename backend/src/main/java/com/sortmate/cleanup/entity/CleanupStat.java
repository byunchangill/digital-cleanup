package com.sortmate.cleanup.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 사용자당 1행 정리 성과 집계(계약 CLEAN-08 리포트 + CLEAN-09 hero).
 * 실시간 재계산 대신 정리 액션 시 누적 갱신(명세 "배치/저장은 백엔드 재량").
 */
@Entity
@Table(name = "cleanup_stats")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CleanupStat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long userId;

    @Column(nullable = false)
    private long weeklySavedBytes;

    @Column(nullable = false)
    private long monthlySavedBytes;

    @Column(nullable = false)
    private long cumulativeSavedBytes;

    @Column(nullable = false)
    private int savedBytesChangePercent;

    @Column(nullable = false)
    private long duplicatesRemoved;

    private CleanupStat(Long userId) {
        this.userId = userId;
    }

    public static CleanupStat empty(Long userId) {
        return new CleanupStat(userId);
    }

    /** 정리 실행 시 누적 갱신(주간/월간/누적 모두 반영). */
    public void addSavings(long bytes, long removedDuplicates) {
        this.weeklySavedBytes += bytes;
        this.monthlySavedBytes += bytes;
        this.cumulativeSavedBytes += bytes;
        this.duplicatesRemoved += removedDuplicates;
    }

    public void seed(long weekly, long monthly, long cumulative, int changePercent, long duplicates) {
        this.weeklySavedBytes = weekly;
        this.monthlySavedBytes = monthly;
        this.cumulativeSavedBytes = cumulative;
        this.savedBytesChangePercent = changePercent;
        this.duplicatesRemoved = duplicates;
    }
}
