package com.sortmate.vault.service;

import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import com.sortmate.item.entity.Item;
import com.sortmate.item.repository.ItemRepository;
import com.sortmate.vault.dto.VaultDtos.DeletionResponse;
import com.sortmate.vault.dto.VaultDtos.PinSetRequest;
import com.sortmate.vault.dto.VaultDtos.PinSetResponse;
import com.sortmate.vault.dto.VaultDtos.PrivacyResponse;
import com.sortmate.vault.dto.VaultDtos.PrivacyUpdateRequest;
import com.sortmate.vault.dto.VaultDtos.UnlockResponse;
import com.sortmate.vault.dto.VaultDtos.VaultItem;
import com.sortmate.vault.dto.VaultDtos.VaultItemWrapper;
import com.sortmate.vault.dto.VaultDtos.VaultStatusResponse;
import com.sortmate.vault.entity.AccountDeletionRequest;
import com.sortmate.vault.entity.DeletionStatus;
import com.sortmate.vault.entity.PrivacySettings;
import com.sortmate.vault.entity.VaultConfig;
import com.sortmate.vault.repository.AccountDeletionRequestRepository;
import com.sortmate.vault.repository.PrivacySettingsRepository;
import com.sortmate.vault.repository.VaultConfigRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class VaultService {

    /** 연속 실패 임계치·잠금 시간(vault.md 가정). */
    static final int MAX_ATTEMPTS = 5;
    static final long LOCKOUT_SECONDS = 300;
    /** 계정 삭제 유예 기간(가정). */
    static final long PURGE_GRACE_DAYS = 30;

    private final VaultConfigRepository vaultConfigRepository;
    private final PrivacySettingsRepository privacySettingsRepository;
    private final AccountDeletionRequestRepository deletionRequestRepository;
    private final ItemRepository itemRepository;
    private final PasswordEncoder passwordEncoder;
    private final VaultTokenService vaultTokenService;

    public VaultService(VaultConfigRepository vaultConfigRepository,
                        PrivacySettingsRepository privacySettingsRepository,
                        AccountDeletionRequestRepository deletionRequestRepository,
                        ItemRepository itemRepository,
                        PasswordEncoder passwordEncoder,
                        VaultTokenService vaultTokenService) {
        this.vaultConfigRepository = vaultConfigRepository;
        this.privacySettingsRepository = privacySettingsRepository;
        this.deletionRequestRepository = deletionRequestRepository;
        this.itemRepository = itemRepository;
        this.passwordEncoder = passwordEncoder;
        this.vaultTokenService = vaultTokenService;
    }

    // ── VAULT-01 PIN 설정/변경 ─────────────────────────────────
    @Transactional
    public PinSetResponse setPin(Long userId, PinSetRequest req) {
        VaultConfig config = vaultConfigRepository.findByUserId(userId)
                .orElseGet(() -> vaultConfigRepository.save(new VaultConfig(userId)));

        if (config.hasPin()) {
            // 변경: 현재 PIN 검증 선행.
            if (req.currentPin() == null || req.currentPin().isBlank()) {
                throw new BusinessException(ErrorCode.PIN_ALREADY_SET);
            }
            if (!passwordEncoder.matches(req.currentPin(), config.getPinHash())) {
                throw new BusinessException(ErrorCode.PIN_INVALID);
            }
        }

        config.setPin(passwordEncoder.encode(req.newPin()));
        if (req.biometricEnabled() != null) {
            config.setBiometricEnabled(req.biometricEnabled());
        }
        return new PinSetResponse(true, config.isBiometricEnabled(), config.getPinSetAt());
    }

    // ── VAULT-02 상태 조회 ─────────────────────────────────────
    @Transactional(readOnly = true)
    public VaultStatusResponse status(Long userId, String vaultToken) {
        VaultConfig config = vaultConfigRepository.findByUserId(userId).orElse(null);
        if (config == null) {
            return new VaultStatusResponse(false, false, false, false, false, null);
        }
        boolean lockedOut = config.isLockedOut();
        return new VaultStatusResponse(
                config.hasPin(),
                config.isAppLockEnabled(),
                config.isBiometricEnabled(),
                vaultTokenService.isUnlocked(vaultToken, userId),
                lockedOut,
                lockedOut ? config.retryAfterSeconds() : null);
    }

    // ── VAULT-03 잠금 해제(세션 발급) ──────────────────────────
    // noRollbackFor: PIN 실패 시 recordFailure()로 증가한 failedAttempts/lockedUntil이
    // BusinessException(RuntimeException) throw로 롤백되면 잠금 통제가 무력화된다(QA-V01). 커밋 강제.
    @Transactional(noRollbackFor = BusinessException.class)
    public UnlockResponse unlock(Long userId, String pin) {
        VaultConfig config = vaultConfigRepository.findByUserId(userId)
                .filter(VaultConfig::hasPin)
                .orElseThrow(() -> new BusinessException(ErrorCode.VALIDATION_ERROR,
                        "PIN이 설정되지 않았습니다. 먼저 PIN을 설정하세요."));

        if (config.isLockedOut()) {
            throw new BusinessException(ErrorCode.VAULT_LOCKED_OUT,
                    "PIN 시도 초과. " + config.retryAfterSeconds() + "초 후 다시 시도하세요.");
        }

        if (!passwordEncoder.matches(pin, config.getPinHash())) {
            config.recordFailure(MAX_ATTEMPTS, LOCKOUT_SECONDS);
            if (config.isLockedOut()) {
                throw new BusinessException(ErrorCode.VAULT_LOCKED_OUT,
                        "PIN 시도 초과. " + config.retryAfterSeconds() + "초 후 다시 시도하세요.");
            }
            throw new BusinessException(ErrorCode.PIN_INVALID,
                    "PIN이 일치하지 않습니다. 남은 시도 " + (MAX_ATTEMPTS - config.getFailedAttempts()) + "회.");
        }

        config.recordSuccess();
        String token = vaultTokenService.issue(userId);
        return new UnlockResponse(token, "Vault", VaultTokenService.TTL_SECONDS);
    }

    // ── VAULT-04 마스킹 해제 열람 ──────────────────────────────
    @Transactional(readOnly = true)
    public VaultItemWrapper readVaultItem(Long userId, Long itemId, String vaultToken) {
        vaultTokenService.requireUnlocked(vaultToken, userId);
        Item item = itemRepository.findByIdAndOwnerId(itemId, userId)
                .orElseThrow(() -> itemRepository.existsById(itemId)
                        ? new BusinessException(ErrorCode.ITEM_FORBIDDEN)
                        : new BusinessException(ErrorCode.ITEM_NOT_FOUND));
        if (!item.isVaulted()) {
            throw new BusinessException(ErrorCode.ITEM_NOT_VAULTED);
        }
        return new VaultItemWrapper(VaultItem.of(item));
    }

    // ── VAULT-05 프라이버시 조회 ───────────────────────────────
    @Transactional
    public PrivacyResponse getPrivacy(Long userId) {
        return toPrivacyResponse(loadOrCreatePrivacy(userId));
    }

    // ── VAULT-06 프라이버시 변경 ───────────────────────────────
    @Transactional
    public PrivacyResponse updatePrivacy(Long userId, PrivacyUpdateRequest req) {
        if (req.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "변경할 필드가 최소 1개 필요합니다.");
        }
        PrivacySettings settings = loadOrCreatePrivacy(userId);
        if (req.aiTrainingConsent() != null) {
            settings.setAiTrainingConsent(req.aiTrainingConsent());
        }
        if (req.usageStatsSharing() != null) {
            settings.setUsageStatsSharing(req.usageStatsSharing());
        }
        if (req.personalizedSuggestions() != null) {
            settings.setPersonalizedSuggestions(req.personalizedSuggestions());
        }
        return toPrivacyResponse(settings);
    }

    // ── VAULT-07 계정 삭제 요청(멱등) ──────────────────────────
    @Transactional
    public DeletionResponse requestDeletion(Long userId) {
        AccountDeletionRequest req = deletionRequestRepository
                .findByUserIdAndStatus(userId, DeletionStatus.PENDING)
                .orElseGet(() -> deletionRequestRepository.save(new AccountDeletionRequest(
                        userId, Instant.now().plus(PURGE_GRACE_DAYS, ChronoUnit.DAYS))));
        return new DeletionResponse(req.getStatus().name(), req.getRequestedAt(), req.getScheduledPurgeAt());
    }

    // ── 내부 헬퍼 ──────────────────────────────────────────────
    private PrivacySettings loadOrCreatePrivacy(Long userId) {
        return privacySettingsRepository.findByUserId(userId)
                .orElseGet(() -> privacySettingsRepository.save(new PrivacySettings(userId)));
    }

    private PrivacyResponse toPrivacyResponse(PrivacySettings s) {
        return new PrivacyResponse(s.isAiTrainingConsent(), s.isUsageStatsSharing(), s.isPersonalizedSuggestions());
    }
}
