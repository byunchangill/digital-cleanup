# vault (시크릿 볼트) API 계약

> 변경: 2026-07-19 VAULT-07 유예/취소 정책 확정 — my 모듈 account_deletion_confirmation_my_009_2 화면이 "30일 유예 + 재로그인 취소" 근거 제공. 계정 삭제는 my에서 재정의하지 않고 VAULT-07 재사용.
> 모듈: vault · 작성일: 2026-07-19 · 대상 화면: app_lock_pin_entry_com_006, secret_item_detail_my_003(+_2), privacy_controls_my_002
> 공통 규격: 응답 봉투 `{ success, data, error }`, 필드 camelCase, 날짜 ISO 8601(UTC, 예 `2026-07-19T09:00:00Z`).
> 인증: 본 모듈 **모든 엔드포인트는 JWT 인증 필요** — `Authorization: Bearer {accessToken}`(auth 발급). 누락/만료 시 auth 계약의 `401 TOKEN_EXPIRED`/`401 TOKEN_INVALID` 봉투.
> 경계: Item의 `vaulted` 플래그 변경(입/출고)은 **item.ITEM-12** 소관. 본 계약은 **PIN·볼트 세션·마스킹 해제 열람·프라이버시 설정·삭제 요청**만 소유.

## 공통 규약

### 응답 봉투
- 성공: `{ "success": true, "data": { ... }, "error": null }`
- 실패: `{ "success": false, "data": null, "error": { "code": "STRING", "message": "STRING" } }`

### 볼트 세션 (잠금 해제 상태) — `[가정]`
- VAULT-03(PIN 검증) 성공 시 단기 **`vaultToken`**(불투명 문자열, 기본 TTL 300초) 발급.
- 마스킹 해제 열람(VAULT-04) 및 vaulted 관련 보호 동작은 요청 헤더 `X-Vault-Token: {vaultToken}`를 함께 전송.
- 토큰 부재/만료/무효 시 → **`403 VAULT_LOCKED`** (공통 봉투로 반환. auth QA-03 후속: vault AccessDeniedHandler가 봉투를 생성해야 함).
- JWT 자체가 없거나 만료면 vault 세션 이전에 `401`(auth) 우선.

### 공통 에러 코드
| HTTP | code | 발생 조건 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 요청 필드 형식/제약 위반(PIN이 6자리 숫자 아님 등) |
| 401 | `TOKEN_EXPIRED` / `TOKEN_INVALID` | JWT 인증 실패 (auth 계약 공유) |
| 401 | `PIN_INVALID` | PIN 불일치(잠금 해제/변경 시 현재 PIN 오류) |
| 403 | `VAULT_LOCKED` | 볼트 세션 없음/만료 상태로 마스킹 해제 열람 시도 |
| 404 | `ITEM_NOT_FOUND` | 존재하지 않는 아이템(열람) |
| 403 | `ITEM_FORBIDDEN` | 타 사용자 소유 아이템 접근 |
| 409 | `PIN_ALREADY_SET` | 최초 설정 호출인데 이미 PIN 존재(현재 PIN 없이 변경 시도) |
| 422 | `ITEM_NOT_VAULTED` | vaulted=false 아이템에 마스킹 해제 열람 시도 |
| 429 | `VAULT_LOCKED_OUT` | PIN 연속 실패 초과. `data`에 `retryAfter`(초) |

---

### VAULT-01: PIN 설정 / 변경
> 화면: app_lock_pin_entry. 최초 설정 시 `currentPin` 생략, 변경 시 필수.
- **Method/Path**: `POST /api/vault/pin`
- **인증**: 필요(JWT)
- **Request Body**:
```json
{
  "newPin": "string(필수, 정확히 6자리 숫자 ^\\d{6}$)",
  "currentPin": "string(선택 — 기존 PIN 존재 시 필수, ^\\d{6}$)",
  "biometricEnabled": "boolean(선택, 기본 유지) — 생체인증 사용 동의"
}
```
- **Response 200**:
```json
{ "success": true, "data": { "pinSet": true, "biometricEnabled": false, "pinSetAt": "2026-07-19T09:00:00Z" }, "error": null }
```
- **에러**: `400 VALIDATION_ERROR`(형식), `401 PIN_INVALID`(currentPin 불일치), `409 PIN_ALREADY_SET`(이미 설정됐는데 currentPin 미제공)

---

