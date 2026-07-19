package com.sortmate.auth.dto;

/** AUTH-01 / AUTH-02 로그인 응답 (auth + user) */
public record LoginResponse(
        AuthTokenResponse auth,
        UserResponse user
) {
}
