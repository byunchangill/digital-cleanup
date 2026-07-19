package com.sortmate.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sortmate.common.ApiResponse;
import com.sortmate.common.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * 미인증 요청을 계약대로 401 + ApiResponse 에러 봉투로 응답한다.
 * 필터가 만료/무효를 구분해 스탬핑한 코드가 있으면 그대로, 없으면(토큰 누락) TOKEN_INVALID.
 */
@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public JwtAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        Object stamped = request.getAttribute(JwtAuthenticationFilter.AUTH_ERROR_ATTRIBUTE);
        ErrorCode code = (stamped instanceof ErrorCode ec) ? ec : ErrorCode.TOKEN_INVALID;

        response.setStatus(code.getStatus().value()); // 둘 다 401
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(),
                ApiResponse.failure(code, code.getDefaultMessage()));
    }
}