### VAULT-02: 볼트 상태 조회
> 화면: app_lock_pin_entry(설정 vs 입력 분기), secret_item_detail(잠김 여부). PIN 설정 여부·현재 세션 유무·생체 사용 여부.
- **Method/Path**: `GET /api/vault/status`
- **인증**: 필요(JWT)
- **Request**: 없음. (세션 유무 확인 위해 `X-Vault-Token` 선택적 동봉 가능)
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "pinSet": "boolean — PIN 설정 완료 여부(false면 설정 화면으로)",
    "appLockEnabled": "boolean",
    "biometricEnabled": "boolean",
    "unlocked": "boolean — 동봉한 vaultToken이 유효하면 true",
    "lockedOut": "boolean — 시도 초과 잠금 상태",
    "retryAfter": "number|null — lockedOut일 때 잔여 초"
  },
  "error": null
}
```
- **에러**: 없음(항상 200, 상태만 반환)

---

### VAULT-03: PIN 검증 → 볼트 잠금 해제(세션 발급)
> 화면: app_lock_pin_entry(6자리 입력 완료 시 자동 제출), secret_item_detail("탭하여 잠금 해제"). 생체인증도 클라이언트가 저장 PIN을 이 엔드포인트로 제출하여 귀결.
- **Method/Path**: `POST /api/vault/unlock`
- **인증**: 필요(JWT)
- **Request Body**:
```json
{ "pin": "string(필수, ^\\d{6}$)" }
```
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "vaultToken": "string — 마스킹 해제 열람용 단기 토큰",
    "tokenType": "Vault",
    "expiresIn": "number — vaultToken 만료 초(기본 300)"
  },
  "error": null
}
```
- **에러**:
  - `400 VALIDATION_ERROR`(6자리 아님)
  - `401 PIN_INVALID`(불일치 — 화면 shake 처리, 남은 시도는 클라이언트가 재조회하거나 body의 `error.message`로 안내)
  - `429 VAULT_LOCKED_OUT`(연속 5회 초과. `data.retryAfter` 대신 실패 응답이므로 `error.message`에 잔여 시간, 상태는 VAULT-02로 확인) `[가정]`
  - `409` 없음. PIN 미설정 상태에서 호출 시 `400 VALIDATION_ERROR`(먼저 VAULT-01)

---

### VAULT-04: 시크릿 아이템 마스킹 해제 열람
> 화면: secret_item_detail_my_003(이미지형), _2(문서형). 볼트 세션이 있어야 원본·AI요약·태그·메타를 반환. 세션 없으면 잠김 오버레이 유지(403).
- **Method/Path**: `GET /api/vault/items/{id}`
- **인증**: 필요(JWT) + 볼트 세션(`X-Vault-Token` 헤더 필수)
- **Request Headers**: `X-Vault-Token: {vaultToken}`
- **Response 200** (마스킹 해제된 전체 아이템):
```json
{
  "success": true,
  "data": {
    "item": {
      "id": "number",
      "type": "string(IMAGE|SCREENSHOT|LINK|DOCUMENT|MEMO)",
      "title": "string",
      "subtitle": "string|null — 예: '높은 중요도의 신분 확인 증명서'",
      "category": "string|null",
      "vaulted": true,
      "thumbnailUrl": "string — 마스킹 해제(원본 노출)",
      "fileUrl": "string|null — 원본 파일(이미지/PDF)",
      "aiSummary": "string|null — AI 분석 요약",
      "tags": ["string — AI 큐레이션 태그, 예: #금융"],
      "sourceApp": "string|null — 예: 스캐너 앱",
      "mimeType": "string|null — 예: image/jpeg, application/pdf",
      "fileSize": "number|null — bytes",
      "resolution": "string|null — 예: '3264 × 2448'(이미지형만)",
      "verified": "boolean — 화면 '인증됨' 배지",
      "expiryDate": "string(ISO 8601 date)|null — 자동 삭제/아카이브 예정(cleanup 소관)",
      "savedAt": "string(ISO 8601)"
    }
  },
  "error": null
}
```
- **에러**:
  - `403 VAULT_LOCKED`(vaultToken 없음/만료 — 잠김 상태 유지)
  - `404 ITEM_NOT_FOUND`
  - `403 ITEM_FORBIDDEN`(타 사용자 소유)
  - `422 ITEM_NOT_VAULTED`(vaulted=false 아이템 — 마스킹 대상 아님, 일반 item.ITEM-04 사용)
- **비고**:
  - `resolution`은 이미지형(my_003)에서만 채워지고 문서형(my_003_2)은 null. `subtitle`도 이미지형에서만 존재. `[가정]` 타입별 선택 필드.
  - `verified`는 화면 "인증됨"(문서형) 배지. 근거 약함 → 미구현 시 false 고정 가능. `[가정]`
  - 자동 삭제 문구(90일/아카이브)는 `expiryDate` 기반 클라이언트 계산·표시. vault는 값만 전달, 정책은 cleanup 모듈.

