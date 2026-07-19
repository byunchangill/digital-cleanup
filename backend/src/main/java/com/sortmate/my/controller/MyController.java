package com.sortmate.my.controller;

import com.sortmate.common.ApiResponse;
import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import com.sortmate.my.dto.ExportDtos.ExportCancelResponse;
import com.sortmate.my.dto.ExportDtos.ExportJobResponse;
import com.sortmate.my.dto.ExportDtos.ExportOptionsResponse;
import com.sortmate.my.dto.ExportDtos.ExportProgressResponse;
import com.sortmate.my.dto.ExportDtos.ExportStartRequest;
import com.sortmate.my.dto.NotificationDtos.NotificationListResponse;
import com.sortmate.my.dto.NotificationDtos.ReadRequest;
import com.sortmate.my.dto.NotificationDtos.ReadResponse;
import com.sortmate.my.dto.PlanDtos.PlanListResponse;
import com.sortmate.my.dto.PlanDtos.RestoreResponse;
import com.sortmate.my.dto.PlanDtos.UpgradeRequest;
import com.sortmate.my.dto.PlanDtos.UpgradeResponse;
import com.sortmate.my.dto.StorageDtos.StorageDetailResponse;
import com.sortmate.my.service.ExportService;
import com.sortmate.my.service.NotificationService;
import com.sortmate.my.service.PlanService;
import com.sortmate.my.service.StorageService;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/my")
public class MyController {

    private static final int MAX_SIZE = 100;

    private final NotificationService notificationService;
    private final ExportService exportService;
    private final StorageService storageService;
    private final PlanService planService;

    public MyController(NotificationService notificationService, ExportService exportService,
                        StorageService storageService, PlanService planService) {
        this.notificationService = notificationService;
        this.exportService = exportService;
        this.storageService = storageService;
        this.planService = planService;
    }

    // ── MY-01/02 알림 인박스 ───────────────────────────────────
    @GetMapping("/notifications")
    public ApiResponse<NotificationListResponse> notifications(
            Authentication auth,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(notificationService.list(userId(auth), category, pageable(page, size)));
    }

    @PostMapping("/notifications/read")
    public ApiResponse<ReadResponse> readNotifications(Authentication auth,
                                                       @RequestBody(required = false) ReadRequest request) {
        return ApiResponse.success(notificationService.markRead(userId(auth), request));
    }

    // ── MY-03~06 내보내기 ──────────────────────────────────────
    @GetMapping("/export/options")
    public ApiResponse<ExportOptionsResponse> exportOptions(Authentication auth) {
        return ApiResponse.success(exportService.options(userId(auth)));
    }

    /** MY-04 내보내기 시작 — 잡 접수(202). */
    @PostMapping("/export")
    public ResponseEntity<ApiResponse<ExportJobResponse>> startExport(
            Authentication auth, @Valid @RequestBody ExportStartRequest request) {
        ExportJobResponse res = exportService.start(userId(auth), request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiResponse.success(res));
    }

    @GetMapping("/export/{jobId}")
    public ApiResponse<ExportProgressResponse> exportProgress(Authentication auth,
                                                              @PathVariable Long jobId) {
        return ApiResponse.success(exportService.progress(userId(auth), jobId));
    }

    @PostMapping("/export/{jobId}/cancel")
    public ApiResponse<ExportCancelResponse> cancelExport(Authentication auth,
                                                          @PathVariable Long jobId) {
        return ApiResponse.success(exportService.cancel(userId(auth), jobId));
    }

    // ── MY-07 저장공간 상세 ────────────────────────────────────
    @GetMapping("/storage")
    public ApiResponse<StorageDetailResponse> storage(Authentication auth) {
        return ApiResponse.success(storageService.storage(userId(auth)));
    }

    // ── MY-08~10 플랜 ──────────────────────────────────────────
    @GetMapping("/plans")
    public ApiResponse<PlanListResponse> plans(Authentication auth) {
        return ApiResponse.success(planService.plans(userId(auth)));
    }

    @PostMapping("/plans/upgrade")
    public ApiResponse<UpgradeResponse> upgrade(Authentication auth,
                                                @Valid @RequestBody UpgradeRequest request) {
        return ApiResponse.success(planService.upgrade(userId(auth), request.planId()));
    }

    @PostMapping("/plans/restore")
    public ApiResponse<RestoreResponse> restore(Authentication auth) {
        return ApiResponse.success(planService.restore(userId(auth)));
    }

    // ── 페이지네이션(계약 표준: page 0-base, size 최대 100, createdAt desc 고정) ──
    private Pageable pageable(int page, int size) {
        if (page < 0) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "page는 0 이상이어야 합니다.");
        }
        int capped = Math.min(Math.max(size, 1), MAX_SIZE);
        return PageRequest.of(page, capped, Sort.by(Sort.Direction.DESC, "createdAt"));
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
