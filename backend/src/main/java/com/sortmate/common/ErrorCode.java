package com.sortmate.common;

import org.springframework.http.HttpStatus;

/**
 * 계약(_workspace/contracts/auth.md)에 정의된 에러 코드를 빠짐없이 담는다.
 */
public enum ErrorCode {

    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "요청 값이 유효하지 않습니다."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."),
    TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "토큰이 만료되었습니다."),
    TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "토큰이 유효하지 않습니다."),
    RESET_TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "재설정 토큰이 무효하거나 만료되었습니다."),
    RECOVERY_CODE_INVALID(HttpStatus.UNAUTHORIZED, "복구 코드가 올바르지 않습니다."),
    PASSWORD_POLICY_VIOLATION(HttpStatus.UNPROCESSABLE_ENTITY, "비밀번호가 정책을 충족하지 않습니다."),
    PASSWORD_MISMATCH(HttpStatus.UNPROCESSABLE_ENTITY, "새 비밀번호와 확인이 일치하지 않습니다."),
    RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "요청 횟수가 초과되었습니다."),
    SOCIAL_AUTH_FAILED(HttpStatus.BAD_GATEWAY, "소셜 인증에 실패했습니다."),

    // ── item 모듈 (contracts/item.md) ──────────────────────────
    ITEM_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 아이템입니다."),
    ITEM_FORBIDDEN(HttpStatus.FORBIDDEN, "해당 아이템에 접근할 권한이 없습니다."),
    FILE_TOO_LARGE(HttpStatus.PAYLOAD_TOO_LARGE, "업로드 파일 크기가 허용치를 초과했습니다."),
    UNSUPPORTED_MEDIA_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "허용되지 않은 파일 형식입니다."),
    BULK_PARTIAL_FAILURE(HttpStatus.UNPROCESSABLE_ENTITY, "일괄 작업 중 일부가 실패했습니다."),

    // ── cleanup 모듈 (contracts/cleanup.md) ────────────────────
    CLEANUP_GROUP_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 중복 그룹입니다."),
    CLEANUP_GROUP_ALREADY_RESOLVED(HttpStatus.CONFLICT, "이미 처리된 중복 그룹입니다."),

    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다.");

    private final HttpStatus status;
    private final String defaultMessage;

    ErrorCode(HttpStatus status, String defaultMessage) {
        this.status = status;
        this.defaultMessage = defaultMessage;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getDefaultMessage() {
        return defaultMessage;
    }
}
