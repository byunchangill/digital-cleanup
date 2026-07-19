# my 모듈 QA 리포트 (2026-07-19)

> 기준: contracts/my.md (MY-01~10) + 재사용(VAULT-07/ITEM-09/CLEAN-01) + vault.md VAULT-07 갱신본(gracePeriodDays)
> 방식: 계약↔백엔드↔프론트 3자 교차 비교 + 동적 검증(최신 빌드 :8091 별도 기동, 스테일 8080 회피)
> 빌드: backend `gradlew.bat build` BUILD SUCCESSFUL / frontend `npm run build` 통과(130 modules)

## 요약: 통과 25 / 실패 0 / 보류 0 / 관찰 2 → **최종 통과**

1차 범위 마지막 모듈. 10 엔드포인트 + 재사용 3종 + VAULT-07 갱신 전부 정합. 특별 확인 7항목 전부 통과. 실패 없음.

---

## 특별 확인 사항 결과

### 1. VAULT-07 gracePeriodDays 정합 → **정합(프론트 하드코딩 무해)**
- **동적**: `POST /api/vault/account/deletion-request {confirm:true}` → `{status:PENDING, requestedAt, gracePeriodDays:30, scheduledPurgeAt}`. 백엔드 `VaultService:176-177`가 `PURGE_GRACE_DAYS(30)`을 응답에 실음. 4-arg `DeletionResponse` 컴파일/직렬화 정상.
- **프론트**: `AccountDeletePage.jsx:12` `GRACE_DAYS=30` 하드코딩(응답 필드 미사용).
- **판정**: **어긋남 아님 / 무해**. (a) 값이 30으로 동일해 사용자 노출 불일치 없음. (b) "30일 유예" 안내 문구는 **페이지 로드 시점**(삭제 호출 前)에 렌더되는데, 유예일을 삭제 전에 알려주는 GET 엔드포인트가 없어 정적 값이 유일한 소스 → 하드코딩이 합당. 수정 불필요. (선택 개선: 삭제 성공 토스트에서 `d.gracePeriodDays`를 소비하면 향후 백엔드 변경 시 드리프트 방지 — OBS-M01)

### 2. 내보내기 폴링 흐름 → **통과(E2E 동적 확인)**
- **동적**: MY-03 옵션(itemCount 18, split 2GB, DOWNLOAD available true / DRIVE·EMAIL false) → MY-04 `POST /api/my/export` **202 PREPARING**(exportJobId) → MY-05 폴링 즉시 PREPARING 0% → **~9초 경과 후 폴링 시 DONE 100% + downloadUrl `/files/exports/{id}.zip?token=stub-{id}` + resultBytes + completedAt + encrypted:true**. 시간경과 파생(ExportJob.settle) 정상 동작.
  - 취소: MY-06 → CANCELED, 재취소 → `409 EXPORT_NOT_CANCELABLE`.
  - 중복: 진행 중 재시작 → `409 EXPORT_ALREADY_RUNNING`. 없는 잡 → `404 EXPORT_JOB_NOT_FOUND`.
  - DRIVE destination → `400`(available:false 차단), 빈 dataTypes → `400`.
- **프론트**: `ExportPage.jsx` phase(OPTIONS→RUNNING→DONE), `setInterval 3000`(계약 [가정] 3초), 상태 DONE/FAILED/CANCELED에 클리어. 취소=MY-06, "백그라운드"=서버호출 없이 이탈(계약 비고 일치).

### 3. MY-07 저장공간 → **통과**
- **동적**: `used 8468402 / total 5368709120(5GB) / plan 무료 / limitReached false / reclaimableBytes 1684500`. categories bytes-desc(percent), largestItems 5, insights.
- **limitReached 분기**: `usedBytes >= totalBytes`(StorageService:53). 프론트 `StoragePage.jsx:65`가 `limitReached`로 한도 화면(경고+업그레이드/정리 CTA) vs 정상 상세 분기. ✅
- **totalBytes 500GB(계약 예시 128GB와 다름)**: **타당**. 계약 MY-07 예시는 "예: 128GB 또는 무료 5GB"(비배타 예시)이고, 백엔드는 Plan 상수(FREE 5GB / PREMIUM 500GB)를 사용해 **MY-08 storageBytes와 일치**시킴 — 상세와 플랜 비교 화면의 한도가 어긋나지 않게 하는 올바른 결정. 데모 유저는 FREE라 5GB 반환(동적 확인).
- **reclaimableBytes = CLEAN-01 동일 산식**: **동적 대조 일치** — MY-07 `1684500` == CLEAN-01 `1684500`(`StorageService:55`가 `cleanupService.dashboard().storage().reclaimableBytes()` 재사용).

