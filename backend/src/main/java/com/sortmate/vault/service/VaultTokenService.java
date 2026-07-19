package com.sortmate.vault.service;

import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 볼트 세션(잠금 해제 상태)을 나타내는 단기 vaultToken을 발급/검증한다.
 * VAULT-03(unlock)과 ITEM-13(vaulted 공유) 양쪽에서 재사용한다(중복 구현 금지).
 *
 * ponytail: 인메모리 단일 인스턴스 스토어. 재시작 시 세션 소멸·다중 노드 미지원.
 * 다중 노드/영속 세션이 필요하면 Redis TTL 키로 교체.
 */
@Service
public class VaultTokenService {

    /** 볼트 세션 TTL(초). 계약 기본값 300. */
    public static final long TTL_SECONDS = 300;

    private final Map<String, Session> sessions = new ConcurrentHashMap<>();

    private record Session(Long userId, Instant expiresAt) {
    }

    /** VAULT-03 성공 시 호출. 새 vaultToken 발급. */
    public String issue(Long userId) {
        purgeExpired();
        String token = UUID.randomUUID().toString().replace("-", "");
        sessions.put(token, new Session(userId, Instant.now().plusSeconds(TTL_SECONDS)));
        return token;
    }

    /** 토큰이 해당 사용자의 유효(미만료) 세션인지. */
    public boolean isUnlocked(String token, Long userId) {
        if (token == null || token.isBlank()) {
            return false;
        }
        Session s = sessions.get(token);
        if (s == null) {
            return false;
        }
        if (s.expiresAt().isBefore(Instant.now())) {
            sessions.remove(token);
            return false;
        }
        return s.userId().equals(userId);
    }

    /** 유효하지 않으면 403 VAULT_LOCKED(공통 봉투). */
    public void requireUnlocked(String token, Long userId) {
        if (!isUnlocked(token, userId)) {
            throw new BusinessException(ErrorCode.VAULT_LOCKED);
        }
    }

    private void purgeExpired() {
        Instant now = Instant.now();
        sessions.values().removeIf(s -> s.expiresAt().isBefore(now));
    }
}
