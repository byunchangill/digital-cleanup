package com.sortmate.auth.service;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 소셜 OAuth 실연동 설정. 키가 비어 있으면(기본) 해당 provider는 Stub으로 폴백한다.
 * 환경변수 주입: KAKAO_CLIENT_ID / GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
 */
@ConfigurationProperties(prefix = "sortmate.oauth")
public record SocialOAuthProperties(Kakao kakao, Google google) {

    public record Kakao(String clientId) {
    }

    public record Google(String clientId, String clientSecret) {
    }

    public boolean kakaoConfigured() {
        return kakao != null && notBlank(kakao.clientId());
    }

    public boolean googleConfigured() {
        return google != null && notBlank(google.clientId()) && notBlank(google.clientSecret());
    }

    private static boolean notBlank(String v) {
        return v != null && !v.isBlank();
    }
}
