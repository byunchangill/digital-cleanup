package com.sortmate.auth.service;

import com.sortmate.auth.entity.AuthProvider;
import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import org.springframework.stereotype.Component;

/**
 * [자율결정] 실제 OAuth 연동 부재로 스텁 구현.
 * - authorizationCode를 provider 사용자 고유 ID로 간주하여 결정적으로 계정을 매핑한다
 *   (동일 코드 재요청 시 동일 사용자 → isNewUser=false).
 * - "invalid"/"fail" 로 시작하는 코드는 provider 검증 실패로 간주해 SOCIAL_AUTH_FAILED를 던진다.
 * 운영 전환 시 provider별 토큰 교환/프로필 조회 구현체로 교체한다.
 */
@Component
public class StubSocialAuthClient implements SocialAuthClient {

    @Override
    public SocialUserInfo verify(AuthProvider provider, String authorizationCode, String redirectUri) {
        String normalized = authorizationCode == null ? "" : authorizationCode.trim();
        if (normalized.isEmpty() || normalized.startsWith("invalid") || normalized.startsWith("fail")) {
            throw new BusinessException(ErrorCode.SOCIAL_AUTH_FAILED);
        }
        String providerId = normalized;
        String slug = normalized.replaceAll("[^A-Za-z0-9]", "").toLowerCase();
        if (slug.isEmpty()) {
            slug = Integer.toHexString(normalized.hashCode());
        }
        String email = provider.name().toLowerCase() + "_" + slug + "@social.sortmate.app";
        String displayName = capitalize(provider.name()) + " 사용자";
        return new SocialUserInfo(providerId, email, displayName);
    }

    private String capitalize(String value) {
        return value.charAt(0) + value.substring(1).toLowerCase();
    }
}
