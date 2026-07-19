# auth QA 리포트 (2026-07-19, 확장 재검증 2026-07-20)

> 검증자: qa-validator · 대상 모듈: auth · 방식: integration-qa 4단 체크리스트(계약↔백엔드 / 계약↔프론트 / 프론트 내부 / 동적)
> 입력: contracts/auth.md, specs/auth.md, backend/auth_done.md, frontend/auth_done.md

---

## 확장 재검증 (2026-07-20): 소셜 실연동 + 이메일 로그인/가입 + 경로 사고 복구 → **통과**

> 범위: 소셜 OAuth 실연동(Kakao/Google/Composite 폴백), AUTH-08 회원가입 신규, AUTH-02 경로 사고(`/login/email` 오정정) 복구.
> 최신 빌드를 :8093 별도 기동(스테일 8080 회피), frontend `npm run build` 통과. **하드 실패 0 / 신규 항목 전부 정합.**

### 요약(확장분): 통과 15 / 실패 0 / 보류 0

1. **[핵심] AUTH-02 경로 사고 복구 → 통과(동적 실증)**: 3자 정합 재확인 — 계약 `POST /api/auth/login`(L84), 백엔드 `AuthController:40 @PostMapping("/login")`, 프론트 `authApi.js:30 client.post('/auth/login')`. `/login/email`(오정정) 흔적 없음. **동적 로그인 라운드트립**: `POST /api/auth/login {demo}` → `200` + `auth{accessToken,refreshToken,tokenType,expiresIn}` + `user{email,provider:EMAIL}`. 잘못된 비번 → `401 INVALID_CREDENTIALS`. 로그인 실동작 확인.
2. **AUTH-08 회원가입 → 통과(동적)**: 신규 이메일 → `200` 자동로그인(토큰 봉투 + `user.isNewUser:true`, `displayName`=이메일 로컬파트, `provider:EMAIL`). 중복(demo) → `409 EMAIL_ALREADY_EXISTS`. 약관 미동의 → `422 TERMS_NOT_AGREED`. 약한 비번 → `422 PASSWORD_POLICY_VIOLATION`(위반 항목 메시지 포함). **검증 순서**(약관→중복→정책) 확인: demo+terms:false → `422 TERMS`(중복보다 약관 우선). DTO 검증(@Email/@NotBlank/@NotNull), ErrorCode 409/422 등재.
3. **소셜 stub 폴백(키 미설정) → 통과(동적)**: `CompositeSocialAuthClient(@Primary)`가 키 미설정 kakao/google을 `StubSocialAuthClient`로 폴백, apple 항상 stub. `POST /api/auth/social/kakao {정상코드}` → `200`(provider KAKAO, isNewUser). google/apple → `200`. `fail-` 접두 코드 → `502 SOCIAL_AUTH_FAILED`. 미지원 provider(naver) → `400 VALIDATION_ERROR`. 코드 누락 → `400`. 기존 데모 소셜 동작 유지(계약 AUTH-01 무변경).
4. **OAuth 프론트 플로우 정적 검토 → 통과**: `oauth.js` state=`crypto.randomUUID` sessionStorage 저장, `consumeState`가 1회성 제거+대조(CSRF). `redirectUriFor(provider)`=`{origin}/auth/callback/{provider}`를 **인가 요청(beginOAuth)과 토큰교환(콜백 socialLogin) 양쪽에 동일 사용** → redirectUri 일치성 확보(provider 콘솔 등록값과 매칭 전제). `OAuthCallbackPage`: code/state 파싱→검증→`socialLogin({authorizationCode:code, redirectUri})`→/home, 취소/에러/검증실패→/login, StrictMode useRef 가드. `LoginPage/EmailAuthPage.handleSocial`: kakao·google + `hasOAuthConfig` + `!useMock`이면 `beginOAuth` 리다이렉트, 아니면 stub 호출. 라우트 `App.jsx` `/auth/email`·`/auth/callback/:provider` 등록. (실 키 없어 리다이렉트 자체는 코드 검토로만 — 표준 code 교환 플로우 정합)
5. **회귀 스모크 → 없음**: 로그인 토큰으로 items/home/cleanup/vault/my/categories 전부 200, 무인증 items → 401. SecurityConfig `/api/auth/**` permitAll이 `/signup` 자동 커버(별도 변경 없음). 소셜 실클라이언트 추가(@Primary)로 컨텍스트 로딩 정상(기동 성공).

### 확장분 관찰(저우선)
- **OBS-A-ext1**: `POST /api/auth/login/email`(존재하지 않는 경로) 호출 시 500 반환(no-handler가 catch-all Exception 핸들러→INTERNAL_ERROR). 복구된 실제 경로(`/api/auth/login`)와 무관한 사전존재 동작이며 프론트는 해당 경로를 호출하지 않음. 원한다면 no-handler를 404로 매핑 가능(전 모듈 공통, auth 한정 아님). 조치 불요.
- **OBS-A-ext2**: 프론트 소셜 버튼이 디자인의 provider 아이콘 이미지 대신 텍스트 라벨(Google/Apple)로 대체(CSP/오프라인 안정성, frontend_done 11절 명시). 동작 동일, 무해.