---

### VAULT-05: 프라이버시 설정 조회
> 화면: privacy_controls. 3개 토글 현재값.
- **Method/Path**: `GET /api/vault/privacy`
- **인증**: 필요(JWT)
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "aiTrainingConsent": "boolean(기본 true) — 익명 데이터 AI 학습 허용",
    "usageStatsSharing": "boolean(기본 false) — 사용 통계 공유",
    "personalizedSuggestions": "boolean(기본 true) — 맞춤형 정리 제안"
  },
  "error": null
}
```
- **에러**: 없음(최초 조회 시 기본값으로 생성·반환)

---

### VAULT-06: 프라이버시 설정 변경 (부분 수정)
> 화면: privacy_controls 토글 변경 시 즉시 저장. 전달된 필드만 변경.
- **Method/Path**: `PATCH /api/vault/privacy`
- **인증**: 필요(JWT)
- **Request Body** (모든 필드 선택, 최소 1개):
```json
{
  "aiTrainingConsent": "boolean(선택)",
  "usageStatsSharing": "boolean(선택)",
  "personalizedSuggestions": "boolean(선택)"
}
```
- **Response 200**: VAULT-05와 동일 구조(변경 후 전체 값)
- **에러**: `400 VALIDATION_ERROR`(빈 바디)

---

### VAULT-07: 계정 데이터 삭제 요청
> 화면: privacy_controls "계정 탈퇴 요청". **즉시 영구 삭제가 아니라 요청 접수**(안전 규칙). 실제 파기는 유예 후 서버 배치.
- **Method/Path**: `POST /api/vault/account/deletion-request`
- **인증**: 필요(JWT)
- **Request Body**:
```json
{ "confirm": "boolean(필수, true) — 화면 확인 절차 통과 표식" }
```
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "status": "string(PENDING)",
    "requestedAt": "2026-07-19T09:00:00Z",
    "gracePeriodDays": 30,
    "scheduledPurgeAt": "string(ISO 8601) — 실제 파기 예정 = requestedAt + 30일"
  },
  "error": null
}
```
- **에러**: `400 VALIDATION_ERROR`(confirm 누락/false)
- **비고**: 유예 기간 **30일 확정**(my account_deletion_confirmation 화면 근거). `scheduledPurgeAt = requestedAt + 30일`. **취소 흐름 = 유예 기간 내 재로그인**(auth 세션 복원 시 계정 재활성화, 별도 cancel 엔드포인트 불요 — auth 소관). 재요청 시 기존 PENDING 재사용(멱등). my 모듈은 본 엔드포인트 재사용(신규 정의 없음).

---

## 엔드포인트 요약
| ID | Method | Path | 인증 | 볼트세션 |
|---|---|---|---|---|
| VAULT-01 | POST | `/api/vault/pin` | JWT | 불필요 |
| VAULT-02 | GET | `/api/vault/status` | JWT | 선택(확인용) |
| VAULT-03 | POST | `/api/vault/unlock` | JWT | 불필요(발급) |
| VAULT-04 | GET | `/api/vault/items/{id}` | JWT | **필수(X-Vault-Token)** |
| VAULT-05 | GET | `/api/vault/privacy` | JWT | 불필요 |
| VAULT-06 | PATCH | `/api/vault/privacy` | JWT | 불필요 |
| VAULT-07 | POST | `/api/vault/account/deletion-request` | JWT | 불필요 |

## item 계약 연동/변경 필요 (backend-dev · frontend-dev 통지)
- **일반 보관함으로 이동**(secret_item_detail): item.ITEM-12 `PUT /api/items/{id}/vault {vaulted:false}` 호출. 프론트는 **볼트 세션 활성 상태**에서만 호출(잠금 해제 후). 서버는 플래그만 처리(현행 유지).
- **[상충 → item 계약 수정 요망]** vaulted 아이템 공유: 화면(secret_item_detail "안전하게 공유")은 공유를 primary 액션으로 노출하나, item.ITEM-13 비고는 "vaulted 공유 불가(400)". **채택안 = 볼트 세션 활성 시 조건부 허용(만료형 안전 링크)**. item.ITEM-13 비고를 "vaulted는 볼트 세션 활성 시에만 공유 허용, 세션 없으면 403 VAULT_LOCKED"로 갱신 필요. 미합의 시 기본 차단으로 폴백. → item 계약 소유자와 협의 후 반영.
