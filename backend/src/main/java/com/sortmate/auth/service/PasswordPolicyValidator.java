package com.sortmate.auth.service;

import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * AUTH-05 비밀번호 정책 검증 (서버측). 화면 근거 정책:
 * - 최소 12자
 * - 대문자 1개 이상 + 특수문자 1개 이상
 * - 흔한 패턴 금지 (123, password 등)
 * 위반 시 위반 항목을 message에 명시하여 PASSWORD_POLICY_VIOLATION 예외를 던진다.
 */
@Component
public class PasswordPolicyValidator {

    private static final int MIN_LENGTH = 12;
    private static final String SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:',.<>/?`~\"\\";
    private static final List<String> COMMON_PATTERNS = List.of(
            "123", "1234", "12345", "password", "qwerty", "abc", "111", "000", "admin", "sortmate"
    );

    public void validate(String password) {
        List<String> violations = collectViolations(password);
        if (!violations.isEmpty()) {
            throw new BusinessException(
                    ErrorCode.PASSWORD_POLICY_VIOLATION,
                    "비밀번호 정책 위반: " + String.join(" / ", violations));
        }
    }

    /** 위반 목록을 반환(빈 목록이면 통과). 테스트/재사용 목적. */
    public List<String> collectViolations(String password) {
        List<String> violations = new ArrayList<>();
        if (password == null || password.length() < MIN_LENGTH) {
            violations.add("최소 " + MIN_LENGTH + "자 이상");
        }
        if (password == null || password.chars().noneMatch(Character::isUpperCase)) {
            violations.add("대문자 1개 이상");
        }
        if (password == null || password.chars().noneMatch(c -> SPECIAL_CHARS.indexOf(c) >= 0)) {
            violations.add("특수문자 1개 이상");
        }
        if (password != null && containsCommonPattern(password)) {
            violations.add("흔한 패턴 금지");
        }
        return violations;
    }

    private boolean containsCommonPattern(String password) {
        String lower = password.toLowerCase();
        return COMMON_PATTERNS.stream().anyMatch(lower::contains);
    }
}
