package com.sortmate.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** AUTH-07 복구 코드 검증 */
public record RecoveryCodeRequest(
        @NotBlank(message = "email은 필수입니다.")
        @Email(message = "이메일 형식이 올바르지 않습니다.")
        String email,
        @NotBlank(message = "recoveryCode는 필수입니다.")
        String recoveryCode
) {
}
