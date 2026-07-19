# auth 모듈 프론트엔드 완료 보고

> 모듈: auth · 작성일: 2026-07-19 · 담당: frontend-dev
> 산출물 루트: `frontend/` (신규 스캐폴딩) · 스택: React 18 + Vite 5 + Tailwind 3 + react-router-dom 6 + axios

## 1. 빌드 결과

- `npm install` 성공 (155 packages)
- **`npm run build` 통과** (vite v5.4.21, 96 modules, 5.17s)
- 산출: `dist/index.html`, `dist/assets/index-*.css` (24.1 kB), `dist/assets/index-*.js` (233 kB)
- 토큰 컴파일 검증: `bg-primary → #3525cd`, `rounded-xl → 0.75rem`, `px-container-padding → 20px`, `text-text-muted → #64748B` 정상 반영.

## 2. 프로젝트 구조

```
frontend/
├── index.html                 # Hanken Grotesk / JetBrains Mono / Material Symbols 로드
├── vite.config.js             # /api → http://localhost:8080 프록시
├── tailwind.config.js         # DESIGN.md 토큰 전량 등록 (colors/fontFamily/fontSize/borderRadius/spacing)
├── postcss.config.js
├── .env.example               # VITE_USE_MOCK
└── src/
    ├── main.jsx
    ├── index.css              # @tailwind + 화면 HTML 커스텀 클래스(glass-*, btn-interact)
    ├── App.jsx                # 라우터
    ├── api/
    │   ├── client.js          # 단일 axios 인스턴스 + 봉투 해제 인터셉터
    │   ├── authApi.js         # AUTH-01~07 함수 (계약 경로/필드 글자단위 일치)
    │   └── mock/authMock.js   # 백엔드 미완성 구간 mock
    ├── components/
    │   ├── Toast.jsx          # 하단 토스트 (3화면 공용)
    │   └── PasswordField.jsx  # 라벨+표시/숨김 토글 비번 입력 (set_new_password 2회 사용)
    ├── hooks/
    │   └── useToast.js        # 토스트 표시/자동숨김 훅
    └── pages/auth/
        ├── LoginPage.jsx
        ├── ResetPasswordPage.jsx
        ├── SetNewPasswordPage.jsx
        └── AccountRecoveryPage.jsx
```

## 3. 구현 화면 / 라우트

| 화면 폴더 | 컴포넌트 | 라우트 | 원본 대조 |
|---|---|---|---|
| login_com_003_2 | LoginPage | `/login` (및 `/` → `/login` 리다이렉트) | code.html 마크업/클래스 그대로 이식 |
| reset_password | ResetPasswordPage | `/password/reset` | 로딩→성공 버튼 상태 전이(전송 중/성공적으로 발송됨) 포함 |
| set_new_password_com_007 | SetNewPasswordPage | `/password/new` | 진행 트래커(3/3), 강도 미터(클라이언트 계산), 가이드라인 2줄 |
| account_recovery_com_008 | AccountRecoveryPage | `/recovery` | 옵션 카드 2종 + 고객센터 + 빌드태그 |

미정의 경로(`*`)는 `/login`으로 리다이렉트.

## 4. API 연동 (계약 대비)

`src/api/authApi.js` — 계약(`contracts/auth.md`) 경로/필드와 글자 단위 일치:

| 계약 ID | 함수 | 호출 화면 |
|---|---|---|
| AUTH-01 | `socialLogin(provider, {authorizationCode, redirectUri})` | LoginPage (카카오/구글/애플) |
| AUTH-02 | `login({email, password})` | (폼 화면 미제공 — 함수만 준비) |
| AUTH-03 | `refreshToken(refresh)` | (인프라 — 함수만 준비) |
| AUTH-04 | `requestPasswordReset({email})` | ResetPasswordPage |
| AUTH-05 | `resetPassword({token, newPassword, confirmPassword})` | SetNewPasswordPage |
| AUTH-06 | `recoverByEmail({email})` | AccountRecoveryPage (이메일로 인증) |
| AUTH-07 | `verifyRecoveryCode({email, recoveryCode})` | (복구코드 입력 화면 미제공 — 함수만 준비) |

- **응답 봉투 해제**: `client.js` 응답 인터셉터가 `{success,data,error}`를 해제하여 페이지는 `data`만 취급. 실패 봉투/네트워크 오류는 `ApiError{code,message,status}`로 정규화하여 reject.
- **토큰 저장**: 로그인 성공 시 `persistAuth()`가 `accessToken/refreshToken`을 localStorage(`sortmate.accessToken`/`sortmate.refreshToken`)에 저장. 요청 인터셉터가 Bearer 첨부.
- 계약 밖 필드는 추가하지 않음.

## 5. Mock 사용 위치

