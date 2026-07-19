package com.sortmate.cleanup.dto;

import com.sortmate.cleanup.entity.CleanupSettings;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** CLEAN-09/10 정리 설정 DTO 모음. */
public final class SettingsDtos {

    private SettingsDtos() {
    }

    /** CLEAN-09/10 공통 응답. monthlySavedBytes는 CleanupStat 파생값. */
    public record SettingsResponse(
            boolean autoTrashExpired,
            boolean smartScreenshotDetection,
            int unusedThresholdDays,
            long monthlySavedBytes
    ) {
        public static SettingsResponse of(CleanupSettings s, long monthlySavedBytes) {
            return new SettingsResponse(s.isAutoTrashExpired(), s.isSmartScreenshotDetection(),
                    s.getUnusedThresholdDays(), monthlySavedBytes);
        }
    }

    /** CLEAN-10 부분 수정 요청(모든 필드 선택, 최소 1개). */
    public record SettingsUpdateRequest(
            Boolean autoTrashExpired,
            Boolean smartScreenshotDetection,
            @Min(value = 30, message = "unusedThresholdDays는 30~365 범위여야 합니다.")
            @Max(value = 365, message = "unusedThresholdDays는 30~365 범위여야 합니다.")
            Integer unusedThresholdDays
    ) {
        public boolean isEmpty() {
            return autoTrashExpired == null && smartScreenshotDetection == null && unusedThresholdDays == null;
        }
    }
}
