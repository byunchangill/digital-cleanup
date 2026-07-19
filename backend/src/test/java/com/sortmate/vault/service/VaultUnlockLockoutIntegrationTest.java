package com.sortmate.vault.service;

import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import com.sortmate.vault.entity.VaultConfig;
import com.sortmate.vault.repository.VaultConfigRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * QA-V01 회귀 가드: unlock의 실패 카운트가 예외 롤백에 살아남는지 실제 트랜잭션으로 검증.
 * Mockito 단위 테스트는 트랜잭션 경계가 없어(단일 Java 객체 누적) 이 버그를 못 잡는다 →
 * 요청별 독립 트랜잭션을 재현하려면 실 컨텍스트+실 리포지토리가 필요하다.
 * 테스트 메서드에 @Transactional을 걸지 않아 각 unlock 호출이 자체 트랜잭션으로 커밋/롤백된다.
 */
@SpringBootTest(properties = "app.seed-demo-data=false")
class VaultUnlockLockoutIntegrationTest {

    @Autowired private VaultService vaultService;
    @Autowired private VaultConfigRepository vaultConfigRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("실 트랜잭션: 5회 연속 실패 시 failedAttempts가 롤백되지 않고 누적되어 VAULT_LOCKED_OUT")
    void failureCountSurvivesRollback() {
        Long user = 987654L;
        VaultConfig config = new VaultConfig(user);
        config.setPin(passwordEncoder.encode("123456"));
        vaultConfigRepository.saveAndFlush(config);

        // 1~4회: PIN_INVALID. 각 호출은 독립 트랜잭션 — noRollbackFor 덕에 카운트가 커밋돼야 한다.
        for (int i = 0; i < 4; i++) {
            assertThatThrownBy(() -> vaultService.unlock(user, "999999"))
                    .isInstanceOf(BusinessException.class)
                    .extracting("errorCode").isEqualTo(ErrorCode.PIN_INVALID);
        }
        // 5회째: 잠금 발동.
        assertThatThrownBy(() -> vaultService.unlock(user, "999999"))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VAULT_LOCKED_OUT);

        // DB 재조회로 잠금 상태 확인(카운트가 롤백됐다면 여기서 실패).
        VaultConfig reloaded = vaultConfigRepository.findByUserId(user).orElseThrow();
        assertThat(reloaded.isLockedOut()).isTrue();
        assertThat(reloaded.retryAfterSeconds()).isGreaterThan(0);
    }
}
