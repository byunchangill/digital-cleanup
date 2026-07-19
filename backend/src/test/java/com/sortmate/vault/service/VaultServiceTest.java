package com.sortmate.vault.service;

import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import com.sortmate.item.entity.Item;
import com.sortmate.item.entity.ItemType;
import com.sortmate.item.repository.ItemRepository;
import com.sortmate.vault.dto.VaultDtos.PinSetRequest;
import com.sortmate.vault.dto.VaultDtos.PrivacyUpdateRequest;
import com.sortmate.vault.dto.VaultDtos.UnlockResponse;
import com.sortmate.vault.entity.VaultConfig;
import com.sortmate.vault.repository.AccountDeletionRequestRepository;
import com.sortmate.vault.repository.PrivacySettingsRepository;
import com.sortmate.vault.repository.VaultConfigRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VaultServiceTest {

    @Mock private VaultConfigRepository vaultConfigRepository;
    @Mock private PrivacySettingsRepository privacySettingsRepository;
    @Mock private AccountDeletionRequestRepository deletionRequestRepository;
    @Mock private ItemRepository itemRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private VaultTokenService vaultTokenService;

    @InjectMocks private VaultService service;

    private static final long USER = 1L;

    private VaultConfig configWithPin() {
        VaultConfig config = new VaultConfig(USER);
        config.setPin("HASH"); // pinHash 세팅(matches는 mock으로 제어)
        return config;
    }

    // ── VAULT-01 ──────────────────────────────────────────────
    @Test
    @DisplayName("PIN 최초 설정: currentPin 없이 성공, 해시 저장")
    void setPinFirstTime() {
        when(vaultConfigRepository.findByUserId(USER)).thenReturn(Optional.empty());
        when(vaultConfigRepository.save(any(VaultConfig.class))).thenAnswer(inv -> inv.getArgument(0));
        when(passwordEncoder.encode("123456")).thenReturn("HASH");

        var res = service.setPin(USER, new PinSetRequest("123456", null, null));

        assertThat(res.pinSet()).isTrue();
        assertThat(res.pinSetAt()).isNotNull();
    }

    @Test
    @DisplayName("PIN 변경: 이미 설정됐는데 currentPin 미제공이면 PIN_ALREADY_SET")
    void changePinNoCurrent() {
        when(vaultConfigRepository.findByUserId(USER)).thenReturn(Optional.of(configWithPin()));

        assertThatThrownBy(() -> service.setPin(USER, new PinSetRequest("654321", null, null)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PIN_ALREADY_SET);
    }

    @Test
    @DisplayName("PIN 변경: currentPin 불일치면 PIN_INVALID")
    void changePinWrongCurrent() {
        when(vaultConfigRepository.findByUserId(USER)).thenReturn(Optional.of(configWithPin()));
        when(passwordEncoder.matches("000000", "HASH")).thenReturn(false);

        assertThatThrownBy(() -> service.setPin(USER, new PinSetRequest("654321", "000000", null)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PIN_INVALID);
    }

    // ── VAULT-03 ──────────────────────────────────────────────
    @Test
    @DisplayName("unlock 성공: 세션 토큰 발급, 실패 카운트 리셋")
    void unlockSuccess() {
        VaultConfig config = configWithPin();
        when(vaultConfigRepository.findByUserId(USER)).thenReturn(Optional.of(config));
        when(passwordEncoder.matches("123456", "HASH")).thenReturn(true);
        when(vaultTokenService.issue(USER)).thenReturn("TOKEN");

        UnlockResponse res = service.unlock(USER, "123456");

        assertThat(res.vaultToken()).isEqualTo("TOKEN");
        assertThat(res.tokenType()).isEqualTo("Vault");
        assertThat(res.expiresIn()).isEqualTo(VaultTokenService.TTL_SECONDS);
    }

    @Test
    @DisplayName("unlock: PIN 미설정 상태면 VALIDATION_ERROR")
    void unlockNoPin() {
        when(vaultConfigRepository.findByUserId(USER)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.unlock(USER, "123456"))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    @DisplayName("unlock: PIN 불일치면 PIN_INVALID")
    void unlockWrongPin() {
        when(vaultConfigRepository.findByUserId(USER)).thenReturn(Optional.of(configWithPin()));
        when(passwordEncoder.matches("999999", "HASH")).thenReturn(false);

        assertThatThrownBy(() -> service.unlock(USER, "999999"))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PIN_INVALID);
    }

    @Test
    @DisplayName("unlock: 5회 연속 실패 시 잠금(VAULT_LOCKED_OUT)")
    void unlockLockout() {
        VaultConfig config = configWithPin();
        when(vaultConfigRepository.findByUserId(USER)).thenReturn(Optional.of(config));
        when(passwordEncoder.matches("999999", "HASH")).thenReturn(false);

        // 4회는 PIN_INVALID, 5회째 잠금.
        for (int i = 0; i < 4; i++) {
            assertThatThrownBy(() -> service.unlock(USER, "999999"))
                    .extracting("errorCode").isEqualTo(ErrorCode.PIN_INVALID);
        }
        assertThatThrownBy(() -> service.unlock(USER, "999999"))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VAULT_LOCKED_OUT);
        assertThat(config.isLockedOut()).isTrue();
    }

    // ── VAULT-04 ──────────────────────────────────────────────
    @Test
    @DisplayName("열람: 세션 무효면 VAULT_LOCKED (아이템 조회 전 차단)")
    void readLocked() {
        org.mockito.Mockito.doThrow(new BusinessException(ErrorCode.VAULT_LOCKED))
                .when(vaultTokenService).requireUnlocked("bad", USER);

        assertThatThrownBy(() -> service.readVaultItem(USER, 5L, "bad"))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VAULT_LOCKED);
    }

    @Test
    @DisplayName("열람: vaulted=false 아이템이면 ITEM_NOT_VAULTED")
    void readNotVaulted() {
        Item plain = Item.builder().ownerId(USER).type(ItemType.MEMO).title("t").vaulted(false).build();
        ReflectionTestUtils.setField(plain, "id", 5L);
        when(itemRepository.findByIdAndOwnerId(5L, USER)).thenReturn(Optional.of(plain));

        assertThatThrownBy(() -> service.readVaultItem(USER, 5L, "ok"))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.ITEM_NOT_VAULTED);
    }

    @Test
    @DisplayName("열람: vaulted 아이템은 마스킹 없이 원본 URL 노출")
    void readUnmasked() {
        Item secret = Item.builder().ownerId(USER).type(ItemType.IMAGE).title("신분증")
                .vaulted(true).thumbnailUrl("/o/thumb").fileUrl("/o/original")
                .aiSummary("요약").build();
        ReflectionTestUtils.setField(secret, "id", 5L);
        when(itemRepository.findByIdAndOwnerId(5L, USER)).thenReturn(Optional.of(secret));

        var wrapper = service.readVaultItem(USER, 5L, "ok");

        assertThat(wrapper.item().thumbnailUrl()).isEqualTo("/o/thumb");
        assertThat(wrapper.item().fileUrl()).isEqualTo("/o/original");
        assertThat(wrapper.item().aiSummary()).isEqualTo("요약");
    }

    // ── VAULT-06 ──────────────────────────────────────────────
    @Test
    @DisplayName("프라이버시 변경: 빈 바디면 VALIDATION_ERROR")
    void updatePrivacyEmpty() {
        assertThatThrownBy(() -> service.updatePrivacy(USER,
                new PrivacyUpdateRequest(null, null, null)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    // ── VAULT-07 ──────────────────────────────────────────────
    @Test
    @DisplayName("삭제 요청: 기존 PENDING 있으면 재사용(멱등)")
    void deletionIdempotent() {
        var existing = new com.sortmate.vault.entity.AccountDeletionRequest(USER, null);
        when(deletionRequestRepository.findByUserIdAndStatus(eq(USER), any()))
                .thenReturn(Optional.of(existing));

        var res = service.requestDeletion(USER);

        assertThat(res.status()).isEqualTo("PENDING");
    }
}
