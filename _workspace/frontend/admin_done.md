# admin 모듈 프론트엔드 구현 완료 보고

> 모듈: admin · 구현일: 2026-07-20 · 스택: React 18 + Vite + Tailwind
> 입력: `_workspace/contracts/admin.md`(ADM-01~06), `_workspace/specs/admin.md`
> `npm run build` **통과** (vite build 성공, 145 modules).

## 1. 구현 화면 / 라우트

| 화면 ID | 라우트 | 파일 | 사용 API |
|---|---|---|---|
| admin_dashboard_adm_001 | `/admin/dashboard` (`/admin`→리다이렉트) | `src/pages/admin/AdminDashboardPage.jsx` | ADM-01 |
| admin_member_cs_management_adm_003_2 | `/admin/members` | `src/pages/admin/AdminMembersPage.jsx` | ADM-01(KPI 공용)·ADM-02·ADM-03 |
| classification_quality_adm_002_2 | `/admin/quality` | `src/pages/admin/ClassificationQualityPage.jsx` | ADM-05·ADM-06 |

- 브라우저 검증 완료(read_page): 3화면 모두 계약 스키마 데이터로 정상 렌더, 화면 설계값과 일치(회원 저장공간 42.5/50GB 85% 등 원본 수치 재현).
- 화면 간 이동: 대시보드 "모두 보기"/"전체 문의 대응하기"·좌측 아이콘 레일(group/analytics) → members·quality. members 사이드바 대시보드 탭 → dashboard.

## 2. API 계층

- `src/api/adminApi.js` — ADM-01~06. 경로/쿼리/필드는 계약과 글자 단위 일치.
  - ADM-03 CSV: `responseType:'blob'`로 봉투 우회 후 `<a download>` 트리거. mock 시 UTF-8 BOM 포함 CSV 문자열 생성.
  - ADM-06: POST, 202 접수 메시지 토스트.
- `src/api/mock/adminMock.js` — **VITE_USE_MOCK=true 구간 전체 mock**. 계약의 `[가정]/데모` 항목(AI 지표·오분류 클러스터·CS 티켓·trend·validation-pack)을 화면 원본 수치로 시드. `.env`는 현재 `VITE_USE_MOCK=false`(실 백엔드 호출) — 백엔드 ADM-01~06 준비 시 그대로 연동.

## 3. role 기반 라우트 가드 (게이팅 구현 방식)

- `src/lib/role.js` — `sortmate.role` localStorage 키(토큰 저장 패턴과 동일 위치). `getRole/setRole/isAdmin/clearRole`.
- `src/api/authApi.js` — 로그인/소셜/가입 성공 시 `persistRole(data)`로 `data.user.role` 저장. **role 미포함(백엔드 미노출) 시 no-op → 미저장 → 비관리자 취급(기본 차단)**. 계약 5번 "미노출 시 프론트가 admin 접근 판단" 규약 충족.
- `src/components/AdminGuard.jsx` — `/admin/*` 래핑. `role!==ADMIN`이면 "관리자 권한이 필요합니다." 토스트 후 `/home` 리다이렉트(검증: USER role 진입 시 `/home` 이동 확인).
- 데모 관리자: `src/api/mock/authMock.js` mockEmailLogin이 `admin@sortmate.app` → role `ADMIN` 반환(그 외 USER). backend-dev의 실제 admin 시딩 계정과 이메일 일치(비밀번호는 backend 소관).
- **일반 사용자 UI(BottomNav 등)에 admin 진입점 미노출** — 관리자는 URL 직접 접근(설계 근거대로).

## 4. 공통 컴포넌트 / 재사용

- 기존 `BottomNav`(일반 앱 하단 네비) 재사용 — 대시보드(active=home)·품질(active=cleanup) 화면 하단. 설계상 admin 화면에 렌더된 일반 앱 셸.
- 기존 `Toast`/`useToast`/`formatBytes` 재사용.
- members 전용 관리자 사이드바/모바일탭(대시보드/회원/CS/보안/설정)은 단일 사용처라 페이지 내 인라인(과분리 회피).
- `src/index.css`에 admin 설계 커스텀 클래스 추가: `.card-shadow`, `.custom-scrollbar`, `.sidebar-item-active`.

## 5. 계약과 달라진 점 / 가정

- **계약 스키마 변경 없음.** 필드/경로 전부 계약 준수.
- `[가정]` 미설계 하위화면(CS 관리·보안 로그·시스템 설정 탭, 필터 상세, 회원 more_vert 조치)은 **안내 stub 토스트**("… 화면은 준비 중입니다."). members FAB(CS)도 동일 stub. 계약이 해당 조치 API를 미정의(YAGNI)한 것과 일치.
- ADM-04(CS 티켓 목록)는 대시보드/회원 화면이 ADM-01의 `recentInquiries`/`unresolvedCs`로 요약 충족 → **별도 CS 목록 화면 미설계라 adminApi에 `getCsTickets`만 정의(현재 미사용, 후속 CS 화면 대비)**. mock 포함.
- ADM-05 `trend`는 mock에서 생성한 시계열을 SVG 라인/영역 차트로 렌더(고정 목업 대신 데이터 기반). x축 라벨은 trend 첫/중간 날짜 + "Today".
- 회원 상태 배지: 설계 활성/휴면 + PENDING(대기, amber) 병기 — 계약 `[상충]` status 3값 합집합 규약대로 라벨만 매핑.
- 상대시간("2분 전")은 `joinedAt` ISO로 프론트 계산.

## 6. mock 사용 위치 (기록 없는 mock 방지)

- `src/api/mock/adminMock.js` — ADM-01~06 전부. `VITE_USE_MOCK=true`에서만 활성(현재 기본 false).
- `src/api/mock/authMock.js` mockEmailLogin — 데모 관리자 role 판정(mock 로그인 한정).
- 실 연동 전환: `.env`의 `VITE_USE_MOCK=false`(현 상태)면 `adminApi`가 실제 `/api/admin/*` 호출. 백엔드 role 노출(UserResponse.role) 확인 후 관리자 로그인 → `/admin/*` 접근 검증 필요.
