package com.sortmate.auth.service;

import com.sortmate.auth.entity.AuthProvider;

/**
 * 소셜 provider(카카오/구글/애플) 인가 코드 검증 추상화.
 * 실제 provider 연동은 운영 구현체로 교체한다. 실패 시 SOCIAL_AUTH_FAILED 예외.
 */
public interface SocialAuthClient {

    SocialUserInfo verify(AuthProvider provider, String authorizationCode, String redirectUri);

    record SocialUserInfo(String providerId, String email, String displayName) {
    }
}
