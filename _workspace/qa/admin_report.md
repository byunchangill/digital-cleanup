# admin 모듈 QA 리포트 (2026-07-20)

> 기준: contracts/admin.md (ADM-01~06 + 권한 규약), specs/admin.md, backend/admin_done.md, frontend/admin_done.md
> 방식: 계약↔백엔드↔프론트 3자 교차 비교 + 동적 검증(최신 빌드 :8095 별도 기동, 스테일 8080 회피)
> 빌드: backend `gradlew.bat build` BUILD SUCCESSFUL / frontend `npm run build` 통과(145 modules)

## 요약: 통과 26 / 실패 0 / 보류 0 / 관찰 2 → **최종 통과**

2차 범위 신규 권한 체계(role=ADMIN 가드) 포함 6 엔드포인트 + auth 확장(User.role/plan/status) 전부 정합. 특별 확인 6항목 전부 통과.

---

## 특별 확인 사항 결과 (우선순위 순)

### 1. 권한 체크 동적 검증 → **통과(핵심)**
- **admin(admin@sortmate.app) 로그인 → admin API 전부 성공**: dashboard 200, users 200, cs/tickets 200, classification/quality 200, validation-pack **202**.
- **일반(demo, role=USER) → admin API → `403 ADMIN_REQUIRED` 봉투**(dashboard/users/quality/validation-pack 전부 403). `{"code":"ADMIN_REQUIRED","message":"관리자 권한이 필요합니다."}`.
- **무인증 → `401 TOKEN_INVALID`**(기존 EntryPoint). 계약 권한 규약(401 미인증 / 403 role≠ADMIN) 정확.
- **신규 가입자(USER) → admin API → 403** 동적 확인(승격 없이는 차단).
- **백엔드 가드**: `AdminGuard.requireAdmin`을 6개 컨트롤러 메서드가 최초 호출 → User 조회 후 `role!=ADMIN`이면 `ADMIN_REQUIRED`. 신규 필터/인프라 없이 기존 SecurityConfig(authenticated) 재사용.
- **프론트 가드**: `AdminGuard.jsx`가 `isAdmin()`(localStorage role) 아니면 "관리자 권한이 필요합니다." 토스트 + `/home` replace. `App.jsx:81-83` `/admin/*` 3라우트 전부 `<AdminGuard>` 래핑, `/admin`→`/admin/dashboard` 리다이렉트. role 미저장(백엔드 미노출) 시 기본 차단.

### 2. role 노출 라운드트립 → **통과**
- **동적**: admin 로그인 → `user.role="ADMIN"`, demo 로그인 → `user.role="USER"`. `UserResponse`에 `role`(user.getRole().name()) 상시 포함, `isNewUser`는 NON_NULL.
- **프론트**: `authApi.persistRole(data)`가 login/social/signup 성공 시 `setRole(data.user.role)` → localStorage 키 **`sortmate.role`**(`role.js` ROLE_KEY). `setRole(undefined)`이면 no-op → `isAdmin()=false`.

### 3. 전역 집계 정합 → **통과(owner 필터 없음 확인)**
- **동적**: ADM-01 `totalUsers=8`(admin+demo+데모회원 6), `totalItems=18`. demo **본인** 아이템 수(ITEM-03)=17 → admin `totalItems(18) > 단일 소유자(17)`이고 members가 8명 전원 반환 → **소유자 필터 미적용(전역) 실증**. `savedToday`/`unresolvedCs(4)`/`urgentCs(2)`도 전역 집계.
- **백엔드**: `getDashboard`가 `userRepository.count()`/`itemRepository.count()`/`countBySavedAtGreaterThanEqual`/`countByAiClassifiedTrue` — 전부 owner 인자 없음. `getMembers`는 `searchMembers(q,status,plan)` — owner 필터 없음. (member별 `storageUsedBytes`만 해당 사용자 소유 합계로 정상 파생.) item/home/cleanup의 소유자 관례와 **의도적으로 다른** 전역 스캔 확인.

