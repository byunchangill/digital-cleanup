package com.sortmate.auth.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * 보호 API용 Bearer 토큰 인증 필터. auth 엔드포인트는 permitAll이므로 실제 강제 대상은 이후 도메인.
 * 토큰이 없거나 검증 실패하면 인증을 세팅하지 않고 통과시키고, 인가 단계에서 401을 위임한다.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    /** 인증 실패 시 EntryPoint가 읽어 봉투 코드로 사용할 요청 속성 키. */
    public static final String AUTH_ERROR_ATTRIBUTE = "sortmate.authError";

    private final JwtProvider jwtProvider;

    public JwtAuthenticationFilter(JwtProvider jwtProvider) {
        this.jwtProvider = jwtProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                Claims claims = jwtProvider.parseAccessToken(token);
                var authentication = new UsernamePasswordAuthenticationToken(
                        claims.getSubject(), null, AuthorityUtils.NO_AUTHORITIES);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (com.sortmate.common.BusinessException ex) {
                // 만료/무효 구분 코드를 EntryPoint가 봉투로 내려주도록 요청에 스탬핑.
                SecurityContextHolder.clearContext();
                request.setAttribute(AUTH_ERROR_ATTRIBUTE, ex.getErrorCode());
            } catch (Exception ignored) {
                SecurityContextHolder.clearContext();
                request.setAttribute(AUTH_ERROR_ATTRIBUTE, com.sortmate.common.ErrorCode.TOKEN_INVALID);
            }
        }
        filterChain.doFilter(request, response);
    }
}
