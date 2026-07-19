package com.sortmate.common;

import lombok.Getter;

/**
 * 서비스 계층에서 던지는 비즈니스 예외. GlobalExceptionHandler가 봉투로 변환한다.
 */
@Getter
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getDefaultMessage());
        this.errorCode = errorCode;
    }

    public BusinessException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