---

## (초기 검증 2026-07-19)

> 동적 검증: `java -jar build/libs/sortmate-backend-0.0.1-SNAPSHOT.jar` 백그라운드 기동(포트 8080, H2 in-memory, 데모 시딩 확인) → curl 실호출 → 검증 후 프로세스 종료. 프론트 `npm run build` 통과.

## 요약: 통과 4개 영역(계약 위반 0) / 실패 0 / 보류·관찰 3

계약 정합성 관점에서 **하드 실패(contract violation) 0건**. 백엔드 7개 엔드포인트 전부 경로·메서드·응답 shape·에러 코드·HTTP 상태가 계약과 글자 단위로 일치하며 동적 호출로 실증됨. 프론트 API 계층도 계약과 일치하고 봉투 단일 해제가 올바름.

아래 3건은 **설계상 미제공 화면에서 파생된 알려진 한계**(양측 완료 보고에 `[자율결정]`/`[가정]`으로 기록됨)로, 계약 위반이 아니라 후속 보완 대상(보류)이다.

---

## 1. 계약 ↔ 백엔드 — 통과

| 검증 | 결과 |
|---|---|
| 7개 엔드포인트 경로·메서드 (`AuthController`) | 통과 — AUTH-01~07 계약표와 일치 |
| 응답 DTO 필드/타입 | 통과 — `AuthTokenResponse(accessToken,refreshToken,tokenType,expiresIn)`, `UserResponse`, `RecoveryCodeResponse`, `MessageResponse` 모두 camelCase 일치. `isNewUser`는 소셜만 노출(`@JsonInclude NON_NULL`), 이메일 로그인엔 미포함 — 계약과 일치 |
| 에러 코드 enum (`ErrorCode`) | 통과 — 계약 공통 코드 9종 전부 존재 + `INTERNAL_ERROR`, HTTP 상태 매핑(400/401/422/429/502) 일치 |
| 요청 검증 어노테이션 | 통과 — `@NotBlank`/`@Email`이 계약 필수/형식 제약과 일치 |
| 봉투 일관성 (`GlobalExceptionHandler`) | 통과 — 비즈니스/검증/파싱/미처리 예외 전부 `{success,data,error}` 봉투로 반환(Spring 기본 에러 JSON 이탈 없음) |

**동적 실증(curl):**
- AUTH-02 정상 로그인 → 200, `data.auth`+`data.user` shape 정확 / 오답 → 401 `INVALID_CREDENTIALS` / 이메일 형식오류 → 400 `VALIDATION_ERROR`
- AUTH-07 하이픈 포함 복구코드 정상 → 200 `recoveryToken/expiresIn:600/nextRoute:/password/new` / 불일치 → 401 `RECOVERY_CODE_INVALID` / 길이오류 → 400 `VALIDATION_ERROR`
- AUTH-05 정책위반 → 422 `PASSWORD_POLICY_VIOLATION` / 불일치 → 422 `PASSWORD_MISMATCH` / 성공 → 200 `nextRoute:/login` / 토큰 재사용 → 401 `RESET_TOKEN_INVALID`(1회용 검증)
- AUTH-04/06 → 항상 200 성공 봉투(계정 열거 방지 실증)
- AUTH-01 정상코드 → 200(`isNewUser:true`) / 미지원 provider(naver) → 400 / `fail-` 코드 → 502 `SOCIAL_AUTH_FAILED`
- AUTH-03 잘못된 refreshToken → 401 `TOKEN_INVALID`

## 2. 계약 ↔ 프론트 — 통과

| 검증 | 결과 |
|---|---|
| API 함수 경로/필드 (`src/api/authApi.js`) | 통과 — AUTH-01~07 경로·요청 필드 계약과 글자 단위 일치 |
| 봉투 해제 (`src/api/client.js`) | 통과 — 응답 인터셉터가 `body.data`만 반환. 페이지는 `data.message`/`data.nextRoute`/`data.auth`에 직접 접근 → **이중 해제 없음** |
| 응답 필드 존재성 | 통과 — 접근 필드 전부 계약 Response에 존재 |
| 에러 정규화 | 통과 — 실패 봉투를 `ApiError{code,message,status}`로 변환, 페이지는 `err.message` 토스트. 계약이 프론트 측 코드별 분기를 요구하지 않음 |

## 3. 프론트 내부 — 통과

| 검증 | 결과 |
|---|---|
| 라우트 등록 (`App.jsx`) | 통과 — `/login`, `/password/reset`, `/password/new`, `/recovery` + `/`→`/login`, `*`→`/login`. 명세 라우트와 일치 |
| 화면 간 이동(죽은 링크) | 통과 — reset "로그인으로 돌아가기"→`/login`, recovery 이메일인증→`/password/reset`, set-new 성공→`data.nextRoute||/login`, 뒤로가기 history. 죽은 링크 없음 |
| mock 기록 일치 (`mock/authMock.js`) | 통과 — `VITE_USE_MOCK==='true'`에서만 활성, **기본값 false → 실제 `/api` 경로**. mock 반환 shape은 봉투 해제 후 `data`와 동일. 기록 없는 mock 없음 |
| borderRadius 토큰 충돌 `[자율결정]` | 통과(무충돌) — 화면 HTML 값(xl=0.75rem) 채택은 순수 시각 결정으로 계약/명세와 무관. 계약·명세 어디에도 borderRadius 규격 없음 |

