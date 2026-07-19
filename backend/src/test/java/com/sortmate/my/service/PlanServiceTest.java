package com.sortmate.my.service;

import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import com.sortmate.my.entity.Plan;
import com.sortmate.my.entity.SubscriptionStatus;
import com.sortmate.my.entity.UserSubscription;
import com.sortmate.my.repository.UserSubscriptionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlanServiceTest {

    @Mock private UserSubscriptionRepository subscriptionRepository;
    @InjectMocks private PlanService service;

    private static final long USER = 1L;

    @Test
    @DisplayName("plans: 구독 없으면 currentPlanId=FREE, PREMIUM은 isCurrent=false")
    void plansDefaultFree() {
        when(subscriptionRepository.findByUserId(USER)).thenReturn(Optional.empty());

        var res = service.plans(USER);

        assertThat(res.currentPlanId()).isEqualTo("FREE");
        assertThat(res.plans()).anySatisfy(p -> {
            if (p.id().equals("FREE")) assertThat(p.isCurrent()).isTrue();
            if (p.id().equals("PREMIUM")) assertThat(p.isCurrent()).isFalse();
        });
    }

    @Test
    @DisplayName("upgrade: FREE→PREMIUM 즉시 ACTIVE(stub) + 구독 생성")
    void upgradeSuccess() {
        when(subscriptionRepository.findByUserId(USER)).thenReturn(Optional.empty());
        when(subscriptionRepository.save(any(UserSubscription.class))).thenAnswer(inv -> inv.getArgument(0));

        var res = service.upgrade(USER, "PREMIUM");

        assertThat(res.planId()).isEqualTo("PREMIUM");
        assertThat(res.status()).isEqualTo("ACTIVE");
        assertThat(res.stub()).isTrue();
        assertThat(res.currentPeriodEnd()).isNotNull();
    }

    @Test
    @DisplayName("upgrade: 이미 PREMIUM ACTIVE면 PLAN_ALREADY_ACTIVE")
    void upgradeAlreadyActive() {
        var sub = new UserSubscription(USER, Plan.PREMIUM, SubscriptionStatus.ACTIVE, Instant.now());
        when(subscriptionRepository.findByUserId(USER)).thenReturn(Optional.of(sub));

        assertThatThrownBy(() -> service.upgrade(USER, "PREMIUM"))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PLAN_ALREADY_ACTIVE);
    }

    @Test
    @DisplayName("upgrade: 존재하지 않는 planId면 PLAN_NOT_FOUND")
    void upgradeUnknownPlan() {
        assertThatThrownBy(() -> service.upgrade(USER, "GOLD"))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PLAN_NOT_FOUND);
    }

    @Test
    @DisplayName("restore: 기본은 복원할 구매 없음(restored=false, stub)")
    void restoreDefault() {
        var res = service.restore(USER);
        assertThat(res.restored()).isFalse();
        assertThat(res.stub()).isTrue();
    }
}
