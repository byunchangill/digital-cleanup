package com.sortmate.admin.controller;

import com.sortmate.admin.dto.AdminDashboardResponse;
import com.sortmate.admin.dto.CsTicketDto;
import com.sortmate.admin.dto.MemberDto;
import com.sortmate.admin.dto.ValidationPackResponse;
import com.sortmate.admin.service.AdminGuard;
import com.sortmate.admin.service.AdminService;
import com.sortmate.common.ApiResponse;
import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import com.sortmate.item.dto.PageResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.Set;

/**
 * ADM-01~06. 전 엔드포인트 ADMIN 전용(AdminGuard). 미인증은 SecurityConfig가 401 처리.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private static final int MAX_SIZE = 100;
    private static final Set<String> MEMBER_SORTABLE = Set.of("createdAt", "displayName", "email");
    private static final Set<String> TICKET_SORTABLE = Set.of("createdAt", "urgency", "status");

    private final AdminService adminService;
    private final AdminGuard adminGuard;

    public AdminController(AdminService adminService, AdminGuard adminGuard) {
        this.adminService = adminService;
        this.adminGuard = adminGuard;
    }

    /** ADM-01 운영 대시보드 집계. */
    @GetMapping("/dashboard")
    public ApiResponse<AdminDashboardResponse> dashboard(Authentication auth) {
        adminGuard.requireAdmin(auth);
        return ApiResponse.success(adminService.getDashboard());
    }

    /** ADM-02 회원 목록(검색/필터/페이지). */
    @GetMapping("/users")
    public ApiResponse<PageResponse<MemberDto>> users(
            Authentication auth,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String plan,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {
        adminGuard.requireAdmin(auth);
        Pageable pageable = pageable(page, size, sort, MEMBER_SORTABLE, "createdAt");
        return ApiResponse.success(adminService.getMembers(q, status, plan, pageable));
    }

    /** ADM-03 회원 목록 CSV 내보내기(봉투 아님). */
    @GetMapping("/users/export")
    public ResponseEntity<byte[]> exportUsers(
            Authentication auth,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String plan) {
        adminGuard.requireAdmin(auth);
        String csv = adminService.exportMembersCsv(q, status, plan);
        byte[] body = csv.getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"members.csv\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(body);
    }

    /** ADM-04 CS 티켓 목록. */
    @GetMapping("/cs/tickets")
    public ApiResponse<PageResponse<CsTicketDto>> csTickets(
            Authentication auth,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String urgency,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {
        adminGuard.requireAdmin(auth);
        Pageable pageable = pageable(page, size, sort, TICKET_SORTABLE, "createdAt");
        return ApiResponse.success(adminService.getCsTickets(status, urgency, pageable));
    }

    /** ADM-05 분류 품질 지표. */
    @GetMapping("/classification/quality")
    public ApiResponse<com.sortmate.admin.dto.ClassificationQualityResponse> quality(
            Authentication auth,
            @RequestParam(required = false) String range) {
        adminGuard.requireAdmin(auth);
        return ApiResponse.success(adminService.getClassificationQuality(range));
    }

    /** ADM-06 Validation Pack 실행(stub, 202). */
    @PostMapping("/classification/validation-pack")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ApiResponse<ValidationPackResponse> runValidationPack(Authentication auth) {
        adminGuard.requireAdmin(auth);
        return ApiResponse.success(adminService.runValidationPack());
    }

    private static Pageable pageable(int page, int size, String sort, Set<String> sortable, String defaultField) {
        if (page < 0) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "page는 0 이상이어야 합니다.");
        }
        int cappedSize = Math.min(Math.max(size, 1), MAX_SIZE);
        return PageRequest.of(page, cappedSize, parseSort(sort, sortable, defaultField));
    }

    private static Sort parseSort(String sort, Set<String> sortable, String defaultField) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, defaultField);
        }
        String[] parts = sort.split(",");
        String field = parts[0].trim();
        if (!sortable.contains(field)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "지원하지 않는 sort 필드입니다: " + field);
        }
        Sort.Direction dir = (parts.length > 1 && "asc".equalsIgnoreCase(parts[1].trim()))
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(dir, field);
    }
}
