package com.sortmate.auth.service;

import com.sortmate.auth.dto.AuthTokenResponse;
import com.sortmate.auth.entity.RefreshToken;
import com.sortmate.auth.entity.User;
import com.sortmate.auth.repository.RefreshTokenRepository;
import com.sortmate.auth.security.JwtProperties;
import com.sortmate.auth.security.JwtProvider;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

/**
 * accessToken(JWT) + refreshToken(불투명, DB 저장) 쌍을 발급/회전한다.
 */
@Service
public class AuthTokenService {

    private final JwtProvider jwtProvider;
    private final RefreshTokenRepository refreshTokenRepository;
    private final long refreshTokenTtlSeconds;

    public AuthTokenService(JwtProvider jwtProvider,
                            RefreshTokenRepository refreshTokenRepository,
                            JwtProperties jwtProperties) {
        this.jwtProvider = jwtProvider;
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshTokenTtlSeconds = jwtProperties.refreshTokenTtlSeconds();
    }

    /** 신규 accessToken + refreshToken 발급 */
    public AuthTokenResponse issue(User user) {
        String accessToken = jwtProvider.generateAccessToken(user);
        String refreshToken = createRefreshToken(user);
        return AuthTokenResponse.of(accessToken, refreshToken, jwtProvider.getAccessTokenTtlSeconds());
    }

    private String createRefreshToken(User user) {
        String value = UUID.randomUUID().toString().replace("-", "")
                + UUID.randomUUID().toString().replace("-", "");
        RefreshToken entity = RefreshToken.builder()
                .userId(user.getId())
                .token(value)
                .expiresAt(Instant.now().plusSeconds(refreshTokenTtlSeconds))
                .build();
        refreshTokenRepository.save(entity);
        return value;
    }
}
