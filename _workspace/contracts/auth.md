# auth (인증) API 계약

> 변경: 2026-07-19 email_login_sign_up_com_004 분석 반영 — AUTH-02 경로는 구현 실체(`POST /api/auth/login`) 그대로 확정(2026-07-20 재확인: /login/email 정정은 오판이었음), AUTH-08(이메일 회원가입) 신규 추가. Forgot?→AUTH-04, 소셜→AUTH-01 재사용(계약 무변경).
> 모듈: auth · 작성일: 2026-07-19 · 대상 화면: login_com_003_2, email_login_sign_up_com_004, reset_password, set_new_password_com_007, account_recovery_com_008
> 공통 규격: 응답 봉투 `{ success, data, error }`, 필드 camelCase, 날짜 ISO 8601(UTC, 예 `2026-07-19T09:00:00Z`).

## 공통 규약

### 응답 봉투
- 성공: `{ "success": true, "data": { ... }, "error": null }`
- 실패: `{ "success": false, "data": null, "error": { "code": "STRING", "message": "STRING" } }`

### 인증 헤더
- 보호 API: `Authorization: Bearer {accessToken}` (JWT).
- **PIN 관련 필드는 auth 계약에 존재하지 않는다** (vault 모듈 소관). 상세는 specs/auth.md "인증 토큰 체계(JWT)" 참조.

### 토큰 페이로드 표준 (로그인/갱신 공통 `data.auth`)
```json
{
  "accessToken": "string(JWT)",
  "refreshToken": "string",
  "tokenType": "Bearer",
  "expiresIn": "number(accessToken 만료 초, 예 1800)"
}
```

### 공통 에러 코드
| HTTP | code | 발생 조건 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 요청 필드 형식/제약 위반 |
| 401 | `INVALID_CREDENTIALS` | 이메일/비밀번호 불일치 |
| 401 | `TOKEN_EXPIRED` | accessToken/refreshToken 만료 |
| 401 | `TOKEN_INVALID` | 토큰 서명/형식 오류 |
| 401 | `RESET_TOKEN_INVALID` | 재설정/복구 토큰 무효·만료·사용됨 |
| 401 | `RECOVERY_CODE_INVALID` | 복구 코드 불일치·사용됨 |
| 409 | `EMAIL_ALREADY_EXISTS` | 회원가입 시 이미 가입된 이메일 |
| 422 | `PASSWORD_POLICY_VIOLATION` | 비밀번호 정책 미충족 |
| 422 | `TERMS_NOT_AGREED` | 회원가입 약관 미동의 |
| 422 | `PASSWORD_MISMATCH` | 새 비밀번호 ≠ 확인 |
| 429 | `RATE_LIMITED` | 발송/시도 횟수 초과 |
| 502 | `SOCIAL_AUTH_FAILED` | 소셜 provider 인증 실패 |

---

### AUTH-01: 소셜 로그인 (카카오/구글/애플)
- **Method/Path**: `POST /api/auth/social/{provider}`  (`provider` = `kakao` | `google` | `apple`)
- **인증**: 불필요
- **Request Body**:
```json
{
  "authorizationCode": "string(필수) — provider OAuth 인가 코드",
  "redirectUri": "string(선택) — 인가 코드 발급에 사용한 redirect URI"
}
```
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "auth": {
      "accessToken": "string(JWT)",
      "refreshToken": "string",
      "tokenType": "Bearer",
      "expiresIn": 1800
    },
    "user": {
      "id": "number",
      "email": "string",
      "displayName": "string",
      "provider": "string(KAKAO|GOOGLE|APPLE)",
      "isNewUser": "boolean — 신규 가입 여부"
    }
  },
  "error": null
}
```
- **에러**: `400 VALIDATION_ERROR`(provider 미지원/코드 누락), `502 SOCIAL_AUTH_FAILED`(provider 검증 실패)

---

### AUTH-02: 이메일 로그인
> 화면: email_login_sign_up_com_004 LOGIN 탭(이메일+비밀번호). 필드 화면으로 확정.
> **경로 확정:** 구현·QA 통과된 실제 엔드포인트는 `POST /api/auth/login` (AuthController 확인, 2026-07-20).
- **Method/Path**: `POST /api/auth/login`
- **인증**: 불필요
- **Request Body**:
```json
{
  "email": "string(필수, 이메일 형식)",
  "password": "string(필수)"
}
```
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "auth": { "accessToken": "string(JWT)", "refreshToken": "string", "tokenType": "Bearer", "expiresIn": 1800 },
    "user": { "id": "number", "email": "string", "displayName": "string", "provider": "EMAIL" }
  },
  "error": null
}
```
- **에러**: `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`, `429 RATE_LIMITED`

