package com.sortmate.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sortmate.auth.entity.User;

/**
 * 로그인 응답의 user 객체.
 * isNewUser는 소셜 로그인(AUTH-01)에만 포함되므로 null이면 직렬화에서 제외한다.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record UserResponse(
        Long id,
        String email,
        String displayName,
        String provider,
        Boolean isNewUser
) {
    public static UserResponse of(User user, Boolean isNewUser) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getProvider().name(),
                isNewUser
        );
    }

    public static UserResponse of(User user) {
        return of(user, null);
    }
}
