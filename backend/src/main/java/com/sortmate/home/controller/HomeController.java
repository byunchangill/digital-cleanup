package com.sortmate.home.controller;

import com.sortmate.common.ApiResponse;
import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import com.sortmate.home.dto.DashboardResponse;
import com.sortmate.home.dto.SearchResponse;
import com.sortmate.home.service.HomeService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/home")
public class HomeController {

    private final HomeService homeService;

    public HomeController(HomeService homeService) {
        this.homeService = homeService;
    }

    /** HOME-01 홈 대시보드 요약(정리 제안 + 최근 문서 + 카테고리). */
    @GetMapping("/dashboard")
    public ApiResponse<DashboardResponse> dashboard(Authentication auth,
                                                    @RequestParam(required = false) Integer recentSize) {
        return ApiResponse.success(homeService.dashboard(userId(auth), recentSize));
    }

    /** HOME-02 자연어 검색(해석 + 일치도 결과 + 상세 필터 추천 + 빈 상태 힌트). */
    @GetMapping("/search")
    public ApiResponse<SearchResponse> search(Authentication auth,
                                              @RequestParam(required = false) String q,
                                              @RequestParam(required = false) String mode,
                                              @RequestParam(required = false) Boolean favorite,
                                              @RequestParam(required = false) String category,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(homeService.search(userId(auth), q, mode, favorite, category, page, size));
    }

    /** 인증 주체(JWT sub=userId)에서 사용자 id 추출(item 모듈과 동일 규약). */
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
