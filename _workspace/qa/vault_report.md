# vault 모듈 QA 리포트 (2026-07-19)

> 기준: contracts/vault.md (VAULT-01~07) + contracts/item.md ITEM-13 갱신본(vaulted 공유 조건부 허용)
> 방식: 계약↔백엔드↔프론트 3자 교차 비교 + 동적 검증(최신 빌드 :8089 별도 기동, 스테일 8080 회피)
> 빌드: backend `gradlew.bat build` BUILD SUCCESSFUL(76 tests) / frontend `npm run build` 통과(122 modules)

## 요약(2차 재검증 후): 통과 23 / 실패 0 / 보류 0 / 관찰 2 → **최종 통과**

7 엔드포인트 + ITEM-13 공유 재설계 + 마스킹 경계 정합. QA-V01(PIN 잠금)은 2차 재검증에서 수정 확인.

### 재검증 결과 (수정본, 최신 빌드 :8090 별도 기동)
- **QA-V01 → 통과(FIXED)**: `VaultService.unlock:103`에 `@Transactional(noRollbackFor = BusinessException.class)` 적용 확인 → 실패 카운트가 예외 throw 시에도 커밋됨.
  - **동적 재현(수정 후)**: 잘못된 PIN 5회 → "남은 시도 **4→3→2→1**회" 정상 감소, **5번째 `429 VAULT_LOCKED_OUT`**("300초 후"), `status` `lockedOut:true`/`retryAfter:299`, 잠금 중 올바른 PIN(123456)도 `429`로 차단. 브루트포스 보호 정상 동작.
  - 백엔드 회귀 가드 신규(`VaultUnlockLockoutIntegrationTest`, 요청별 독립 트랜잭션 재현)로 재발 방지.

### (1차) 요약: 통과 22 / 실패 1 / 보류 0 / 관찰 2

---

## 실패 항목

### QA-V01 (HIGH): PIN 5회 실패 잠금(VAULT_LOCKED_OUT)이 전혀 동작하지 않음 — 무제한 PIN 시도 허용
- **상태: ✅ FIXED (2차 재검증 통과 — noRollbackFor 적용, 5회째 429/lockedOut:true 동적 확인)**
- **담당**: backend-dev
- **근거(계약)**: vault.md L31 `429 VAULT_LOCKED_OUT (PIN 연속 실패 초과)`, L102 VAULT-03 "연속 5회 초과". 브루트포스 방어용 보안 통제.
- **동적 재현**(:8089, 데모 계정): 잘못된 PIN 5회 연속 제출 →
  ```
  attempt 1: PIN_INVALID "남은 시도 4회." [401]
  attempt 2: PIN_INVALID "남은 시도 4회." [401]   ← 3회여야 함
  attempt 3: PIN_INVALID "남은 시도 4회." [401]
  attempt 4: PIN_INVALID "남은 시도 4회." [401]
  attempt 5: PIN_INVALID "남은 시도 4회." [401]   ← 429 VAULT_LOCKED_OUT 여야 함
  GET /api/vault/status → lockedOut:false, retryAfter:null   ← true/잔여초 여야 함
  올바른 PIN(123456) → 200 vaultToken 발급(잠금 안 걸림)
  ```
  매 시도가 "남은 시도 4회"(=5-1) 고정 → `failedAttempts`가 요청마다 0으로 리로드됨(비영속). 카운트가 누적되지 않아 잠금이 영원히 발동하지 않음.
- **근본 원인**: `VaultService.unlock(...)`이 `@Transactional`인데, `config.recordFailure()`로 `failedAttempts`를 증가시킨 **직후 `BusinessException`(RuntimeException)을 throw**한다. Spring 기본 정책상 RuntimeException 발생 시 트랜잭션을 **롤백**하므로, 증가된 `failedAttempts`가 DB에 flush되지 않고 폐기된다.
  - 파일: `backend/.../vault/service/VaultService.java:113-121`
    ```java
    if (!passwordEncoder.matches(pin, config.getPinHash())) {
        config.recordFailure(MAX_ATTEMPTS, LOCKOUT_SECONDS); // ← 이 변경이
        if (config.isLockedOut()) { throw new BusinessException(VAULT_LOCKED_OUT, ...); }
        throw new BusinessException(PIN_INVALID, ...);        // ← RuntimeException → 트랜잭션 롤백 → 변경 폐기
    }
    ```
  - 엔티티 로직(`VaultConfig.recordFailure` :110-116)은 정상. 문제는 영속화 경로.
