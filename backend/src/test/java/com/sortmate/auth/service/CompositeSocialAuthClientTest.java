package com.sortmate.auth.service;

import com.sortmate.auth.entity.AuthProvider;
import com.sortmate.auth.service.SocialAuthClient.SocialUserInfo;
import com.sortmate.auth.service.SocialOAuthProperties.Google;
import com.sortmate.auth.service.SocialOAuthProperties.Kakao;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class CompositeSocialAuthClientTest {

    private final KakaoAuthClient kakao = mock(KakaoAuthClient.class);
    private final GoogleAuthClient google = mock(GoogleAuthClient.class);
    private final StubSocialAuthClient stub = mock(StubSocialAuthClient.class);

    private CompositeSocialAuthClient composite(SocialOAuthProperties props) {
        return new CompositeSocialAuthClient(props, kakao, google, stub);
    }

    private static final SocialUserInfo INFO = new SocialUserInfo("pid", "e@x.com", "name");

    @Test
    void kakaoConfigured_routesToKakao() {
        var props = new SocialOAuthProperties(new Kakao("kid"), null);
        when(kakao.verify(eq(AuthProvider.KAKAO), any(), any())).thenReturn(INFO);

        SocialUserInfo r = composite(props).verify(AuthProvider.KAKAO, "code", "uri");

        assertThat(r).isEqualTo(INFO);
        verifyNoInteractions(stub);
    }

    @Test
    void kakaoUnconfigured_fallsBackToStub() {
        var props = new SocialOAuthProperties(new Kakao(""), null); // 빈 키
        when(stub.verify(eq(AuthProvider.KAKAO), any(), any())).thenReturn(INFO);

        composite(props).verify(AuthProvider.KAKAO, "code", "uri");

        verify(stub).verify(eq(AuthProvider.KAKAO), any(), any());
        verifyNoInteractions(kakao);
    }

    @Test
    void googleNeedsBothKeys_secretMissingFallsBack() {
        var props = new SocialOAuthProperties(null, new Google("gid", null)); // secret 없음
        when(stub.verify(eq(AuthProvider.GOOGLE), any(), any())).thenReturn(INFO);

        composite(props).verify(AuthProvider.GOOGLE, "code", "uri");

        verify(stub).verify(eq(AuthProvider.GOOGLE), any(), any());
        verifyNoInteractions(google);
    }

    @Test
    void googleConfigured_routesToGoogle() {
        var props = new SocialOAuthProperties(null, new Google("gid", "gsecret"));
        when(google.verify(eq(AuthProvider.GOOGLE), any(), any())).thenReturn(INFO);

        composite(props).verify(AuthProvider.GOOGLE, "code", "uri");

        verify(google).verify(eq(AuthProvider.GOOGLE), any(), any());
        verifyNoInteractions(stub);
    }

    @Test
    void apple_alwaysStub() {
        var props = new SocialOAuthProperties(new Kakao("kid"), new Google("gid", "gsecret"));
        when(stub.verify(eq(AuthProvider.APPLE), any(), any())).thenReturn(INFO);

        composite(props).verify(AuthProvider.APPLE, "code", "uri");

        verify(stub).verify(eq(AuthProvider.APPLE), any(), any());
    }
}