- **파일**: `frontend/src/api/mock/authMock.js`
- **활성 조건**: 환경변수 `VITE_USE_MOCK=true` 일 때만. **기본값은 false → 실제 `/api` 호출**이 프로덕션 경로.
- `authApi.js` 각 함수가 `USE_MOCK` 플래그로 분기. 백엔드 병렬 개발 중이라 로컬 무백엔드 시연용으로만 존재.
- 반환 shape은 봉투 해제 후 `data`와 동일하게 맞춤 → 백엔드 연결 시 코드 변경 없이 플래그만 off.
- **주의**: 실서비스 배포 전 `VITE_USE_MOCK`이 false인지 확인할 것.

## 6. 공통 컴포넌트 추출

- `Toast` (3화면 반복) — `shape='pill'|'rounded'`, `icon`, `iconClassName` props로 화면별 변형 흡수. 복제본 없음.
- `PasswordField` (set_new_password 내 2회) — 표시/숨김 토글 로직 포함.
- `useToast` 훅 — 표시/자동숨김 타이밍 공용화.

## 7. [자율결정] / [가정] 기록

- **[자율결정] borderRadius 토큰 충돌**: DESIGN.md frontmatter `rounded`(xl=1.5rem)와 화면 HTML tailwind.config(xl=0.75rem)가 충돌. screen.png 시각적 일치가 완료 기준이고 DESIGN.md "Shapes" 산문(버튼/입력 12px=0.75rem)도 화면 값과 일치 → **화면 HTML 값(xl=0.75rem) 채택**. `rounded-2xl/3xl`은 Tailwind 기본(1rem/1.5rem) 유지. (그 외 colors/typography/spacing은 DESIGN.md와 화면이 동일하여 무충돌.)
- **[가정] 이메일 로그인 버튼(LoginPage)**: AUTH-02 입력 폼 화면이 설계에 미제공. 임의 라우트를 만들지 않고 "이메일 로그인 화면은 준비 중입니다" 안내 토스트만 노출. `login()` API 함수는 준비 완료 → 폼 화면 확보 시 연결.
- **[자율결정] 소셜 로그인 authorizationCode**: provider OAuth 리다이렉트 플로우가 별도 화면/모듈로 미제공. `socialLogin(provider, {})` 호출 훅만 계약대로 연결(인가코드는 provider SDK 연동 시점 주입). 성공 시 홈(`/`, auth 모듈 밖)으로 이동.
- **[자율결정] 계정복구 "이메일로 인증"(AccountRecoveryPage)**: 이 화면에 대상 이메일 입력 UI가 없어 AUTH-06 `email` 필드를 채울 수 없음 → 화면 동작(성공 토스트) 유지 후 이메일 수집을 위해 `/password/reset`으로 라우팅. (AUTH-06 호출은 빈 email로 시도 후 실패 무시 — 백엔드 확정 시 이메일 프리필/전용 입력 UI로 개선 권장.)
- **[가정] 복구 코드로 인증**: 24자리 입력 화면이 설계 미제공(본 4화면 스코프 밖). 버튼은 "복구 코드 입력 화면은 준비 중입니다" 토스트. 검증 후 흐름은 `verifyRecoveryCode()` → `/password/new`(state.recoveryToken)로 이어지도록 SetNewPasswordPage가 이미 대응.
- **[가정] set_new_password 진입 토큰**: `?token=`(재설정 링크) 또는 `location.state.recoveryToken`(복구코드 검증)에서 취득. 성공 시 `data.nextRoute || '/login'`으로 이동.
- **[자율결정] 비밀번호 강도 미터**: 계약 AUTH-05 비고대로 클라이언트 표시용(서버 검증 무관). 길이/대문자/특수문자/흔한패턴으로 0~4 점수 계산해 게이지·라벨 갱신.

## 8. 화면 간 이동 (검증)

- `/login` → 소셜 성공 시 `/`(홈, 모듈 밖) · 이메일 버튼 = 안내 토스트
- `/password/reset` → "로그인으로 돌아가기" → `/login`
- `/password/new` → 뒤로(history) · 성공 시 `/login`
- `/recovery` → 뒤로(history) · 이메일 인증 → `/password/reset` · 복구코드/고객센터 = 토스트

## 9. 특이사항 / 후속 필요

- Vite 프록시 target `http://localhost:8080` 가정(백엔드 포트 확정 시 `vite.config.js` 조정).
- 미제공 화면 2건(이메일 로그인 폼, 24자리 복구코드 입력)은 spec-analyst/설계에서 화면 확보 시 라우트 추가 필요. 관련 API 함수는 이미 구현되어 있어 화면만 붙이면 됨.
- `npm audit` 2건 경고(개발 의존성) — 빌드 무관.