### 4. MY-08~10 플랜 stub → **통과**
- **MY-08**: current FREE, FREE(5GB/0원/isCurrent), PREMIUM(500GB/9900원 KRW/badge "가장 인기 있음"). 스키마 일치.
- **MY-09**: `POST upgrade {planId:PREMIUM}` → `{planId:PREMIUM, status:ACTIVE, currentPeriodEnd, stub:true}`(채택안 A 즉시 활성). 재업그레이드 → `409 PLAN_ALREADY_ACTIVE`, 미지 planId → `404 PLAN_NOT_FOUND`, planId 누락 → 400(@NotBlank).
- **MY-10**: `POST restore` → `{restored:false, planId:null, stub:true}`.
- 프론트 `PlanPage.jsx`: `r.stub` → "(데모)" 토스트, isPremium이면 버튼 비활성.

### 5. PrivacyControlsPage 삭제 위임 → **통과(vault 회귀 없음)**
- `PrivacyControlsPage.jsx:43` `onDeleteRequest = () => navigate('/my/delete-account')` — 기존 VAULT-07 **직접 호출 제거**(`requestAccountDeletion` import·`confirmDelete` state 삭제). VAULT-05/06(getPrivacy/updatePrivacy)는 **유지** → vault 프라이버시 흐름 무손상.
- 위임 대상 `AccountDeletePage.jsx`가 동의 체크 → `requestAccountDeletion({confirm:true})`(VAULT-07) → `/login`. 흐름 `프라이버시 → /my/delete-account → VAULT-07` 연결 정상(라우트 App.jsx:62 등록).

### 6. myMock ↔ 백엔드 스키마 → **통과**(관찰 OBS-M02)
- MY-01/02/03/04/05/06/07/08/09/10 mock 필드셋이 각 DTO와 일치. 알림 필터(category)/읽음(ids·all)/뱃지(unreadCount) mock 동작 정상.
- **알림 동적**: 4건 seed(unread 3), category=SYSTEM 필터 → 1건, bad category → 400, read empty → 400, `all:true` → updatedCount 3/unreadCount 0. ✅

### 7. 전 모듈 회귀 스모크 → **회귀 없음**
- **동적**: home 200 / cleanup 200 / vault status 200 / items 200 / auth login 200. VAULT-07 4-arg 변경(gracePeriodDays 추가)이 vault 자체 동작·기존 호출부 파손 없음(동적 정상).

---

## 통과 항목 (계약↔백엔드↔프론트)
- **엔드포인트 10종**: 경로/메서드 계약=MyController=myApi.js 3자 일치. MY-04는 **202 ACCEPTED**(ResponseEntity). 인증 실패 → `401 TOKEN_INVALID` 봉투(동적).
- **DTO 필드**: NotificationDtos/ExportDtos/StorageDtos/PlanDtos 전부 계약 스키마와 camelCase 포함 일치. 용량 bytes, 날짜 ISO 8601.
- **재사용 경계**: 계정삭제=VAULT-07(신규 정의 없음), 대용량 삭제=ITEM-09(`StoragePage` itemId 전달), 정리 CTA=CLEAN-01. my에서 재정의 안 함(계약 준수).
- **에러코드**: NOTIFICATION_NOT_FOUND/EXPORT_JOB_NOT_FOUND/EXPORT_ALREADY_RUNNING/EXPORT_NOT_CANCELABLE/PLAN_NOT_FOUND/PLAN_ALREADY_ACTIVE/PAYMENT_NOT_IMPLEMENTED(501) 등재. 동적으로 400/404/409 전부 봉투 응답 확인.
- **라우팅**: App.jsx `/my`, `/my/notifications`, `/my/export`, `/my/storage`, `/my/plan`, `/my/delete-account` 6종 등록. BottomNav "마이"→/my. 화면 흐름(알림 카드→actionRoute, 저장 CTA→/cleanup·/my/plan, 대용량→/items/:id) 정상.
- **vaulted 마스킹 재사용**: MY-07 largestItems가 vaulted 아이템 thumbnailUrl null 마스킹(item 계약 공유).

---

## 관찰 (수정 불요 / 저우선)
### OBS-M01: AccountDeletePage가 gracePeriodDays를 하드코딩(응답 필드 미소비)
- 값이 30으로 백엔드와 동일해 무해. 삭제 前 안내 문구는 정적 값이 유일 소스라 하드코딩 합당. 선택: 삭제 성공 토스트에서 `d.gracePeriodDays` 사용 시 드리프트 방지. (frontend-dev, 선택)

### OBS-M02: myMock.mockGetStorage(NORMAL)의 수치가 실백엔드 Plan 상수와 불일치
- mock NORMAL은 totalBytes 128GB/planName '프리미엄'(계약 예시값) 사용, 실백엔드는 Plan 상수(FREE 5GB/PREMIUM 500GB). mock 내부도 storage='프리미엄' vs plans 기본=FREE로 불일치하나 **mock 전용 데모 데이터**라 실연동 무영향(구조 일치). 조치 불요.