---

## 보류 / 관찰 항목 (계약 위반 아님 · 후속 보완 대상)

### QA-01: AUTH-01 소셜 버튼이 빈 authorizationCode를 전송 → 실호출 시 항상 400
- 담당: frontend-dev (근본은 spec-analyst — OAuth 리다이렉트 화면 미제공)
- 근거: 계약 AUTH-01 `authorizationCode: string(필수)`. 백엔드 `SocialLoginRequest.authorizationCode`에 `@NotBlank`.
- 실제: `frontend/src/pages/auth/LoginPage.jsx:21` `socialLogin(provider, {})` — 빈 바디 전송. `authApi.js:18-22`가 `{authorizationCode: undefined}`로 POST → 백엔드 400 `VALIDATION_ERROR`. `handleSocial` catch가 "로그인에 실패했습니다." 에러 토스트를 띄우고 `/`로 이동하지 않음.
- 재현: 서버 기동 후 `curl -X POST :8080/api/auth/social/kakao -d '{}'` → `400 {"error":{"code":"VALIDATION_ERROR"...}}`. mock off(기본) 상태에서 카카오/구글/애플 버튼 클릭 = 에러 토스트.
- 판정: **보류.** provider OAuth SDK 리다이렉트 플로우가 auth 모듈 범위 밖(완료 보고 `[자율결정]` 기록). 인가코드 주입 지점 확보 전까지 소셜 버튼은 비기능 스텁. 계약면(호출 경로/필드)은 정확. OAuth 연동 화면 확보 시 재검증 필요.

### QA-02: AUTH-06 계정복구 "이메일로 인증"이 빈 email 전송 → 400 후 삼킴, 엔드포인트 실질 미사용
- 담당: frontend-dev / spec-analyst (recovery 화면에 이메일 입력 UI 미제공)
- 근거: 계약 AUTH-06 `email: string(필수)`, 항상 200 성공 반환 설계. 백엔드 `PasswordResetLinkRequest.email`에 `@NotBlank @Email`.
- 실제: `frontend/src/pages/auth/AccountRecoveryPage.jsx:25` `await recoverByEmail({ email: '' }).catch(() => {})` — 빈 email → 백엔드 400 `VALIDATION_ERROR`, 프론트가 조용히 무시하고 성공 토스트만 노출 후 `/password/reset`로 라우팅. 결과적으로 AUTH-06은 UI에서 성공적으로 호출되는 경로가 없음.
- 재현: `curl -X POST :8080/api/auth/recovery/email -d '{"email":""}'` → `400`. 반면 유효 email → `200 {"message":"이메일로 복구 링크를 보냈습니다."}`.
- 판정: **보류.** 화면(account_recovery_com_008)에 대상 이메일 입력 요소가 없어 계약 필드를 채울 수 없음(완료 보고 `[자율결정]`/`[가정]`). UX는 `/password/reset`(AUTH-04)로 이메일 수집을 위임하여 동작하나, AUTH-06 호출은 100% 실패하는 죽은 호출임. 이메일 프리필/전용 입력 UI 확보 시 개선·재검증 권장. (대안: 화면 확보 전까지 무의미한 `recoverByEmail({email:''})` 호출 제거 고려.)

### QA-03: 보호 경로 미인증 접근 시 봉투 없는 403 반환(401 아님)
- 담당: backend-dev (`common/config/SecurityConfig`, 전방위/vault 대비)
- 근거: integration-qa 체크리스트 "인증 필요 엔드포인트에 토큰 없이 요청 시 401 봉투 응답 확인" + 공통 규격 "모든 응답은 `{success,data,error}` 봉투".
- 실제: `curl :8080/api/vault/items`(비-permitAll 경로) → **HTTP 403, 빈 바디**(봉투 이탈). AuthenticationEntryPoint/AccessDeniedHandler가 봉투를 생성하지 않음. 프론트 `client.js:52-58` 에러 인터셉터는 `res.data.error` 부재 시 `NETWORK_ERROR`("서버에 연결할 수 없습니다.")로 오분류함.
- 판정: **보류(전방위·범위밖).** auth 모듈의 7개 엔드포인트는 전부 `인증 불필요`이므로 본 모듈 자체 실패는 아님. 그러나 vault 등 보호 API가 도입되면 401/403 봉투 표준화가 반드시 필요. auth 백엔드가 소유한 SecurityConfig 사안이므로 보호 모듈 착수 전 봉투 통일(EntryPoint/DeniedHandler) 권장.

---

## 재검증 필요 트리거
- OAuth SDK/리다이렉트 화면 확보 시 → QA-01
- account_recovery 이메일 입력 UI 또는 이메일 로그인 폼 화면 확보 시 → QA-02
- 최초 보호(protected) 엔드포인트(vault) 착수 시 → QA-03
