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
 * 구글 Authorization Code 교환 → userinfo 조회. 실패 시 SOCIAL_AUTH_FAILED.
 * 설정 키(sortmate.oauth.google.client-id/client-secret)가 없으면 Composite가 호출하지 않는다.
 */
@Component
public class GoogleAuthClient implements SocialAuthClient {

    private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

    private final SocialOAuthProperties properties;
    private final RestClient rest = RestClient.create();

    public GoogleAuthClient(SocialOAuthProperties properties) {
        this.properties = properties;
    }

    @Override
    @SuppressWarnings("unchecked")
    public SocialUserInfo verify(AuthProvider provider, String authorizationCode, String redirectUri) {
        try {
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("client_id", properties.google().clientId());
            form.add("client_secret", properties.google().clientSecret());
            form.add("redirect_uri", redirectUri);
            form.add("grant_type", "authorization_code");
            form.add("code", authorizationCode);

            Map<String, Object> token = rest.post().uri(TOKEN_URL)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form).retrieve().body(Map.class);
            String accessToken = token == null ? null : (String) token.get("access_token");
            if (accessToken == null) {
                throw new BusinessException(ErrorCode.SOCIAL_AUTH_FAILED);
            }

            Map<String, Object> info = rest.get().uri(USERINFO_URL)
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve().body(Map.class);
            if (info == null || info.get("sub") == null) {
                throw new BusinessException(ErrorCode.SOCIAL_AUTH_FAILED);
            }

            String providerId = String.valueOf(info.get("sub"));
            String email = (String) info.get("email");
            if (email == null || email.isBlank()) {
                email = "google_" + providerId + "@google.sortmate.app";
            }
            String displayName = (String) info.getOrDefault("name", "구글 사용자");
            return new SocialUserInfo(providerId, email, displayName);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.SOCIAL_AUTH_FAILED);
        }
    }
}
