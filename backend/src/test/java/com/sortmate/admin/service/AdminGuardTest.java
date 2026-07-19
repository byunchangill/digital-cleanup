package com.sortmate.admin.service;

import com.sortmate.auth.entity.AuthProvider;
import com.sortmate.auth.entity.Role;
import com.sortmate.auth.entity.User;
import com.sortmate.auth.repository.UserRepository;
import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminGuardTest {

    @Mock private UserRepository userRepository;
    @InjectMocks private AdminGuard guard;

    private static Authentication authOf(String subject) {
        return new UsernamePasswordAuthenticationToken(subject, null);
    }

    private static User userWithRole(Role role) {
        return User.builder()
                .email("u@sortmate.app").displayName("u").provider(AuthProvider.EMAIL)
                .role(role).build();
    }

    @Test
    @DisplayName("ADMIN 사용자는 통과")
    void adminPasses() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(userWithRole(Role.ADMIN)));
        guard.requireAdmin(authOf("1")); // no throw
    }

    @Test
    @DisplayName("role=USER는 403 ADMIN_REQUIRED")
    void nonAdminRejected() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(userWithRole(Role.USER)));
        assertThatThrownBy(() -> guard.requireAdmin(authOf("2")))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.ADMIN_REQUIRED);
    }

    @Test
    @DisplayName("인증 주체 없음/비숫자 subject는 TOKEN_INVALID")
    void missingOrBadSubject() {
        assertThat(catchCode(() -> guard.requireAdmin(null))).isEqualTo(ErrorCode.TOKEN_INVALID);
        assertThat(catchCode(() -> guard.requireAdmin(authOf("abc")))).isEqualTo(ErrorCode.TOKEN_INVALID);
    }

    private static ErrorCode catchCode(Runnable r) {
        try {
            r.run();
            throw new AssertionError("expected BusinessException");
        } catch (BusinessException e) {
            return e.getErrorCode();
        }
    }
}
