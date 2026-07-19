package com.sortmate.vault.service;

import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VaultTokenServiceTest {

    private final VaultTokenService service = new VaultTokenService();

    @Test
    @DisplayName("발급된 토큰은 같은 사용자에게 유효")
    void issueThenValid() {
        String token = service.issue(1L);
        assertThat(service.isUnlocked(token, 1L)).isTrue();
    }

    @Test
    @DisplayName("다른 사용자의 토큰은 무효(사용자 바인딩)")
    void tokenBoundToUser() {
        String token = service.issue(1L);
        assertThat(service.isUnlocked(token, 2L)).isFalse();
    }

    @Test
    @DisplayName("null/미존재 토큰은 무효")
    void nullOrUnknownInvalid() {
        assertThat(service.isUnlocked(null, 1L)).isFalse();
        assertThat(service.isUnlocked("nope", 1L)).isFalse();
    }

    @Test
    @DisplayName("만료된 토큰은 무효")
    void expiredInvalid() throws Exception {
        String token = service.issue(1L);
        // 내부 세션(불변 record)을 과거 만료 시각의 새 인스턴스로 교체.
        @SuppressWarnings("unchecked")
        Map<String, Object> sessions = (Map<String, Object>) ReflectionTestUtils.getField(service, "sessions");
        Object session = sessions.get(token);
        var ctor = session.getClass().getDeclaredConstructor(Long.class, Instant.class);
        ctor.setAccessible(true);
        sessions.put(token, ctor.newInstance(1L, Instant.now().minusSeconds(1)));
        assertThat(service.isUnlocked(token, 1L)).isFalse();
    }

    @Test
    @DisplayName("requireUnlocked: 무효 토큰이면 VAULT_LOCKED")
    void requireUnlockedThrows() {
        assertThatThrownBy(() -> service.requireUnlocked("bad", 1L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VAULT_LOCKED);
    }
}