- **왜 단위 테스트는 통과했나**: `VaultServiceTest`의 "5회 잠금"은 단일 테스트 트랜잭션/영속성 컨텍스트 안에서 **같은 관리 엔티티 인스턴스**를 반복 사용하므로 Java 객체 필드에 카운트가 누적되어 잠금이 발동. 실제 서비스는 요청마다 **독립 트랜잭션 + 재조회 + 롤백**이라 누적되지 않음 → 단위 테스트가 크로스-요청 동작을 못 잡은 케이스.
- **수정 방법(택1, 최소 diff)**:
  1. `unlock`에 `@Transactional(noRollbackFor = BusinessException.class)` 지정 — 실패 경로의 유일한 변경(recordFailure)이 커밋됨. (가장 작은 수정)
  2. 또는 실패 기록을 별도 `@Transactional(REQUIRES_NEW)` 헬퍼로 분리해 예외와 무관하게 커밋.
  3. 또는 recordFailure 직후 `vaultConfigRepository.saveAndFlush(config)` 후 throw(단, 같은 트랜잭션이면 롤백에 여전히 취약 → 1/2안 권장).
- **회귀 검증 요청**: 수정 후 5회 실패 → 5번째 429 VAULT_LOCKED_OUT, VAULT-02 `lockedOut:true`+`retryAfter>0`, 잠금 중 올바른 PIN도 429, 300초 후 해제. 성공 시 `recordSuccess`로 카운트 리셋(정상 경로는 커밋되므로 무관하나 함께 확인).

---

## 특별 확인 사항 결과

1. **ITEM-13 공유 규약 3자 정합 → 통과**
   - 백엔드: `ItemController.share`가 `X-Vault-Token` 헤더 수신 → `VaultTokenService.isUnlocked`로 판정 → `ItemService.share(ownerId, ids, vaultUnlocked)`. vaulted+세션없음 → `403 VAULT_LOCKED`(기존 400에서 변경), vaulted+세션있음 → 200, 비-vaulted → 항상 200.
   - **동적 확인**: 세션 없이 vaulted 공유 → `403 VAULT_LOCKED`; 세션(X-Vault-Token) 동봉 → `200 shareUrl`; 비-vaulted(id=1) 무세션 → `200`.
   - 프론트: `client.js:28-31` 요청 인터셉터가 유효 vaultToken을 모든 요청에 자동 동봉(공유 포함). `client.js:62` 응답 인터셉터가 `VAULT_LOCKED` 수신 시 `clearVaultToken()`(토큰 폐기). `SecretItemDetailPage.onShare`(:73)는 VAULT_LOCKED 시 "세션 만료" 토스트.
2. **vaultToken 라이프사이클 → 통과**
   - 발급(VAULT-03 성공 → `vaultApi.unlock`이 `setVaultToken(token, expiresIn)`), 동봉(client.js 인터셉터), 만료/무효 시 폐기(응답 인터셉터 clearVaultToken).
   - **동적**: bogus/만료 토큰으로 VAULT-04 → `403 VAULT_LOCKED`. `vaultToken.js:15-20` getVaultToken이 만료시각(`Date.now()<expiresAt`) 검사 후 무효면 null 반환 → 헤더 미동봉. TTL 300초 계약 일치.
3. **PIN 5회 실패 잠금 → 실패(QA-V01)**. 프론트(`PinEntryPage.jsx:63`)는 `VAULT_LOCKED_OUT`를 별도 메시지로 처리하도록 준비돼 있으나, 백엔드가 429를 절대 반환하지 않아 무효. 프론트 코드 자체는 정상.
4. **VAULT-04 마스킹 해제 vs ITEM-04 마스킹 유지 → 통과(경계 정확)**
   - **동적**: 동일 vaulted id에 대해 VAULT-04(+토큰) → thumbnailUrl `/media/demo/secret/thumb`·aiSummary 노출(17필드 전체). ITEM-04는 **토큰을 동봉해도** thumbnailUrl/fileUrl/aiSummary=null 마스킹 유지. 두 경로 경계 정확히 분리됨(ItemDto 마스킹 미변경 확인).
