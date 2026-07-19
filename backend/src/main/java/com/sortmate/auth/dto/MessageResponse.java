package com.sortmate.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * 메시지 응답. AUTH-04/06은 message만, AUTH-05는 message + nextRoute.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record MessageResponse(
        String message,
        String nextRoute
) {
    public static MessageResponse of(String message) {
        return new MessageResponse(message, null);
    }

    public static MessageResponse of(String message, String nextRoute) {
        return new MessageResponse(message, nextRoute);
    }
}
