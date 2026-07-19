package com.sortmate.my.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * 비동기 내보내기 잡(계약 my.md MY-04~06).
 * ponytail: 실제 워커/스케줄러 없이 진행률을 createdAt 경과 시간으로 파생(settle).
 * 실제 압축 파이프라인 연동 시 progress/currentTask를 워커가 갱신하도록 교체.
 */
@Entity
@Table(name = "export_jobs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ExportJob {

    /** 데모 진행 시뮬레이션 총 소요(초). 40% 지점에서 압축 단계로 전환. */
    public static final long SIMULATED_DURATION_SECONDS = 9;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "export_job_data_types", joinColumns = @JoinColumn(name = "job_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "data_type", length = 24)
    private Set<DataType> dataTypes = new LinkedHashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Destination destination;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ExportStatus status;

    @Column(nullable = false)
    private int progressPercent;

    @Column
    private String currentTask;

    @Column(nullable = false)
    private int itemCount;

    @Column(nullable = false)
    private long estimatedBytes;

    @Column
    private Long resultBytes;

    @Column
    private String downloadUrl;

    @Column(nullable = false)
    private boolean encrypted;

    @Column(nullable = false)
    private Instant createdAt;

    @Column
    private Instant completedAt;

    @Column(columnDefinition = "text")
    private String error;

    public ExportJob(Long userId, Set<DataType> dataTypes, Destination destination,
                     int itemCount, long estimatedBytes) {
        this.userId = userId;
        this.dataTypes = new LinkedHashSet<>(dataTypes);
        this.destination = destination;
        this.itemCount = itemCount;
        this.estimatedBytes = estimatedBytes;
        this.status = ExportStatus.PREPARING;
        this.progressPercent = 0;
        this.currentTask = "내보내기 준비 중";
        this.encrypted = true;
    }

    @PrePersist
    void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
    }

    public boolean isTerminal() {
        return status.isTerminal();
    }

    /** 경과 시간 기반으로 상태/진행률을 현재 시점까지 전진시킨다(멱등, 종료 잡은 변화 없음). */
    public void settle(Instant now) {
        if (isTerminal()) {
            return;
        }
        long elapsed = now.getEpochSecond() - createdAt.getEpochSecond();
        int pct = (int) Math.min(100, Math.max(0, Math.round(100.0 * elapsed / SIMULATED_DURATION_SECONDS)));
        if (pct >= 100) {
            this.progressPercent = 100;
            this.status = ExportStatus.DONE;
            this.currentTask = "완료";
            this.resultBytes = estimatedBytes;
            this.completedAt = now;
            // DOWNLOAD만 만료형 서명 URL(stub). DRIVE/EMAIL은 외부 전송이라 null.
            this.downloadUrl = destination == Destination.DOWNLOAD
                    ? "/files/exports/" + id + ".zip?token=stub-" + id : null;
        } else if (pct >= 40) {
            this.progressPercent = pct;
            this.status = ExportStatus.COMPRESSING;
            this.currentTask = "고화질 미디어 압축 중";
        } else {
            this.progressPercent = pct;
            this.status = ExportStatus.PREPARING;
            this.currentTask = "메타데이터 준비 중";
        }
    }

    public void cancel() {
        this.status = ExportStatus.CANCELED;
        this.currentTask = "취소됨";
        this.completedAt = Instant.now();
    }
}
