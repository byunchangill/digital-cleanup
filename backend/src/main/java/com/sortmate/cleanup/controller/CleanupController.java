package com.sortmate.cleanup.controller;

import com.sortmate.cleanup.dto.CleanupDashboardResponse;
import com.sortmate.cleanup.dto.CleanupReportResponse;
import com.sortmate.cleanup.dto.DuplicateDtos.DismissResponse;
import com.sortmate.cleanup.dto.DuplicateDtos.DuplicateGroupListResponse;
import com.sortmate.cleanup.dto.DuplicateDtos.ResolveRequest;
import com.sortmate.cleanup.dto.DuplicateDtos.ResolveResponse;
import com.sortmate.cleanup.dto.RunDtos.RunRequest;
import com.sortmate.cleanup.dto.RunDtos.RunResponse;
import com.sortmate.cleanup.dto.ScreenshotDtos.ScreenshotListResponse;
import com.sortmate.cleanup.dto.SettingsDtos.SettingsResponse;
import com.sortmate.cleanup.dto.SettingsDtos.SettingsUpdateRequest;
import com.sortmate.cleanup.service.CleanupService;
import com.sortmate.common.ApiResponse;
import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cleanup")
public class CleanupController {

    private final CleanupService cleanupService;

    public CleanupController(CleanupService cleanupService) {
        this.cleanupService = cleanupService;
    }

    /** CLEAN-01 정리 대시보드. */
    @GetMapping("/dashboard")
    public ApiResponse<CleanupDashboardResponse> dashboard(Authentication auth) {
        return ApiResponse.success(cleanupService.dashboard(userId(auth)));
    }

    /** CLEAN-02 중복 그룹 목록. */
    @GetMapping("/duplicates")
    public ApiResponse<DuplicateGroupListResponse> duplicates(Authentication auth,
                                                              @RequestParam(defaultValue = "0") int page,
                                                              @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(cleanupService.listDuplicates(page, size, userId(auth)));
    }

    /** CLEAN-03 중복 그룹 정리 실행. */
    @PostMapping("/duplicates/{groupId}/resolve")
    public ApiResponse<ResolveResponse> resolve(Authentication auth, @PathVariable Long groupId,
                                                @Valid @RequestBody ResolveRequest request) {
        return ApiResponse.success(cleanupService.resolve(userId(auth), groupId, request.keepItemId()));
    }

    /** CLEAN-04 중복 그룹 해제. */
    @PostMapping("/duplicates/{groupId}/dismiss")
    public ApiResponse<DismissResponse> dismiss(Authentication auth, @PathVariable Long groupId) {
        return ApiResponse.success(cleanupService.dismiss(userId(auth), groupId));
    }

    /** CLEAN-05 불필요 스크린샷 후보 목록. */
    @GetMapping("/screenshots")
    public ApiResponse<ScreenshotListResponse> screenshots(Authentication auth,
                                                           @RequestParam(required = false) String reason,
                                                           @RequestParam(defaultValue = "0") int page,
                                                           @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(cleanupService.listScreenshots(userId(auth), reason, page, size));
    }

    /** CLEAN-07 한꺼번에 정리하기. */
    @PostMapping("/run")
    public ApiResponse<RunResponse> run(Authentication auth,
                                        @RequestBody(required = false) RunRequest request) {
        return ApiResponse.success(cleanupService.run(userId(auth),
                request == null ? null : request.types()));
    }

    /** CLEAN-08 정리 리포트. */
    @GetMapping("/report")
    public ApiResponse<CleanupReportResponse> report(Authentication auth) {
        return ApiResponse.success(cleanupService.report(userId(auth)));
    }

    /** CLEAN-09 정리 설정 조회. */
    @GetMapping("/settings")
    public ApiResponse<SettingsResponse> getSettings(Authentication auth) {
        return ApiResponse.success(cleanupService.getSettings(userId(auth)));
    }

    /** CLEAN-10 정리 설정 저장. */
    @PutMapping("/settings")
    public ApiResponse<SettingsResponse> updateSettings(Authentication auth,
                                                        @Valid @RequestBody SettingsUpdateRequest request) {
        return ApiResponse.success(cleanupService.updateSettings(userId(auth), request));
    }

    /** 인증 주체(JWT sub=userId)에서 사용자 id 추출. */
    private Long userId(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
        try {
            return Long.valueOf(auth.getName());
        } catch (NumberFormatException e) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
    }
}
