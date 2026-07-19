package com.sortmate.auth.controller;

import com.sortmate.auth.dto.AuthTokenResponse;
import com.sortmate.auth.dto.EmailLoginRequest;
import com.sortmate.auth.dto.LoginResponse;
import com.sortmate.auth.dto.MessageResponse;
import com.sortmate.auth.dto.PasswordResetLinkRequest;
import com.sortmate.auth.dto.PasswordResetRequest;
import com.sortmate.auth.dto.RecoveryCodeRequest;
import com.sortmate.auth.dto.RecoveryCodeResponse;
import com.sortmate.auth.dto.SocialLoginRequest;
import com.sortmate.auth.dto.TokenRefreshRequest;
import com.sortmate.auth.service.AuthService;
import com.sortmate.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /** AUTH-01 소셜 로그인 */
    @PostMapping("/social/{provider}")
    public ApiResponse<LoginResponse> socialLogin(@PathVariable String provider,
                                                  @Valid @RequestBody SocialLoginRequest request) {
        return ApiResponse.success(authService.socialLogin(provider, request));
    }

    /** AUTH-02 이메일 로그인 */
    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody EmailLoginRequest request) {
        return ApiResponse.success(authService.emailLogin(request));
    }

    /** AUTH-03 액세스 토큰 갱신 */
    @PostMapping("/token/refresh")
    public ApiResponse<AuthTokenResponse> refresh(@Valid @RequestBody TokenRefreshRequest request) {
        return ApiResponse.success(authService.refresh(request));
    }

    /** AUTH-04 비밀번호 재설정 링크 요청 */
    @PostMapping("/password/reset-request")
    public ApiResponse<MessageResponse> requestPasswordReset(@Valid @RequestBody PasswordResetLinkRequest request) {
        return ApiResponse.success(authService.requestPasswordResetLink(request));
    }

    /** AUTH-05 새 비밀번호 설정 */
    @PostMapping("/password/reset")
    public ApiResponse<MessageResponse> resetPassword(@Valid @RequestBody PasswordResetRequest request) {
        return ApiResponse.success(authService.resetPassword(request));
    }

    /** AUTH-06 계정 복구 - 이메일 매직 링크 발송 */
    @PostMapping("/recovery/email")
    public ApiResponse<MessageResponse> recoveryEmail(@Valid @RequestBody PasswordResetLinkRequest request) {
        return ApiResponse.success(authService.sendRecoveryEmail(request));
    }

    /** AUTH-07 계정 복구 - 복구 코드 검증 */
    @PostMapping("/recovery/code")
    public ApiResponse<RecoveryCodeResponse> recoveryCode(@Valid @RequestBody RecoveryCodeRequest request) {
        return ApiResponse.success(authService.verifyRecoveryCode(request));
    }
}
