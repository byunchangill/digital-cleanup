package com.sortmate.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** AUTH-04 비밀번호 재설정 링크 요청 / AUTH-06 복구 이메일 발송 공용 */
public record PasswordResetLinkRequest(
        @NotBlank(message = "email은 필수입니다.")
        @Email(message = "이메일 형식이 올바르지 않습니다.")
        String email
) {
}
