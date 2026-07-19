# vault 모듈 백엔드 구현 완료 보고

> 모듈: vault · 작성일: 2026-07-19 · 작성자: backend-dev
> 기준: `_workspace/contracts/vault.md`, `_workspace/specs/vault.md`, `springboot-conventions`
> 빌드: `cd backend && gradlew.bat build` → **BUILD SUCCESSFUL (76 tests, 0 실패)**

## 구현 엔드포인트 (계약 7종 전부)

| ID | Method | Path | 볼트세션 | 구현 |
|---|---|---|---|---|
| VAULT-01 | POST | `/api/vault/pin` | 불필요 | ✅ 최초 설정/변경(currentPin 검증), biometricEnabled |
| VAULT-02 | GET | `/api/vault/status` | 선택 | ✅ pinSet/appLock/biometric/unlocked/lockedOut/retryAfter |
| VAULT-03 | POST | `/api/vault/unlock` | 발급 | ✅ PIN 검증→vaultToken(TTL 300s), 5회 실패 잠금 |
| VAULT-04 | GET | `/api/vault/items/{id}` | **필수(X-Vault-Token)** | ✅ 마스킹 해제 열람 |
| VAULT-05 | GET | `/api/vault/privacy` | 불필요 | ✅ 없으면 기본값 생성·반환 |
| VAULT-06 | PATCH | `/api/vault/privacy` | 불필요 | ✅ 부분 수정(빈 바디 400) |
| VAULT-07 | POST | `/api/vault/account/deletion-request` | 불필요 | ✅ PENDING 접수(멱등) |

## 핵심 설계

- **재사용 토큰 컴포넌트** `vault.service.VaultTokenService`: 인메모리 세션 스토어(token→{userId, expiresAt}). `issue()`/`isUnlocked()`/`requireUnlocked()`. VAULT-03·04와 **ITEM-13 공유 경로에서 공유**(중복 구현 없음).
- **403 VAULT_LOCKED는 공통 봉투로**: AccessDeniedHandler 대신 서비스에서 `BusinessException(VAULT_LOCKED)`를 던져 기존 `GlobalExceptionHandler`가 `{success,data,error}`로 변환 (auth QA-03 반영). 별도 필터 불필요.
- **PIN 저장**: BCrypt 해시(`PasswordEncoder` 재사용), 평문 미저장.
- **잠금 정책**: 연속 5회 실패 → 300초 `VAULT_LOCKED_OUT`. 성공 시 카운트 리셋.
- 신규 엔티티 3종: `VaultConfig`(user당 1), `PrivacySettings`(user당 1), `AccountDeletionRequest`.
- 공통 `ErrorCode`에 추가: `PIN_INVALID(401)`, `VAULT_LOCKED(403)`, `PIN_ALREADY_SET(409)`, `ITEM_NOT_VAULTED(422)`, `VAULT_LOCKED_OUT(429)`.

## 계약 대비 변경/기존 코드 수정

### ITEM-13 공유 경로 수정 (계약 확정 반영 — item 계약 소유자 통지 완료 전제)
- `ItemService.share(ownerId, ids)` → **`share(ownerId, ids, boolean vaultUnlocked)`** 로 시그니처 변경.
- vaulted 아이템 포함 시: **볼트 세션 활성이면 조건부 허용, 없으면 `403 VAULT_LOCKED`** (기존 `400 VALIDATION_ERROR`에서 변경 — 계약 ITEM-13 갱신본 준수).
- `ItemController.share`가 `X-Vault-Token` 헤더를 받아 `VaultTokenService.isUnlocked()`로 판정 후 서비스에 전달. **토큰 검증 로직은 vault 것을 재사용**(중복 구현 없음).
- 기존 `ItemServiceTest`의 share 테스트 2건을 새 시그니처/코드에 맞춰 갱신, 조건부 허용 케이스 1건 추가.

### item 마스킹은 그대로 유지
- `ItemDto`/`ItemDetailDto`의 vaulted 마스킹(ITEM-04)은 **미변경**. VAULT-04만 마스킹 해제 열람을 별도 제공.

