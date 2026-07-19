package com.sortmate.auth.service;

import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PasswordPolicyValidatorTest {

    private final PasswordPolicyValidator validator = new PasswordPolicyValidator();

    @Test
    @DisplayName("정책을 모두 충족하면 통과한다")
    void validPassword() {
        assertThatCode(() -> validator.validate("GreenPine!Harbor42"))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("12자 미만이면 위반")
    void tooShort() {
        assertThat(validator.collectViolations("Ab!1"))
                .anyMatch(v -> v.contains("최소"));
    }

    @Test
    @DisplayName("대문자가 없으면 위반")
    void noUppercase() {
        assertThat(validator.collectViolations("greenpine!harbor42"))
                .anyMatch(v -> v.contains("대문자"));
    }

    @Test
    @DisplayName("특수문자가 없으면 위반")
    void noSpecialChar() {
        assertThat(validator.collectViolations("GreenPineHarbor42"))
                .anyMatch(v -> v.contains("특수문자"));
    }

    @Test
    @DisplayName("흔한 패턴(password/123)이 포함되면 위반")
    void commonPattern() {
        assertThat(validator.collectViolations("MyPassword!2026"))
                .anyMatch(v -> v.contains("흔한 패턴"));
    }

    @Test
    @DisplayName("위반 시 PASSWORD_POLICY_VIOLATION 예외를 던진다")
    void throwsOnViolation() {
        assertThatThrownBy(() -> validator.validate("short"))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.PASSWORD_POLICY_VIOLATION);
    }
}
