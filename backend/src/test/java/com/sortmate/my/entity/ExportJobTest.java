package com.sortmate.my.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** 시간 경과 기반 진행률 파생(settle) 규칙 검증. */
class ExportJobTest {

    private ExportJob job(Instant createdAt) {
        ExportJob j = new ExportJob(1L, Set.of(DataType.ORIGINAL_FILES), Destination.DOWNLOAD, 10, 2048L);
        ReflectionTestUtils.setField(j, "id", 7L);
        ReflectionTestUtils.setField(j, "createdAt", createdAt);
        return j;
    }

    @Test
    @DisplayName("갓 생성: PREPARING, 진행률 0")
    void freshJob() {
        Instant now = Instant.now();
        ExportJob j = job(now);
        j.settle(now);
        assertThat(j.getStatus()).isEqualTo(ExportStatus.PREPARING);
        assertThat(j.getProgressPercent()).isEqualTo(0);
    }

    @Test
    @DisplayName("중간(경과 5초): COMPRESSING")
    void midJob() {
        Instant now = Instant.now();
        ExportJob j = job(now.minus(5, ChronoUnit.SECONDS));
        j.settle(now);
        assertThat(j.getStatus()).isEqualTo(ExportStatus.COMPRESSING);
        assertThat(j.getProgressPercent()).isBetween(40, 99);
    }

    @Test
    @DisplayName("완료(경과 10초): DONE + resultBytes + DOWNLOAD 다운로드 URL")
    void doneJob() {
        Instant now = Instant.now();
        ExportJob j = job(now.minus(10, ChronoUnit.SECONDS));
        j.settle(now);
        assertThat(j.getStatus()).isEqualTo(ExportStatus.DONE);
        assertThat(j.getProgressPercent()).isEqualTo(100);
        assertThat(j.getResultBytes()).isEqualTo(2048L);
        assertThat(j.getDownloadUrl()).contains("/files/exports/7.zip");
        assertThat(j.getCompletedAt()).isNotNull();
    }

    @Test
    @DisplayName("종료 잡은 settle 재호출에도 불변(멱등)")
    void terminalIdempotent() {
        Instant now = Instant.now();
        ExportJob j = job(now.minus(10, ChronoUnit.SECONDS));
        j.settle(now);
        Instant completed = j.getCompletedAt();
        j.settle(now.plus(1, ChronoUnit.HOURS));
        assertThat(j.getStatus()).isEqualTo(ExportStatus.DONE);
        assertThat(j.getCompletedAt()).isEqualTo(completed);
    }
}
