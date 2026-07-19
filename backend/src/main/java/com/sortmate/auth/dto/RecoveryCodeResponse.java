package com.sortmate.auth.dto;

/** AUTH-07 복구 코드 검증 성공 응답 */
public record RecoveryCodeResponse(
        String recoveryToken,
        long expiresIn,
        String nextRoute
) {
}
