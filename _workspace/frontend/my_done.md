# my (마이/설정) 프론트엔드 구현 완료 보고서

> 모듈: my · 작성일: 2026-07-19 · 빌드: `npm run build` 통과 (130 modules, 1.93s)

## 구현 화면 / 라우트

| 라우트 | 파일 | 화면 설계 | 계약 |
|---|---|---|---|
| `/my` | `pages/my/MyHomePage.jsx` | (설계 없음 — 허브 `[가정]`) | — |
| `/my/notifications` | `pages/my/NotificationsPage.jsx` | notifications_my_004 | MY-01, MY-02 |
| `/my/export` | `pages/my/ExportPage.jsx` | export_options_my_005 + data_export_progress_my_005 (통합) | MY-03, MY-04, MY-05, MY-06 |
| `/my/storage` | `pages/my/StoragePage.jsx` | storage_detail_my_006 + storage_limit_reached_my_006 (limitReached 변형) | MY-07, ITEM-09(삭제 재사용) |
| `/my/plan` | `pages/my/PlanPage.jsx` | plan_comparison_upgrade_my_008_2 | MY-08, MY-09, MY-10 |
| `/my/delete-account` | `pages/my/AccountDeletePage.jsx` | account_deletion_confirmation_my_009_2 | VAULT-07 재사용 |

## 신규 파일
- `src/api/myApi.js` — MY-01~10 API 함수 (경로/필드 계약과 글자 단위 일치)
- `src/api/mock/myMock.js` — MY-01~10 mock (내보내기 진행은 경과시간 기반, 폴링 3초)
- `pages/my/*.jsx` 6종

## 라우팅/연동 변경
- `App.jsx`: my 모듈 6개 라우트 추가.
- `BottomNav.jsx`: "마이" 탭이 이미 `/my`로 연결됨(기존) — 수정 불필요.
- `PrivacyControlsPage.jsx`(vault): 기존 계정 삭제 버튼이 VAULT-07을 **직접 호출**하던 것을 → `/my/delete-account` 확인 화면으로 **위임**하도록 변경(중복 호출 제거). 흐름: 프라이버시 설정 → 확인 화면 → VAULT-07. `requestAccountDeletion` import 및 `confirmDelete` state 제거.

## 재사용 (신규 컴포넌트 미생성)
- `BottomNav`, `Toast` + `useToast`, `formatBytes`, `client.js`(봉투 해제 인터셉터), api/mock 분기 패턴(`VITE_USE_MOCK`) 모두 기존 것 사용.
- 대용량 자산 삭제: `itemApi.deleteItems` (ITEM-09) 재사용.
- 계정 탈퇴: `vaultApi.requestAccountDeletion` (VAULT-07) 재사용.
- my 전용 반복 UI(알림 카드, 저장공간 카테고리 행, 플랜 카드, 삭제 안내 카드)는 각 화면 1곳에서만 쓰여 페이지 내 `map()`으로 처리 — 공통 컴포넌트 추출 안 함(YAGNI).

## Mock 사용 위치 (실서비스 전 제거/백엔드 연결 대상)
- **전부 `src/api/mock/myMock.js`**. `VITE_USE_MOCK=true`일 때만 활성(기본 false → 실제 `/api` 호출).
  - MY-01/02 알림: 4건 시드 데이터, 읽음 처리 로컬 상태 변경.
  - MY-03/04/05/06 내보내기: 잡 진행률을 **경과 시간 기반**(~15초에 100%)으로 계산. `downloadUrl`은 `blob:mock-export-9001` 더미.
  - MY-07 저장공간: `SCENARIO` 상수(`'NORMAL'`|`'FULL'`)로 정상/한도도달 화면 전환 — **한도 도달 변형을 확인하려면 `myMock.js`의 `SCENARIO`를 `'FULL'`로 변경**. 실제 백엔드는 사용자 플랜에 따라 `limitReached` 반환.
  - MY-08/09/10 플랜: `CURRENT_PLAN` 모듈 변수로 업그레이드 반영. 업그레이드는 채택안 A(즉시 `status=ACTIVE`, `stub:true`).

## 계약 대비 차이 / [가정]
- **`/my` 허브**: 별도 Stitch 설계 없음 → 메뉴 리스트로 신규 구성. `[가정]`. 지시대로 알림/내보내기/저장공간/플랜/프라이버시(`/my/privacy`)/정리 설정(`/cleanup/settings`)/계정 탈퇴 링크 포함.
- **라우트 명명**: 과제 지시(`/my/plan`, `/my/delete-account`)를 채택. specs/my.md 제안값(`/my/plans`, `/my/account/delete`)과 다름 — 과제 지시 우선.
- **내보내기 통합**: 과제 지시대로 옵션+진행을 `/my/export` 단일 페이지 `phase`(OPTIONS→RUNNING→DONE) 상태로 통합. specs의 `/my/export/:jobId` 별도 라우트는 만들지 않음. "백그라운드에서 진행"은 서버 호출 없이 `/my`로 이탈(계약 비고와 일치, 폴링만 중단).
- **저장 위치(destination)**: GOOGLE_DRIVE/EMAIL은 `available:false` → 비활성(disabled) 렌더 + "준비 중". DOWNLOAD만 선택 가능.
- **알림 시간 그룹**: 서버 미제공 → `createdAt`으로 오늘(<24h)/이번 주(≥24h) 프론트 분류(계약 [가정]과 일치).
- **알림 카드 아이콘/색**: 응답에 아이콘 필드 없음 → `category` 기준 프론트 매핑(AI_ANALYSIS/SYSTEM/BENEFIT). 지어낸 API 필드 없음.
- **MY-09 업그레이드**: 성공 시 토스트만 표시하고 플랜 재조회. 이미 프리미엄이면 버튼 비활성("이용 중인 플랜입니다").
- **계정 삭제 `gracePeriodDays`**: VAULT-07 응답에 유예일 필드 없음 → 화면 고정 카피대로 **30일 하드코딩**(`GRACE_DAYS`). `[가정]`. 삭제 성공 후 1.5초 뒤 `/login`으로 이동.
- **대용량 자산 "전체 보기"**: `/library?sort=size`로 위임(계약 비고: item 검색 sort=size). 신규 엔드포인트 없음.

## 미해결/후속 확인 필요
- 없음. 계약 스키마와 화면 데이터 간 불일치(누락 필드) 발견되지 않음.
