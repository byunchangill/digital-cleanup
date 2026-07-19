package com.sortmate.auth.entity;

/**
 * 비밀번호 재설정 토큰의 발급 맥락.
 * RESET    : AUTH-04 재설정 링크 요청으로 발급
 * RECOVERY : AUTH-07 복구 코드 검증 성공으로 발급 (단기)
 */
public enum ResetTokenType {
    RESET,
    RECOVERY
}
