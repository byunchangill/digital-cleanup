package com.sortmate.my.service;

import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import com.sortmate.my.dto.NotificationDtos.ReadRequest;
import com.sortmate.my.entity.Notification;
import com.sortmate.my.entity.NotificationCategory;
import com.sortmate.my.repository.NotificationRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock private NotificationRepository repository;
    @InjectMocks private NotificationService service;

    private static final long USER = 1L;

    private Notification unread() {
        return Notification.builder().userId(USER).category(NotificationCategory.SYSTEM)
                .type("X").title("t").read(false).createdAt(Instant.now()).build();
    }

    @Test
    @DisplayName("markRead: ids/all 모두 비면 VALIDATION_ERROR")
    void markReadEmpty() {
        assertThatThrownBy(() -> service.markRead(USER, new ReadRequest(List.of(), false)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    @DisplayName("markRead: 지정 id 중 존재하지 않는 게 있으면 NOTIFICATION_NOT_FOUND")
    void markReadMissingId() {
        when(repository.findByUserIdAndIdIn(USER, List.of(1L, 2L))).thenReturn(List.of(unread()));

        assertThatThrownBy(() -> service.markRead(USER, new ReadRequest(List.of(1L, 2L), false)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.NOTIFICATION_NOT_FOUND);
    }

    @Test
    @DisplayName("markRead: all=true면 미읽음 전체 읽음 처리")
    void markReadAll() {
        when(repository.findByUserIdAndReadFalse(USER)).thenReturn(List.of(unread(), unread()));
        when(repository.countByUserIdAndReadFalse(USER)).thenReturn(0L);

        var res = service.markRead(USER, new ReadRequest(null, true));

        assertThat(res.updatedCount()).isEqualTo(2);
        assertThat(res.unreadCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("list: 잘못된 category면 VALIDATION_ERROR")
    void listInvalidCategory() {
        assertThatThrownBy(() -> service.list(USER, "WRONG", null))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
    }
}
