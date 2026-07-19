package com.sortmate.auth.dto;

/** 로그인/갱신 공통 토큰 페이로드 (계약: data.auth 및 AUTH-03 data) */
public record AuthTokenResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn
) {
    public static AuthTokenResponse of(String accessToken, String refreshToken, long expiresIn) {
        return new AuthTokenResponse(accessToken, refreshToken, "Bearer", expiresIn);
    }
}
