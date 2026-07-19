package com.sortmate.auth.service;

import com.sortmate.auth.dto.AuthTokenResponse;
import com.sortmate.auth.dto.EmailLoginRequest;
import com.sortmate.auth.dto.LoginResponse;
import com.sortmate.auth.dto.MessageResponse;
import com.sortmate.auth.dto.PasswordResetLinkRequest;
import com.sortmate.auth.dto.PasswordResetRequest;
import com.sortmate.auth.dto.RecoveryCodeRequest;
import com.sortmate.auth.dto.RecoveryCodeResponse;
import com.sortmate.auth.dto.SocialLoginRequest;
import com.sortmate.auth.dto.TokenRefreshRequest;
import com.sortmate.auth.dto.UserResponse;
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
import com.sortmate.auth.service.SocialAuthClient.SocialUserInfo;
import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final RecoveryCodeRepository recoveryCodeRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthTokenService authTokenService;
    private final PasswordPolicyValidator passwordPolicyValidator;
    private final SocialAuthClient socialAuthClient;

    private final long resetTokenTtlSeconds;
    private final long recoveryTokenTtlSeconds;

    public AuthService(UserRepository userRepository,
                       PasswordResetTokenRepository resetTokenRepository,
                       RecoveryCodeRepository recoveryCodeRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordEncoder passwordEncoder,
                       AuthTokenService authTokenService,
                       PasswordPolicyValidator passwordPolicyValidator,
                       SocialAuthClient socialAuthClient,
                       @Value("${app.reset-token.ttl-seconds:1800}") long resetTokenTtlSeconds,
                       @Value("${app.recovery-token.ttl-seconds:600}") long recoveryTokenTtlSeconds) {
        this.userRepository = userRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.recoveryCodeRepository = recoveryCodeRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.authTokenService = authTokenService;
        this.passwordPolicyValidator = passwordPolicyValidator;
        this.socialAuthClient = socialAuthClient;
        this.resetTokenTtlSeconds = resetTokenTtlSeconds;
        this.recoveryTokenTtlSeconds = recoveryTokenTtlSeconds;
    }

    // ── AUTH-01 소셜 로그인 ────────────────────────────────────────────────
    @Transactional
    public LoginResponse socialLogin(String providerPath, SocialLoginRequest request) {
        AuthProvider provider = parseSocialProvider(providerPath);
        SocialUserInfo info = socialAuthClient.verify(
                provider, request.authorizationCode(), request.redirectUri());

        Optional<User> existing = userRepository.findByProviderAndProviderId(provider, info.providerId());
        boolean isNewUser = existing.isEmpty();
        User user = existing.orElseGet(() -> userRepository.save(User.builder()
                .email(info.email())
                .displayName(info.displayName())
                .provider(provider)
                .providerId(info.providerId())
                .build()));

        AuthTokenResponse auth = authTokenService.issue(user);
        return new LoginResponse(auth, UserResponse.of(user, isNewUser));
    }

    // ── AUTH-02 이메일 로그인 ──────────────────────────────────────────────
    @Transactional
    public LoginResponse emailLogin(EmailLoginRequest request) {
        User user = userRepository.findByEmailAndProvider(request.email(), AuthProvider.EMAIL)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_CREDENTIALS));
        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }
        AuthTokenResponse auth = authTokenService.issue(user);
        return new LoginResponse(auth, UserResponse.of(user));
    }

    // ── AUTH-03 액세스 토큰 갱신 ───────────────────────────────────────────
    @Transactional
    public AuthTokenResponse refresh(TokenRefreshRequest request) {
        RefreshToken stored = refreshTokenRepository.findByToken(request.refreshToken())
                .orElseThrow(() -> new BusinessException(ErrorCode.TOKEN_INVALID));
        if (stored.isRevoked()) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
        if (stored.isExpired(Instant.now())) {
            throw new BusinessException(ErrorCode.TOKEN_EXPIRED);
        }
        User user = userRepository.findById(stored.getUserId())
                .orElseThrow(() -> new BusinessException(ErrorCode.TOKEN_INVALID));

        stored.revoke(); // 회전: 사용된 리프레시 토큰 폐기
        return authTokenService.issue(user);
    }

    // ── AUTH-04 비밀번호 재설정 링크 요청 (항상 성공: 계정 열거 방지) ───────
    @Transactional
    public MessageResponse requestPasswordResetLink(PasswordResetLinkRequest request) {
        issueResetLinkIfEmailAccount(request.email());
        return MessageResponse.of("재설정 링크가 발송되었습니다. 편지함을 확인해 주세요.");
    }

    // ── AUTH-06 계정 복구 - 이메일 매직 링크 (항상 성공) ───────────────────
    @Transactional
    public MessageResponse sendRecoveryEmail(PasswordResetLinkRequest request) {
        issueResetLinkIfEmailAccount(request.email());
        return MessageResponse.of("이메일로 복구 링크를 보냈습니다.");
    }

    // ── AUTH-05 새 비밀번호 설정 ───────────────────────────────────────────
    @Transactional
    public MessageResponse resetPassword(PasswordResetRequest request) {
        PasswordResetToken token = resetTokenRepository.findByToken(request.token())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESET_TOKEN_INVALID));
        if (!token.isValid(Instant.now())) {
            throw new BusinessException(ErrorCode.RESET_TOKEN_INVALID);
        }
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new BusinessException(ErrorCode.PASSWORD_MISMATCH);
        }
        passwordPolicyValidator.validate(request.newPassword());

        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESET_TOKEN_INVALID));
        user.updatePasswordHash(passwordEncoder.encode(request.newPassword()));
        token.markUsed();

        return MessageResponse.of("비밀번호가 성공적으로 업데이트되었습니다.", "/login");
    }

    // ── AUTH-07 계정 복구 - 복구 코드 검증 ─────────────────────────────────
    @Transactional
    public RecoveryCodeResponse verifyRecoveryCode(RecoveryCodeRequest request) {
        String normalized = normalizeRecoveryCode(request.recoveryCode());
        if (!normalized.matches("[A-Za-z0-9]{24}")) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "복구 코드는 24자 영숫자여야 합니다.");
        }

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BusinessException(ErrorCode.RECOVERY_CODE_INVALID));

        RecoveryCode matched = recoveryCodeRepository.findByUserIdAndUsedAtIsNull(user.getId()).stream()
                .filter(rc -> passwordEncoder.matches(normalized, rc.getCodeHash()))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.RECOVERY_CODE_INVALID));
        matched.markUsed();

        String recoveryToken = persistResetToken(user.getId(), ResetTokenType.RECOVERY, recoveryTokenTtlSeconds);
        return new RecoveryCodeResponse(recoveryToken, recoveryTokenTtlSeconds, "/password/new");
    }

    // ── 내부 헬퍼 ──────────────────────────────────────────────────────────

    private void issueResetLinkIfEmailAccount(String email) {
        userRepository.findByEmailAndProvider(email, AuthProvider.EMAIL)
                .ifPresent(user -> persistResetToken(user.getId(), ResetTokenType.RESET, resetTokenTtlSeconds));
        // 실제 이메일 발송은 인프라 연동 대상. 존재 여부와 무관하게 호출부는 성공 반환.
    }

    private String persistResetToken(Long userId, ResetTokenType type, long ttlSeconds) {
        String value = UUID.randomUUID().toString().replace("-", "")
                + UUID.randomUUID().toString().replace("-", "");
        PasswordResetToken token = PasswordResetToken.builder()
                .userId(userId)
                .token(value)
                .tokenType(type)
                .expiresAt(Instant.now().plusSeconds(ttlSeconds))
                .build();
        resetTokenRepository.save(token);
        return value;
    }

    private AuthProvider parseSocialProvider(String providerPath) {
        if (providerPath == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "지원하지 않는 provider입니다.");
        }
        switch (providerPath.toLowerCase(Locale.ROOT)) {
            case "kakao":
                return AuthProvider.KAKAO;
            case "google":
                return AuthProvider.GOOGLE;
            case "apple":
                return AuthProvider.APPLE;
            default:
                throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                        "지원하지 않는 provider입니다: " + providerPath);
        }
    }

    private String normalizeRecoveryCode(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.replaceAll("[\\s-]", "");
    }
}