5. **vaultMock ↔ 백엔드 스키마 → 통과**(관찰 OBS-V02). 데모 PIN `123456` 일치. mock VAULT_ITEMS/status/privacy/deletion 필드셋이 VaultDtos와 일치.
6. **auth/item/home/cleanup 회귀 → 회귀 없음**
   - **동적**: `/api/home/dashboard` 200, `/api/cleanup/dashboard` 200, `/api/categories` 200, `/api/auth/login` 200.
   - `ItemService.share` 시그니처 변경(2인자→3인자)의 다른 호출부 파손 없음: `ItemController.share`만 호출(신규 3인자로 갱신). 비-vaulted 공유 정상(동적 200). `ItemController`가 `VaultTokenService` 주입(item→vault 단방향 의존, 순환 없음: VaultService는 ItemRepository만 의존).

---

## 통과 항목 (계약↔백엔드↔프론트)

- **엔드포인트 7종**: 경로/메서드 계약=VaultController=vaultApi.js 3자 일치. 인증 실패 → `401 TOKEN_INVALID` 봉투(동적).
- **VAULT-01**: newPin `^\d{6}$` 검증. 변경 시 currentPin 미제공 → `409 PIN_ALREADY_SET`, 불일치 → `401 PIN_INVALID`(동적 확인).
- **VAULT-02**: pinSet/appLock/biometric/unlocked/lockedOut/retryAfter. 무세션 unlocked:false, 세션 동봉 unlocked:true(동적).
- **VAULT-03**: 정상 200(vaultToken/tokenType:Vault/expiresIn:300), 형식오류 400, 불일치 401(남은시도 메시지).
- **VAULT-04**: 세션 200(마스킹 해제), 무/무효세션 403 VAULT_LOCKED. NOT_VAULTED/404/403 경로는 서비스 코드상 계약 일치(vaulted 아이템만 열람). subtitle/resolution=null·verified=false [가정] 필드 형상 유지.
- **VAULT-05/06**: privacy 3토글 기본값(true/false/true), PATCH 부분수정 200, 빈 바디 400(동적).
- **VAULT-07**: confirm:true → PENDING+requestedAt+scheduledPurgeAt(30일 후), confirm:false → 400, 멱등(동적).
- **ErrorCode**: PIN_INVALID(401)/VAULT_LOCKED(403)/PIN_ALREADY_SET(409)/ITEM_NOT_VAULTED(422)/VAULT_LOCKED_OUT(429) 전부 등재, GlobalExceptionHandler 봉투 변환.
- **라우팅**: App.jsx `/vault/unlock`, `/vault/items/:id`, `/my/privacy` 등록. ItemDetailPage(:32-34) vaulted → `/vault/items/:id` replace 리다이렉트(단일 초크포인트). SecretItemDetailPage 잠김 오버레이 → `/vault/unlock?next=...` 유도.
- **PinEntryPage**: getStatus pinSet 분기, 6자리 자동 제출, 미설정 시 setPin 후 unlock, VAULT_LOCKED_OUT 별도 메시지. next 복귀.

---

## 관찰 (수정 불요 / 저우선)

### OBS-V01: SecretItemDetailPage 공유 중 세션 만료 시 재잠금 UI 미갱신
- 세션 만료 후 "안전하게 공유" → 403 VAULT_LOCKED → 토큰은 폐기(client.js)되고 토스트 표시되나, 이미 렌더된 마스킹 해제 화면은 그대로 유지(자동 재잠금 오버레이/`/vault/unlock` 리다이렉트 없음). 민감 콘텐츠는 유효 세션 중 정상 로드된 것이라 즉각적 노출 위험은 낮음. 개선 시 onShare의 VAULT_LOCKED 분기에서 `goUnlock()` 호출 권장. (frontend-dev, 선택)

### OBS-V02: vaultMock VAULT_ITEMS id(5·9·100)가 실백엔드 vaulted id와 불일치
- mock은 데모용 고정 id(5/9/100), 실백엔드 시딩 vaulted 아이템 id는 다름(동적 확인 시 다른 id). mock 모드 전용 데이터라 실연동에 영향 없음(구조 일치). 조치 불요.
