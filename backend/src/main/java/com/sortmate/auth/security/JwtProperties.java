package com.sortmate.auth.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * app.jwt.* 설정 바인딩.
 */
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
        String secret,
        long accessTokenTtlSeconds,
        long refreshTokenTtlSeconds
) {
}