## 데모 시딩
- `VaultDemoDataInitializer`(@Order 3, auth·item 시딩 후): 데모 유저(`demo@sortmate.app`)에 **PIN=`123456`** + 프라이버시 기본값 시딩.
- vaulted 아이템은 item 시딩("비밀 메모")으로 이미 존재. 하나도 없을 때만 대표 vaulted 아이템("신분증 스캔", IMAGE) 1건 보강.
- `app.seed-demo-data=false`로 비활성화 가능.

## 단위 테스트 (신규)
- `VaultTokenServiceTest`(5): 발급·유효, 사용자 바인딩, null/미존재, **만료 무효**, requireUnlocked 403.
- `VaultServiceTest`(11): PIN 최초설정/변경 PIN_ALREADY_SET/PIN_INVALID, unlock 성공/미설정/불일치/**5회 잠금**, VAULT-04 세션차단/NOT_VAULTED/**마스킹 해제 노출**, privacy 빈바디, 삭제 멱등.
- `ItemServiceTest`: 공유 vaulted **VAULT_LOCKED**(세션 없음) / 조건부 허용(세션 활성) / 정상.

## [가정] 목록
- **[가정] 볼트 세션 = 인메모리 vaultToken**: 재시작 시 세션 소멸, 다중 노드 미지원. 프로덕션은 Redis TTL 키로 교체(`VaultTokenService`에 `ponytail:` 주석). 데모/단일 노드에 충분.
- **[가정] 잠금 임계 5회 / 잠금 300초 / 삭제 유예 30일**: 계약이 값 미지정 → 합리적 기본값. `VaultService` 상수로 노출.
- **[가정] VAULT-04 `subtitle`/`resolution`=null, `verified`=false**: Item 엔티티에 해당 필드 없음(화면 근거 약한 계약 [가정] 필드). 계약이 미구현 시 false/null 허용 명시. 필드 자체는 응답에 존재(형상 유지).
- **[가정] VAULT-07 `requestedAt`**: 엔티티 @PrePersist에서 설정 → 응답에 ISO-8601로 반영.
- **[가정] 생체인증/수동 잠금 API 없음**: 명세대로 별도 엔드포인트 미생성(YAGNI).

## QA 수정 이력

### QA-V01 (HIGH) — PIN 5회 잠금 무력화 (2026-07-19 수정)
- **근본 원인**: `VaultService.unlock`이 기본 `@Transactional`이라, PIN 불일치 시 `config.recordFailure()`로 증가한 `failedAttempts`/`lockedUntil`이 곧이어 던지는 `BusinessException`(RuntimeException)의 기본 롤백 정책에 폐기됨 → 요청마다 카운트가 0으로 리로드되어 무한 시도 가능.
- **수정**: `@Transactional(noRollbackFor = BusinessException.class)`. 실패 기록이 커밋되고, 예외는 그대로 봉투로 반환. (REQUIRES_NEW 헬퍼 분리보다 1줄 수정이 최소 디프.)
- **회귀 가드 추가**: `VaultUnlockLockoutIntegrationTest`(@SpringBootTest, 테스트 메서드 비-@Transactional → 각 unlock이 독립 트랜잭션). 5회 실패 후 DB 재조회로 `lockedOut=true`·`retryAfter>0` 검증. **수정 전 코드에서 이 테스트가 FAIL함을 확인**(Mockito 단위 테스트는 트랜잭션 경계가 없어 못 잡던 버그를 재현).
- **라이브 서버 확인**(8081): 잘못된 PIN 5회 → `남은 시도 4→3→2→1회` 정상 감소, 5번째 **HTTP 429 VAULT_LOCKED_OUT**, `GET /status` → `lockedOut:true, retryAfter:299`, 잠금 중 올바른 PIN도 429로 차단.
- 빌드: **BUILD SUCCESSFUL (77 tests, 0 실패)**.

## 실행 방법
```
cd backend
gradlew.bat build      # 컴파일+테스트
gradlew.bat bootRun    # 8080 기동 (H2 in-memory, 데모 시딩 자동)
```
- 데모 흐름: auth로 `demo@sortmate.app` 로그인(비번 `GreenPine!Harbor42`) → `POST /api/vault/unlock {pin:"123456"}` → 응답 `vaultToken`을 `X-Vault-Token` 헤더로 `GET /api/vault/items/{vaulted-id}` 또는 `POST /api/items/share`에 동봉.
