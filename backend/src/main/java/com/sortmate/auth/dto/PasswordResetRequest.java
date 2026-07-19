package com.sortmate.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** AUTH-05 새 비밀번호 설정 (token = resetToken 또는 recoveryToken) */
public record PasswordResetRequest(
        @NotBlank(message = "token은 필수입니다.")
        String token,
        @NotBlank(message = "newPassword는 필수입니다.")
        String newPassword,
        @NotBlank(message = "confirmPassword는 필수입니다.")
        String confirmPassword
) {
}
