package com.sortmate.admin.service;

import com.sortmate.admin.dto.MemberDto;
import com.sortmate.admin.repository.CsTicketRepository;
import com.sortmate.auth.entity.AuthProvider;
import com.sortmate.auth.entity.User;
import com.sortmate.auth.entity.UserPlan;
import com.sortmate.auth.entity.UserStatus;
import com.sortmate.auth.repository.UserRepository;
import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import com.sortmate.item.repository.ItemRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private ItemRepository itemRepository;
    @Mock private CsTicketRepository csTicketRepository;
    @InjectMocks private AdminService service;

    @Test
    @DisplayName("MemberDto: storagePercent = used/50GB*100(소수1), 할당량 50GB 상수")
    void memberStoragePercent() {
        User u = User.builder().email("a@b.c").displayName("A").provider(AuthProvider.EMAIL)
                .plan(UserPlan.BASIC).status(UserStatus.ACTIVE).build();
        // used = 5GB → 5/50*100 = 10.0%
        MemberDto m = MemberDto.of(u, 5L * 1024 * 1024 * 1024);
        assertThat(m.storageQuotaBytes()).isEqualTo(53_687_091_200L);
        assertThat(m.storagePercent()).isEqualTo(10.0);
        assertThat(m.plan()).isEqualTo("BASIC");
    }

    @Test
    @DisplayName("getMembers: 잘못된 status는 VALIDATION_ERROR")
    void getMembersInvalidStatus() {
        assertThatThrownBy(() -> service.getMembers(null, "UNKNOWN", null, PageRequest.of(0, 10)))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    @DisplayName("분류 품질: 잘못된 range는 VALIDATION_ERROR")
    void qualityInvalidRange() {
        assertThatThrownBy(() -> service.getClassificationQuality("7D"))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    @DisplayName("분류 품질: 90D면 trend 90포인트, 아이템 없으면 데모 정확도")
    void quality90d() {
        when(itemRepository.count()).thenReturn(0L);
        var res = service.getClassificationQuality("90D");
        assertThat(res.trend()).hasSize(90);
        assertThat(res.avgAccuracy()).isEqualTo(94.2);
        assertThat(res.clusters()).isNotEmpty();
    }

    @Test
    @DisplayName("Validation Pack: QUEUED runId 반환")
    void validationPack() {
        var res = service.runValidationPack();
        assertThat(res.status()).isEqualTo("QUEUED");
        assertThat(res.runId()).startsWith("vp_");
    }
}
