package com.sortmate.my.service;

import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import com.sortmate.my.dto.PlanDtos.PlanDto;
import com.sortmate.my.dto.PlanDtos.PlanListResponse;
import com.sortmate.my.dto.PlanDtos.RestoreResponse;
import com.sortmate.my.dto.PlanDtos.UpgradeResponse;
import com.sortmate.my.entity.Plan;
import com.sortmate.my.entity.SubscriptionStatus;
import com.sortmate.my.entity.UserSubscription;
import com.sortmate.my.repository.UserSubscriptionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/** MY-08~10 플랜 조회/업그레이드(stub)/복원(stub) 서비스. */
@Service
public class PlanService {

    /** stub 구독 주기(1개월). PG 연동 시 실제 청구주기로 교체. */
    static final long PERIOD_DAYS = 30;

    private final UserSubscriptionRepository subscriptionRepository;

    public PlanService(UserSubscriptionRepository subscriptionRepository) {
        this.subscriptionRepository = subscriptionRepository;
    }

    /** 현재 유효 플랜: ACTIVE 구독이 있으면 해당 플랜, 없으면 FREE. StorageService도 재사용. */
    @Transactional(readOnly = true)
    public Plan currentPlan(Long userId) {
        return subscriptionRepository.findByUserId(userId)
                .filter(s -> s.getStatus() == SubscriptionStatus.ACTIVE)
                .map(UserSubscription::getPlan)
                .orElse(Plan.FREE);
    }

    // ── MY-08 플랜 목록/비교 ───────────────────────────────────
    @Transactional(readOnly = true)
    public PlanListResponse plans(Long userId) {
        Plan current = currentPlan(userId);
        List<PlanDto> plans = Arrays.stream(Plan.values())
                .map(p -> new PlanDto(p.name(), p.getDisplayName(), p.getPriceMonthly(), Plan.CURRENCY,
                        p.getStorageBytes(), p.getFeatures(), p.getBadge(), p == current))
                .toList();
        return new PlanListResponse(current.name(), plans);
    }

    // ── MY-09 업그레이드(stub, 채택안 A: 즉시 ACTIVE) ──────────
    @Transactional
    public UpgradeResponse upgrade(Long userId, String planIdRaw) {
        Plan target = parsePlan(planIdRaw);
        if (currentPlan(userId) == target) {
            throw new BusinessException(ErrorCode.PLAN_ALREADY_ACTIVE);
        }
        Instant periodEnd = Instant.now().plus(PERIOD_DAYS, ChronoUnit.DAYS);
        UserSubscription sub = subscriptionRepository.findByUserId(userId).orElse(null);
        if (sub == null) {
            sub = subscriptionRepository.save(
                    new UserSubscription(userId, target, SubscriptionStatus.ACTIVE, periodEnd));
        } else {
            sub.activate(target, periodEnd);
        }
        return new UpgradeResponse(sub.getPlan().name(), sub.getStatus().name(),
                sub.getCurrentPeriodEnd(), true);
    }

    // ── MY-10 복원(stub) ───────────────────────────────────────
    @Transactional(readOnly = true)
    public RestoreResponse restore(Long userId) {
        // 기본 구현: 복원할 외부 구매 없음(스토어 미연동).
        return new RestoreResponse(false, null, true);
    }

    private Plan parsePlan(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "planId는 필수입니다.");
        }
        try {
            return Plan.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.PLAN_NOT_FOUND);
        }
    }
}