### 4. CSV 내보내기(ADM-03) → **통과**
- **동적 헤더**: `id,displayName,email,joinedAt,storageUsedBytes,storageQuotaBytes,storagePercent,plan,status` — **계약 컬럼·순서와 글자 단위 일치**.
- `Content-Type: text/csv;charset=UTF-8`, `Content-Disposition: attachment; filename="members.csv"`(봉투 아님). CSV 필드 이스케이프(쉼표/따옴표/개행 → 큰따옴표) 구현. 행 데이터 정상(예: `8,한소희,...,PREMIUM,DORMANT`).
- **프론트**: `adminApi.exportUsersCsv`가 `responseType:'blob'`(인터셉터 봉투 우회) → `<a download="members.csv">` 트리거.

### 5. UserPlan 신규 vs my.entity.Plan → **통과(의도적 독립, 혼동 없음)**
- 백엔드가 이름 충돌 회피로 `auth.entity.UserPlan{FREE,BASIC,PREMIUM}`를 my `Plan{FREE,PREMIUM}`(구독 상수·가격)과 **별도** 정의. AdminService는 `UserPlan`만 import, MemberDto.plan=`user.getPlan().name()`. **동적**: members plan 값 = {FREE,BASIC,PREMIUM}(3값) 확인.
- 설계 의도대로 **admin User.plan(표시 배지)과 my UserSubscription.plan(실제 구독)은 현재 미동기화**(화면 근거 없어 미구현, YAGNI). admin_done.md 명시. 필드명 혼동 없음(각 패키지 격리).

### 6. mock ↔ 백엔드 스키마 + 빌드 + 회귀 → **통과**
- **mock 일치**: `adminMock.js` totalUsers/totalUsersDeltaPercent/recentSubscribers/recentInquiries(dashboard), storageUsedBytes/storagePercent(members), CSV 헤더 동일, avgAccuracy/clusters(quality), runId/status/message(vpack) — DTO와 구조 일치. (mock avgAccuracy=94.2 데모값 vs 백엔드 실측 aiClassified 비율 — 구조 동일, 값만 데모/실측 차이. OBS-ADM2)
- **회귀(User 엔티티 필드 추가 영향)**: signup → role=USER 기본, isNewUser:true, provider EMAIL. social kakao → role=USER, provider KAKAO. 신규 3필드(role/plan/status) 빌더 미지정 시 기본값 채워 기존 플로우 무변경. item/home/cleanup/vault/my/categories 전부 200. 전 모듈 회귀 없음.

---

## 통과 항목(추가)
- **ADM-04/05/06**: cs/tickets(status·urgency 필터+페이지, 데모 5건), quality(range 30D/90D, trend 90포인트, clusters 3, suggestion, 잘못된 range → 400), validation-pack(202 `{runId:vp_uuid, status:QUEUED, message}`). ADM-02 잘못된 status → 400.
- **DTO 필드**: AdminDashboardResponse/MemberDto/CsTicketDto/ClassificationQualityResponse/ValidationPackResponse 전부 계약 스키마와 camelCase 일치. 공통 `PageResponse`(item) 재사용.
- **정렬 화이트리스트**: 회원(createdAt/displayName/email), 티켓(createdAt/urgency/status). size 1~100 캡, page<0 → 400.
- **ErrorCode**: `ADMIN_REQUIRED(403)` 등재. GlobalExceptionHandler 봉투 변환.

## 관찰 (수정 불요 / 저우선)
- **OBS-ADM1**: `User.plan`(admin 표시)과 `my.UserSubscription.plan`(실제 구독)이 독립 — 결제/구독 연동 시 동기화 로직 필요하나 화면 근거 없어 미구현(계약·admin_done 명시된 의도된 [가정]). 결함 아님, 후속 연동 시 과제.
- **OBS-ADM2**: mock quality `avgAccuracy`(94.2 데모값)와 실백엔드(aiClassified 비율 실측, 데모 데이터에선 ~22%) 차이 — 구조 동일, mock은 화면 원본 수치 시연용. 무해.
