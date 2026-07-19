package com.sortmate.auth.service;

import com.sortmate.auth.dto.AuthTokenResponse;
import com.sortmate.auth.dto.EmailLoginRequest;
import com.sortmate.auth.dto.LoginResponse;
import com.sortmate.auth.dto.PasswordResetLinkRequest;
import com.sortmate.auth.dto.PasswordResetRequest;
import com.sortmate.auth.dto.RecoveryCodeRequest;
import com.sortmate.auth.dto.RecoveryCodeResponse;
import com.sortmate.auth.dto.TokenRefreshRequest;
import com.sortmate.auth.entity.AuthProvider;
import com.sortmate.auth.entity.PasswordResetToken;
import com.sortmate.auth.entity.RecoveryCode;
import com.sortmate.auth.entity.RefreshToken;
import com.sortmate.auth.entity.ResetTokenType;
import com.sortmate.auth.entity.User;
import com.sortmate.auth.repository.PasswordResetTokenRepository;
import com.sortmate.auth.repository.RecoveryCodeRepository;
import com.sortmate.auth.repository.RefreshTokenRepository;
import com.sortmate.auth.repository.UserRepository;
import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordResetTokenRepository resetTokenRepository;
    @Mock private RecoveryCodeRepository recoveryCodeRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuthTokenService authTokenService;
    @Mock private SocialAuthClient socialAuthClient;

    private AuthService authService;

    private final PasswordPolicyValidator passwordPolicyValidator = new PasswordPolicyValidator();
    private static final AuthTokenResponse ISSUED =
            AuthTokenResponse.of("access.jwt", "refresh-token", 1800);

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository, resetTokenRepository, recoveryCodeRepository, refreshTokenRepository,
                passwordEncoder, authTokenService, passwordPolicyValidator, socialAuthClient,
                1800L, 600L);
    }

    private User emailUser(long id) {
        User user = User.builder()
                .email("demo@sortmate.app")
                .displayName("데모")
                .provider(AuthProvider.EMAIL)
                .passwordHash("$2a$hashed")
                .build();
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    // ── AUTH-02 ────────────────────────────────────────────────
    @Test
    @DisplayName("이메일 로그인: 비밀번호 일치 시 토큰과 사용자 정보를 반환한다")
    void emailLoginSuccess() {
        when(userRepository.findByEmailAndProvider("demo@sortmate.app", AuthProvider.EMAIL))
                .thenReturn(Optional.of(emailUser(1L)));
        when(passwordEncoder.matches(eq("pw"), anyString())).thenReturn(true);
        when(authTokenService.issue(any())).thenReturn(ISSUED);

        LoginResponse response = authService.emailLogin(new EmailLoginRequest("demo@sortmate.app", "pw"));

        assertThat(response.auth().accessToken()).isEqualTo("access.jwt");
        assertThat(response.user().email()).isEqualTo("demo@sortmate.app");
        assertThat(response.user().provider()).isEqualTo("EMAIL");
        assertThat(response.user().isNewUser()).isNull(); // 이메일 로그인은 isNewUser 미포함
    }

    @Test
    @DisplayName("이메일 로그인: 비밀번호 불일치 시 INVALID_CREDENTIALS")
    void emailLoginWrongPassword() {
        when(userRepository.findByEmailAndProvider(anyString(), eq(AuthProvider.EMAIL)))
                .thenReturn(Optional.of(emailUser(1L)));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        assertThatThrownBy(() -> authService.emailLogin(new EmailLoginRequest("demo@sortmate.app", "bad")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.INVALID_CREDENTIALS);
    }

    @Test
    @DisplayName("이메일 로그인: 계정 미존재 시 INVALID_CREDENTIALS (열거 방지)")
    void emailLoginNoUser() {
        when(userRepository.findByEmailAndProvider(anyString(), eq(AuthProvider.EMAIL)))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.emailLogin(new EmailLoginRequest("none@x.com", "pw")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.INVALID_CREDENTIALS);
    }

    // ── AUTH-08 회원가입 ───────────────────────────────────────
    @Test
    @DisplayName("회원가입: 성공 시 자동 로그인 토큰 + isNewUser=true, displayName=이메일 로컬파트")
    void signupSuccess() {
        when(userRepository.existsByEmail("new@sortmate.app")).thenReturn(false);
        when(userRepository.save(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            ReflectionTestUtils.setField(u, "id", 1L);
            return u;
        });
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$new");
        when(authTokenService.issue(any())).thenReturn(ISSUED);

        LoginResponse res = authService.signup(
                new com.sortmate.auth.dto.SignupRequest("new@sortmate.app", "GreenPine!Harbor42", true));

        assertThat(res.auth().accessToken()).isEqualTo("access.jwt");
        assertThat(res.user().isNewUser()).isTrue();
        assertThat(res.user().displayName()).isEqualTo("new");
    }

    @Test
    @DisplayName("회원가입: 약관 미동의면 TERMS_NOT_AGREED")
    void signupTermsNotAgreed() {
        assertThatThrownBy(() -> authService.signup(
                new com.sortmate.auth.dto.SignupRequest("new@sortmate.app", "GreenPine!Harbor42", false)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.TERMS_NOT_AGREED);
    }

    @Test
    @DisplayName("회원가입: 중복 이메일이면 EMAIL_ALREADY_EXISTS")
    void signupDuplicate() {
        when(userRepository.existsByEmail("dup@sortmate.app")).thenReturn(true);
        assertThatThrownBy(() -> authService.signup(
                new com.sortmate.auth.dto.SignupRequest("dup@sortmate.app", "GreenPine!Harbor42", true)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.EMAIL_ALREADY_EXISTS);
    }

    @Test
    @DisplayName("회원가입: 정책 위반이면 PASSWORD_POLICY_VIOLATION")
    void signupPolicyViolation() {
        when(userRepository.existsByEmail("new@sortmate.app")).thenReturn(false);
        assertThatThrownBy(() -> authService.signup(
                new com.sortmate.auth.dto.SignupRequest("new@sortmate.app", "short", true)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PASSWORD_POLICY_VIOLATION);
    }

    // ── AUTH-03 ────────────────────────────────────────────────
    @Test
    @DisplayName("토큰 갱신: 저장된 토큰 없으면 TOKEN_INVALID")
    void refreshTokenNotFound() {
        when(refreshTokenRepository.findByToken("x")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> authService.refresh(new TokenRefreshRequest("x")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.TOKEN_INVALID);
    }

    @Test
    @DisplayName("토큰 갱신: 만료된 토큰이면 TOKEN_EXPIRED")
    void refreshTokenExpired() {
        RefreshToken expired = RefreshToken.builder()
                .userId(1L).token("x")
                .expiresAt(Instant.now().minusSeconds(60))
                .build();
        when(refreshTokenRepository.findByToken("x")).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> authService.refresh(new TokenRefreshRequest("x")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.TOKEN_EXPIRED);
    }

    @Test
    @DisplayName("토큰 갱신: 유효하면 새 토큰을 발급하고 기존 토큰을 회전(폐기)한다")
    void refreshSuccess() {
        RefreshToken valid = RefreshToken.builder()
                .userId(1L).token("x")
                .expiresAt(Instant.now().plusSeconds(600))
                .build();
        when(refreshTokenRepository.findByToken("x")).thenReturn(Optional.of(valid));
        when(userRepository.findById(1L)).thenReturn(Optional.of(emailUser(1L)));
        when(authTokenService.issue(any())).thenReturn(ISSUED);

        AuthTokenResponse response = authService.refresh(new TokenRefreshRequest("x"));

        assertThat(response.accessToken()).isEqualTo("access.jwt");
        assertThat(valid.isRevoked()).isTrue();
    }

    // ── AUTH-04 ────────────────────────────────────────────────
    @Test
    @DisplayName("재설정 링크 요청: 계정이 없어도 성공 봉투를 반환한다(열거 방지)")
    void resetRequestAlwaysSuccess() {
        when(userRepository.findByEmailAndProvider(anyString(), eq(AuthProvider.EMAIL)))
                .thenReturn(Optional.empty());

        var response = authService.requestPasswordResetLink(new PasswordResetLinkRequest("ghost@x.com"));

        assertThat(response.message()).contains("재설정 링크");
        verify(resetTokenRepository, never()).save(any());
    }

    // ── AUTH-05 ────────────────────────────────────────────────
    @Test
    @DisplayName("새 비밀번호 설정: 토큰이 유효하지 않으면 RESET_TOKEN_INVALID")
    void resetPasswordInvalidToken() {
        when(resetTokenRepository.findByToken("t")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> authService.resetPassword(
                new PasswordResetRequest("t", "GreenPine!Harbor42", "GreenPine!Harbor42")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.RESET_TOKEN_INVALID);
    }

    @Test
    @DisplayName("새 비밀번호 설정: 확인 불일치면 PASSWORD_MISMATCH")
    void resetPasswordMismatch() {
        PasswordResetToken token = PasswordResetToken.builder()
                .userId(1L).token("t").tokenType(ResetTokenType.RESET)
                .expiresAt(Instant.now().plusSeconds(600)).build();
        when(resetTokenRepository.findByToken("t")).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> authService.resetPassword(
                new PasswordResetRequest("t", "GreenPine!Harbor42", "Different!Value99")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PASSWORD_MISMATCH);
    }

    @Test
    @DisplayName("새 비밀번호 설정: 정책 위반이면 PASSWORD_POLICY_VIOLATION")
    void resetPasswordPolicyViolation() {
        PasswordResetToken token = PasswordResetToken.builder()
                .userId(1L).token("t").tokenType(ResetTokenType.RESET)
                .expiresAt(Instant.now().plusSeconds(600)).build();
        when(resetTokenRepository.findByToken("t")).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> authService.resetPassword(
                new PasswordResetRequest("t", "short", "short")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PASSWORD_POLICY_VIOLATION);
    }

    @Test
    @DisplayName("새 비밀번호 설정: 성공 시 해시 갱신·토큰 사용처리, nextRoute=/login")
    void resetPasswordSuccess() {
        PasswordResetToken token = PasswordResetToken.builder()
                .userId(1L).token("t").tokenType(ResetTokenType.RESET)
                .expiresAt(Instant.now().plusSeconds(600)).build();
        User user = emailUser(1L);
        when(resetTokenRepository.findByToken("t")).thenReturn(Optional.of(token));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("GreenPine!Harbor42")).thenReturn("$2a$new");

        var response = authService.resetPassword(
                new PasswordResetRequest("t", "GreenPine!Harbor42", "GreenPine!Harbor42"));

        assertThat(response.nextRoute()).isEqualTo("/login");
        assertThat(user.getPasswordHash()).isEqualTo("$2a$new");
        assertThat(token.isUsed()).isTrue();
    }

    // ── AUTH-07 ────────────────────────────────────────────────
    @Test
    @DisplayName("복구 코드 검증: 형식(24자 영숫자) 위반이면 VALIDATION_ERROR")
    void recoveryCodeBadFormat() {
        assertThatThrownBy(() -> authService.verifyRecoveryCode(
                new RecoveryCodeRequest("demo@sortmate.app", "too-short")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    @DisplayName("복구 코드 검증: 코드 불일치면 RECOVERY_CODE_INVALID")
    void recoveryCodeMismatch() {
        User user = emailUser(1L);
        when(userRepository.findByEmail("demo@sortmate.app")).thenReturn(Optional.of(user));
        RecoveryCode stored = RecoveryCode.builder().userId(1L).codeHash("$2a$rc").build();
        when(recoveryCodeRepository.findByUserIdAndUsedAtIsNull(1L)).thenReturn(List.of(stored));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        assertThatThrownBy(() -> authService.verifyRecoveryCode(
                new RecoveryCodeRequest("demo@sortmate.app", "ABCD1234EFGH5678IJKL9012")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.RECOVERY_CODE_INVALID);
    }

    @Test
    @DisplayName("복구 코드 검증: 하이픈 무시하고 일치하면 recoveryToken을 발급한다")
    void recoveryCodeSuccess() {
        User user = emailUser(1L);
        when(userRepository.findByEmail("demo@sortmate.app")).thenReturn(Optional.of(user));
        RecoveryCode stored = RecoveryCode.builder().userId(1L).codeHash("$2a$rc").build();
        when(recoveryCodeRepository.findByUserIdAndUsedAtIsNull(1L)).thenReturn(List.of(stored));
        when(passwordEncoder.matches(eq("ABCD1234EFGH5678IJKL9012"), anyString())).thenReturn(true);

        RecoveryCodeResponse response = authService.verifyRecoveryCode(
                new RecoveryCodeRequest("demo@sortmate.app", "ABCD-1234-EFGH-5678-IJKL-9012"));

        assertThat(response.recoveryToken()).isNotBlank();
        assertThat(response.expiresIn()).isEqualTo(600);
        assertThat(response.nextRoute()).isEqualTo("/password/new");
        assertThat(stored.isUsed()).isTrue();
        verify(resetTokenRepository).save(any());
    }
}
