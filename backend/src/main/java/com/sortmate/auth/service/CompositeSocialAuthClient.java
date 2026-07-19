package com.sortmate.auth.service;

import com.sortmate.auth.entity.AuthProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/**
 * provider별 실연동 클라이언트를 라우팅한다. 설정 키가 없는 provider는 Stub으로 폴백.
 * (키 없이도 데모 소셜 로그인이 계속 동작해야 함.) 애플은 항상 Stub(유료 계정 필요).
 */
@Component
@Primary
@EnableConfigurationProperties(SocialOAuthProperties.class)
public class CompositeSocialAuthClient implements SocialAuthClient {

    private static final Logger log = LoggerFactory.getLogger(CompositeSocialAuthClient.class);

    private final SocialOAuthProperties properties;
    private final KakaoAuthClient kakao;
    private final GoogleAuthClient google;
    private final StubSocialAuthClient stub;

    public CompositeSocialAuthClient(SocialOAuthProperties properties, KakaoAuthClient kakao,
                                     GoogleAuthClient google, StubSocialAuthClient stub) {
        this.properties = properties;
        this.kakao = kakao;
        this.google = google;
        this.stub = stub;
    }

    @Override
    public SocialUserInfo verify(AuthProvider provider, String authorizationCode, String redirectUri) {
        return route(provider).verify(provider, authorizationCode, redirectUri);
    }

    private SocialAuthClient route(AuthProvider provider) {
        return switch (provider) {
            case KAKAO -> properties.kakaoConfigured() ? kakao : fallback(provider);
            case GOOGLE -> properties.googleConfigured() ? google : fallback(provider);
            default -> stub; // APPLE 등: Stub 유지
        };
    }

    private SocialAuthClient fallback(AuthProvider provider) {
        log.warn("[OAUTH] {} 설정 키 미지정 → Stub 폴백(데모 모드). 실연동은 환경변수 주입 필요.", provider);
        return stub;
    }
}