---

### AUTH-03: 액세스 토큰 갱신  `[가정]`
> JWT 체계상 필수 인프라. 화면 근거 없음.
- **Method/Path**: `POST /api/auth/token/refresh`
- **인증**: 불필요 (refreshToken을 바디로 전달)
- **Request Body**:
```json
{ "refreshToken": "string(필수)" }
```
- **Response 200**:
```json
{
  "success": true,
  "data": { "accessToken": "string(JWT)", "refreshToken": "string", "tokenType": "Bearer", "expiresIn": 1800 },
  "error": null
}
```
- **에러**: `401 TOKEN_EXPIRED`, `401 TOKEN_INVALID`

---

### AUTH-04: 비밀번호 재설정 링크 요청
> 화면: reset_password. `[자율결정]` 계정 열거 방지 위해 이메일 존재 여부와 무관하게 항상 200 성공 반환.
- **Method/Path**: `POST /api/auth/password/reset-request`
- **인증**: 불필요
- **Request Body**:
```json
{ "email": "string(필수, 이메일 형식)" }
```
- **Response 200** (항상 성공 봉투, 계정 존재 여부 노출 안 함):
```json
{
  "success": true,
  "data": { "message": "재설정 링크가 발송되었습니다. 편지함을 확인해 주세요." },
  "error": null
}
```
- **에러**: `400 VALIDATION_ERROR`(이메일 형식 오류), `429 RATE_LIMITED`(발송 남용)

---

### AUTH-05: 새 비밀번호 설정 (토큰 기반)
> 화면: set_new_password_com_007. 진입 시 유효한 `resetToken`(AUTH-04) 또는 `recoveryToken`(AUTH-07) 필요.
- **Method/Path**: `POST /api/auth/password/reset`
- **인증**: 불필요 (본문 토큰으로 소유권 검증)
- **Request Body**:
```json
{
  "token": "string(필수) — resetToken 또는 recoveryToken",
  "newPassword": "string(필수, 최소 12자, 대문자 1개 이상 + 특수문자 1개 이상, 흔한 패턴 금지)",
  "confirmPassword": "string(필수, newPassword와 일치)"
}
```
- **Response 200**:
```json
{
  "success": true,
  "data": { "message": "비밀번호가 성공적으로 업데이트되었습니다.", "nextRoute": "/login" },
  "error": null
}
```
- **에러**: `401 RESET_TOKEN_INVALID`(무효·만료·사용됨), `422 PASSWORD_POLICY_VIOLATION`, `422 PASSWORD_MISMATCH`
- **비고**: 정책 위반 시 `error.message`에 위반 항목 명시 권장(최소 길이 / 대문자·특수문자 / 흔한 패턴). 강도 미터는 클라이언트 표시용으로 서버 검증과 무관.

---

