package com.sortmate.my.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.List;

/** MY-08~10 플랜/업그레이드/복원 DTO(계약 my.md). */
public final class PlanDtos {

    private PlanDtos() {
    }

    public record PlanDto(
            String id,
            String name,
            int priceMonthly,
            String currency,
            long storageBytes,
            List<String> features,
            String badge,
            boolean isCurrent) {
    }

    public record PlanListResponse(String currentPlanId, List<PlanDto> plans) {
    }

    // ── MY-09 업그레이드 ───────────────────────────────────────
    public record UpgradeRequest(
            @NotBlank(message = "planId는 필수입니다.") String planId) {
    }

    public record UpgradeResponse(String planId, String status, Instant currentPeriodEnd, boolean stub) {
    }

    // ── MY-10 복원 ─────────────────────────────────────────────
    public record RestoreResponse(boolean restored, String planId, boolean stub) {
    }
}
