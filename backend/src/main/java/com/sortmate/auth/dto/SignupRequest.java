package com.sortmate.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** AUTH-08 이메일 회원가입 요청. */
public record SignupRequest(
        @NotBlank(message = "email은 필수입니다.")
        @Email(message = "email 형식이 올바르지 않습니다.")
        String email,
        @NotBlank(message = "password는 필수입니다.")
        String password,
        @NotNull(message = "agreedToTerms는 필수입니다.")
        Boolean agreedToTerms
) {
}
