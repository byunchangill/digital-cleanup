package com.sortmate.auth.service;

import com.sortmate.auth.entity.AuthProvider;
import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * 카카오 Authorization Code 교환 → 프로필 조회. 실패 시 SOCIAL_AUTH_FAILED.
 * 설정 키(sortmate.oauth.kakao.client-id)가 없으면 Composite가 이 클라이언트를 호출하지 않는다.
 */
@Component
public class KakaoAuthClient implements SocialAuthClient {

    private static final String TOKEN_URL = "https://kauth.kakao.com/oauth/token";
    private static final String PROFILE_URL = "https://kapi.kakao.com/v2/user/me";

    private final SocialOAuthProperties properties;
    private final RestClient rest = RestClient.create();

    public KakaoAuthClient(SocialOAuthProperties properties) {
        this.properties = properties;
    }

    @Override
    @SuppressWarnings("unchecked")
    public SocialUserInfo verify(AuthProvider provider, String authorizationCode, String redirectUri) {
        try {
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("grant_type", "authorization_code");
            form.add("client_id", properties.kakao().clientId());
            form.add("redirect_uri", redirectUri);
            form.add("code", authorizationCode);

            Map<String, Object> token = rest.post().uri(TOKEN_URL)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form).retrieve().body(Map.class);
            String accessToken = token == null ? null : (String) token.get("access_token");
            if (accessToken == null) {
                throw new BusinessException(ErrorCode.SOCIAL_AUTH_FAILED);
            }

            Map<String, Object> me = rest.get().uri(PROFILE_URL)
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve().body(Map.class);
            if (me == null || me.get("id") == null) {
                throw new BusinessException(ErrorCode.SOCIAL_AUTH_FAILED);
            }

            String providerId = String.valueOf(me.get("id"));
            Map<String, Object> account = (Map<String, Object>) me.getOrDefault("kakao_account", Map.of());
            Map<String, Object> props = (Map<String, Object>) me.getOrDefault("properties", Map.of());
            String email = (String) account.get("email");
            if (email == null || email.isBlank()) {
                email = "kakao_" + providerId + "@kakao.sortmate.app"; // 이메일 미동의 시 합성
            }
            String displayName = (String) props.getOrDefault("nickname", "카카오 사용자");
            return new SocialUserInfo(providerId, email, displayName);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.SOCIAL_AUTH_FAILED);
        }
    }
}
