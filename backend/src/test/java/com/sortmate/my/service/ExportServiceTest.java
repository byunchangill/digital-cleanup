package com.sortmate.my.service;

import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import com.sortmate.item.entity.Item;
import com.sortmate.item.repository.ItemRepository;
import com.sortmate.my.dto.ExportDtos.ExportStartRequest;
import com.sortmate.my.entity.DataType;
import com.sortmate.my.entity.Destination;
import com.sortmate.my.entity.ExportJob;
import com.sortmate.my.repository.ExportJobRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExportServiceTest {

    @Mock private ExportJobRepository jobRepository;
    @Mock private ItemRepository itemRepository;
    @InjectMocks private ExportService service;

    private static final long USER = 1L;

    @Test
    @DisplayName("start: 미가용 destination(GOOGLE_DRIVE)이면 VALIDATION_ERROR")
    void startUnavailableDestination() {
        assertThatThrownBy(() -> service.start(USER,
                new ExportStartRequest(List.of("JSON_METADATA"), "GOOGLE_DRIVE")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    @DisplayName("start: 잘못된 dataTypes 값이면 VALIDATION_ERROR")
    void startInvalidDataType() {
        assertThatThrownBy(() -> service.start(USER,
                new ExportStartRequest(List.of("NONSENSE"), "DOWNLOAD")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    @DisplayName("start: 진행 중 잡 없으면 PREPARING 잡 생성")
    void startCreatesJob() {
        when(jobRepository.findByUserIdAndStatusNotIn(eq(USER), any())).thenReturn(List.of());
        when(itemRepository.findByOwnerId(USER)).thenReturn(List.of());
        when(jobRepository.save(any(ExportJob.class))).thenAnswer(inv -> inv.getArgument(0));

        var res = service.start(USER, new ExportStartRequest(List.of("JSON_METADATA", "ORIGINAL_FILES"), "DOWNLOAD"));

        assertThat(res.status()).isEqualTo("PREPARING");
        assertThat(res.progressPercent()).isEqualTo(0);
    }

    @Test
    @DisplayName("start: 진행 중(비종료) 잡이 있으면 EXPORT_ALREADY_RUNNING")
    void startAlreadyRunning() {
        ExportJob running = new ExportJob(USER, Set.of(DataType.JSON_METADATA), Destination.DOWNLOAD, 1, 1L);
        ReflectionTestUtils.setField(running, "createdAt", Instant.now()); // 방금 생성 → settle 후에도 PREPARING
        when(jobRepository.findByUserIdAndStatusNotIn(eq(USER), any())).thenReturn(List.of(running));

        assertThatThrownBy(() -> service.start(USER,
                new ExportStartRequest(List.of("JSON_METADATA"), "DOWNLOAD")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.EXPORT_ALREADY_RUNNING);
    }

    @Test
    @DisplayName("progress: 없는 잡이면 EXPORT_JOB_NOT_FOUND")
    void progressNotFound() {
        when(jobRepository.findByIdAndUserId(9L, USER)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.progress(USER, 9L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.EXPORT_JOB_NOT_FOUND);
    }

    @Test
    @DisplayName("cancel: 이미 완료된 잡이면 EXPORT_NOT_CANCELABLE")
    void cancelTerminal() {
        ExportJob done = new ExportJob(USER, Set.of(DataType.JSON_METADATA), Destination.DOWNLOAD, 1, 1L);
        ReflectionTestUtils.setField(done, "id", 3L);
        ReflectionTestUtils.setField(done, "status", com.sortmate.my.entity.ExportStatus.DONE);
        when(jobRepository.findByIdAndUserId(3L, USER)).thenReturn(Optional.of(done));

        assertThatThrownBy(() -> service.cancel(USER, 3L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.EXPORT_NOT_CANCELABLE);
    }

    @Test
    @DisplayName("cancel: 진행 중 잡이면 CANCELED로 전이")
    void cancelRunning() {
        ExportJob running = new ExportJob(USER, Set.of(DataType.JSON_METADATA), Destination.DOWNLOAD, 1, 1L);
        ReflectionTestUtils.setField(running, "id", 4L);
        ReflectionTestUtils.setField(running, "createdAt", Instant.now());
        when(jobRepository.findByIdAndUserId(4L, USER)).thenReturn(Optional.of(running));

        var res = service.cancel(USER, 4L);
        assertThat(res.status()).isEqualTo("CANCELED");
    }
}