### AUTH-06: 계정 복구 - 이메일 매직 링크 발송
> 화면: account_recovery_com_008 "이메일로 인증". `[자율결정]` AUTH-04와 구현 공유 가능하나 진입 맥락이 달라 별도 엔드포인트 유지.
- **Method/Path**: `POST /api/auth/recovery/email`
- **인증**: 불필요
- **Request Body**:
```json
{ "email": "string(필수, 이메일 형식)" }
```
- **Response 200** (계정 열거 방지 위해 항상 성공):
```json
{
  "success": true,
  "data": { "message": "이메일로 복구 링크를 보냈습니다." },
  "error": null
}
```
- **에러**: `400 VALIDATION_ERROR`, `429 RATE_LIMITED`

---

### AUTH-07: 계정 복구 - 복구 코드 검증
> 화면: account_recovery_com_008 "복구 코드로 인증" — 24자리 백업 키. 검증 성공 시 새 비밀번호 설정(AUTH-05)에 쓸 단기 `recoveryToken` 발급.
- **Method/Path**: `POST /api/auth/recovery/code`
- **인증**: 불필요
- **Request Body**:
```json
{
  "email": "string(필수, 이메일 형식) — 대상 계정 식별",
  "recoveryCode": "string(필수, 24자 영숫자, 하이픈/공백 무시)"
}
```
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "recoveryToken": "string — AUTH-05 token 필드로 사용",
    "expiresIn": 600,
    "nextRoute": "/password/new"
  },
  "error": null
}
```
- **에러**: `400 VALIDATION_ERROR`(형식 오류), `401 RECOVERY_CODE_INVALID`(불일치·사용됨), `429 RATE_LIMITED`(시도 횟수 초과)

---

### AUTH-08: 이메일 회원가입
> 화면: email_login_sign_up_com_004 SIGN UP 탭. 이메일+비밀번호+약관동의. 기존 PasswordPolicyValidator 재사용, 중복 이메일 409. 성공 시 자동 로그인(AUTH-02와 동일 토큰 봉투).
- **Method/Path**: `POST /api/auth/signup`
- **인증**: 불필요
- **Request Body**:
```json
{
  "email": "string(필수, 이메일 형식)",
  "password": "string(필수, PasswordPolicy: 최소 12자 + 대문자 1개 이상 + 특수문자 1개 이상, 흔한 패턴 금지)",
  "agreedToTerms": "boolean(필수, true여야 함) — TOS 체크박스"
}
```
- **Response 200** (가입 성공 → 자동 로그인, AUTH-02와 동일 구조):
```json
{
  "success": true,
  "data": {
    "auth": { "accessToken": "string(JWT)", "refreshToken": "string", "tokenType": "Bearer", "expiresIn": 1800 },
    "user": { "id": "number", "email": "string", "displayName": "string", "provider": "EMAIL", "isNewUser": true }
  },
  "error": null
}
```
- **에러**: `400 VALIDATION_ERROR`(형식 오류), `409 EMAIL_ALREADY_EXISTS`(중복 이메일), `422 PASSWORD_POLICY_VIOLATION`, `422 TERMS_NOT_AGREED`(agreedToTerms=false), `429 RATE_LIMITED`
- **비고**: `[가정]` 자동 로그인 — 화면에 가입→로그인 중간 단계 없음. `displayName`은 미입력 시 이메일 로컬파트로 초기화(`[가정]`). 비밀번호 정책 위반 시 `error.message`에 위반 항목 명시 권장(AUTH-05와 동일).

---

## 엔드포인트 요약
| ID | Method | Path | 인증 |
|---|---|---|---|
| AUTH-01 | POST | `/api/auth/social/{provider}` | 불필요 |
| AUTH-02 | POST | `/api/auth/login` | 불필요 |
| AUTH-03 | POST | `/api/auth/token/refresh` | 불필요(refreshToken) |
| AUTH-04 | POST | `/api/auth/password/reset-request` | 불필요 |
| AUTH-05 | POST | `/api/auth/password/reset` | 불필요(token) |
| AUTH-06 | POST | `/api/auth/recovery/email` | 불필요 |
| AUTH-07 | POST | `/api/auth/recovery/code` | 불필요 |
| AUTH-08 | POST | `/api/auth/signup` | 불필요 |
