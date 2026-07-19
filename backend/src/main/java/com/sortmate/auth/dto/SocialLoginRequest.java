package com.sortmate.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record SocialLoginRequest(
        @NotBlank(message = "authorizationCode는 필수입니다.")
        String authorizationCode,
        String redirectUri
) {
}
