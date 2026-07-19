# my (마이/설정) API 계약

> 모듈: my · 작성일: 2026-07-19 · 대상 화면: notifications_my_004, export_options_my_005, data_export_progress_my_005, storage_detail_my_006, storage_limit_reached_my_006, plan_comparison_upgrade_my_008_2, account_deletion_confirmation_my_009_2
> 공통 규격: 응답 봉투 `{ success, data, error }`, 필드 camelCase, 날짜 ISO 8601(UTC, 예 `2026-07-19T09:00:00Z`), 용량 bytes(number).
> 인증: 본 모듈 **모든 엔드포인트 JWT 필요** — `Authorization: Bearer {accessToken}`. 누락/만료 시 auth 계약 `401 TOKEN_EXPIRED`/`TOKEN_INVALID`.

## 공통 규약 (auth/item/home/cleanup 계약과 동일)
- **응답 봉투**: 성공 `{ "success": true, "data": {...}, "error": null }` / 실패 `{ "success": false, "data": null, "error": { "code", "message" } }`.
- **페이지네이션 표준**: `page`(0-base, 기본 0), `size`(기본 20, 최대 100). 응답 `data`에 `page, size, totalElements, totalPages, hasNext` 포함.
- **Item 표준 표현**: contracts/item.md의 `item` 오브젝트 참조(재정의 안 함).

### my 전용 에러 코드
| HTTP | code | 발생 조건 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 요청 필드 형식/제약 위반 |
| 404 | `NOTIFICATION_NOT_FOUND` | 존재하지 않는 알림 읽음 처리 |
| 404 | `EXPORT_JOB_NOT_FOUND` | 존재하지 않는/타 사용자 내보내기 잡 |
| 409 | `EXPORT_ALREADY_RUNNING` | 진행 중 잡이 있는데 새 내보내기 시작 `[가정]` |
| 409 | `EXPORT_NOT_CANCELABLE` | DONE/FAILED/CANCELED 잡 취소 시도 |
| 404 | `PLAN_NOT_FOUND` | 존재하지 않는 planId 업그레이드 |
| 409 | `PLAN_ALREADY_ACTIVE` | 이미 해당 플랜 사용 중 |
| 501 | `PAYMENT_NOT_IMPLEMENTED` | 결제/복원 stub — 외부 PG 미연동 `[가정]` |

---

## 재사용 (신규 정의 아님)
| my 액션 | 재사용 엔드포인트 | 소유 계약 |
|---|---|---|
| 계정 탈퇴 요청 (account_deletion_confirmation) | `POST /api/vault/account/deletion-request` `{ "confirm": true }` | **vault VAULT-07** |
| 대용량 자산 개별 삭제 (storage_detail delete 버튼) | `POST /api/items/delete` `{ "ids": [...] }` | item ITEM-09 |
| "지금 정리하기" CTA (storage_detail / limit_reached) | 정리 대시보드 진입 → `GET /api/cleanup/dashboard` | cleanup CLEAN-01 |

> **계정 삭제는 my에서 신규 정의하지 않는다.** 화면의 동의 체크박스가 켜진 상태에서 "계정 탈퇴" 클릭 → VAULT-07 호출. 30일 유예/재로그인 취소는 vault.md VAULT-07(2026-07-19 갱신)에 반영됨.

---

### MY-01: 알림 목록 조회
> 화면: notifications_my_004. 필터 탭(전체/AI 분석/시스템 관리/혜택) + 시간 그룹(오늘/이번 주, 프론트 분류) + 빈 상태.
- **Method/Path**: `GET /api/my/notifications?category={category}&page={page}&size={size}`
- **인증**: 필요
- **Query 파라미터**:
  - `category`: string(선택, `AI_ANALYSIS`|`SYSTEM`|`BENEFIT`) — 생략 시 전체 탭
  - 페이지네이션 표준(기본 page=0, size=20). 정렬 `createdAt` 내림차순 고정 `[가정]`
- **Request Body**: 없음
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "number",
        "category": "string(AI_ANALYSIS|SYSTEM|BENEFIT)",
        "type": "string — 세부 종류(AI_COMPLETE|DUPLICATE_FOUND|COUPON_EXPIRING|VAULT_BACKUP 등)",
        "title": "string (예: 5개 항목에 대한 AI 분석 완료)",
        "body": "string (본문)",
        "actionRoute": "string|null (예: /cleanup/duplicates — 카드/버튼 탭 목적지)",
        "actionLabel": "string|null (예: 중복 자료 검토 — 인라인 액션 버튼 라벨)",
        "read": "boolean",
        "createdAt": "string(ISO 8601)"
      }
    ],
    "unreadCount": "number — 미읽음 총계(뱃지용)",
    "page": 0, "size": 20, "totalElements": 4, "totalPages": 1, "hasNext": false
  },
  "error": null
}
```
- **에러**: `400 VALIDATION_ERROR`(category/페이지 값 오류)
- **비고**: `totalElements=0`이면 빈 상태("모두 확인했습니다"). 시간 그룹핑은 서버 미제공, 프론트가 `createdAt`으로 오늘/이번 주 분류. `category`↔탭 매핑: AI 분석=AI_ANALYSIS, 시스템 관리=SYSTEM, 혜택=BENEFIT.

---

### MY-02: 알림 읽음 처리
> 화면: notifications_my_004 카드 탭. `[가정]` 명시적 read UI 근거 약함 — 최소 계약. 단건/일괄 겸용.
- **Method/Path**: `POST /api/my/notifications/read`
- **인증**: 필요
- **Request Body**:
```json
{ "ids": ["number(선택) — 지정 시 해당 알림만"], "all": "boolean(선택, 기본 false) — true면 전체 읽음" }
```
- **Response 200**:
```json
{ "success": true, "data": { "updatedCount": "number", "unreadCount": "number" }, "error": null }
```
- **에러**: `400 VALIDATION_ERROR`(ids와 all 모두 비어있음), `404 NOTIFICATION_NOT_FOUND`(존재하지 않는 id 포함 시)
- **비고**: `ids` 지정과 `all:true` 동시 전달 시 `all` 우선. 미구현 시 프론트 로컬 상태로 대체 가능(선택 기능).

---

### MY-03: 내보내기 옵션 조회
> 화면: export_options_my_005. 선택 항목 수, 예상 크기, 가용 데이터 유형/저장 위치.
- **Method/Path**: `GET /api/my/export/options`
- **인증**: 필요
- **Request Body**: 없음
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "itemCount": "number (예: 2482 — '2,482개 항목 선택됨')",
    "estimatedBytes": "number (예: 1.4GB → bytes)",
    "splitThresholdBytes": "number (예: 2GB → bytes, 초과 시 분할 안내)",
    "dataTypes": [
      { "type": "JSON_METADATA", "label": "JSON 메타데이터", "description": "AI 태그, 소스 URL 및 타임스탬프", "defaultSelected": true },
      { "type": "ORIGINAL_FILES", "label": "원본 파일", "description": "고해상도 스크린샷 및 미디어", "defaultSelected": true }
    ],
    "destinations": [
      { "type": "DOWNLOAD", "label": "직접 다운로드 (.zip)", "available": true, "defaultSelected": true },
      { "type": "GOOGLE_DRIVE", "label": "구글 드라이브", "available": false },
      { "type": "EMAIL", "label": "이메일로 전송", "available": false }
    ]
  },
  "error": null
}
```
- **에러**: 없음(항목 0이면 itemCount=0, estimatedBytes=0)
- **비고**: `[가정]` GOOGLE_DRIVE/EMAIL은 `available:false`(미연동 stub). `estimatedBytes`는 선택된 dataType 조합 기준의 서버 추정치이나 본 조회는 기본 선택(둘 다) 기준 값. 선택 변경 시 재추정 API 없음 — 프론트가 유형별 근사 표시 가능(선택).

---

### MY-04: 내보내기 작업 시작
> 화면: export_options_my_005 "내보내기 시작". 비동기 잡 생성 후 진행 화면(폴링)으로 이동.
- **Method/Path**: `POST /api/my/export`
- **인증**: 필요
- **Request Body**:
```json
{
  "dataTypes": ["string(필수, 1개 이상, JSON_METADATA|ORIGINAL_FILES)"],
  "destination": "string(필수, DOWNLOAD|GOOGLE_DRIVE|EMAIL)"
}
```
- **Response 202** (잡 접수):
```json
{
  "success": true,
  "data": {
    "exportJobId": "number",
    "status": "PREPARING",
    "progressPercent": 0,
    "itemCount": "number",
    "estimatedBytes": "number",
    "createdAt": "2026-07-19T09:00:00Z"
  },
  "error": null
}
```
- **에러**: `400 VALIDATION_ERROR`(dataTypes 빈 배열/잘못된 값, destination 값 오류), `409 EXPORT_ALREADY_RUNNING`(진행 중 잡 존재 `[가정]`)
- **비고**: `[가정]` destination이 available=false(DRIVE/EMAIL)면 `400 VALIDATION_ERROR`. 잡 진행은 MY-05로 폴링.

---

### MY-05: 내보내기 진행 조회 (폴링)
> 화면: data_export_progress_my_005. 퍼센트·현재 작업 텍스트·상태·완료 시 다운로드 URL.
- **Method/Path**: `GET /api/my/export/{jobId}`
- **인증**: 필요
- **Request Body**: 없음
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "exportJobId": "number",
    "status": "string(PREPARING|COMPRESSING|DONE|FAILED|CANCELED)",
    "progressPercent": "number (0~100)",
    "currentTask": "string (예: 고화질 미디어 압축 중 — 진행 라벨)",
    "itemCount": "number",
    "estimatedBytes": "number",
    "resultBytes": "number|null (DONE시 실제 크기)",
    "downloadUrl": "string|null (DONE + destination=DOWNLOAD 시 만료형 URL)",
    "encrypted": "boolean (화면 '종단간 암호화된 JSON 패키지' 배지)",
    "createdAt": "string(ISO 8601)",
    "completedAt": "string(ISO 8601)|null",
    "error": "string|null (FAILED 시 사유)"
  },
  "error": null
}
```
- **에러**: `404 EXPORT_JOB_NOT_FOUND`(없음/타 사용자)
- **비고**: 폴링 주기 3초 권장 `[가정]`(진행 화면 setInterval 3s 근거). `downloadUrl`은 단기 만료 서명 URL `[가정]`. DRIVE/EMAIL destination은 DONE 시 downloadUrl=null(외부 전송 stub).

---

### MY-06: 내보내기 취소
> 화면: export_options 모달 "내보내기 취소", data_export_progress "내보내기 취소".
- **Method/Path**: `POST /api/my/export/{jobId}/cancel`
- **인증**: 필요
- **Request Body**: 없음
- **Response 200**:
```json
{ "success": true, "data": { "exportJobId": "number", "status": "CANCELED" }, "error": null }
```
- **에러**: `404 EXPORT_JOB_NOT_FOUND`, `409 EXPORT_NOT_CANCELABLE`(이미 DONE/FAILED/CANCELED)
- **비고**: "백그라운드에서 진행"(진행 화면) 버튼은 서버 호출 없이 화면만 이탈 — 잡은 계속 진행. 취소만 서버 상태 전이.

---

### MY-07: 저장공간 상세 조회
> 화면: storage_detail_my_006(정상), storage_limit_reached_my_006(한도 도달). 동일 엔드포인트가 `limitReached`로 변형. 유형별 분해 + 대용량 자산 + 인사이트 + 플랜 한도.
- **Method/Path**: `GET /api/my/storage`
- **인증**: 필요
- **Request Body**: 없음
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "usedBytes": "number (예: 42.8GB)",
    "totalBytes": "number (플랜 한도, 예: 128GB 또는 무료 5GB)",
    "usedPercent": "number (0~100, 예: 33)",
    "planName": "string (예: 무료 / 프리미엄)",
    "limitReached": "boolean (usedBytes >= totalBytes)",
    "reclaimableBytes": "number (AI가 안전 판단한 정리 가능 용량, 예: 12.4GB — cleanup CLEAN-01과 동일 의미)",
    "categories": [
      {
        "type": "string(VIDEO|SCREENSHOT|DOCUMENT|LINK)",
        "label": "string (예: 동영상)",
        "bytes": "number",
        "itemCount": "number",
        "percent": "number (0~100, 세그먼트 바 비율)"
      }
    ],
    "largestItems": [
      {
        "itemId": "number",
        "title": "string (예: Iceland_Roadtrip_4K.mp4)",
        "type": "string(VIDEO|DOCUMENT|ARCHIVE|IMAGE …)",
        "thumbnailUrl": "string|null",
        "bytes": "number",
        "modifiedAt": "string(ISO 8601)"
      }
    ],
    "insights": [
      { "type": "string(GROWTH|ENCRYPTED|VAULT_SYNCED …)", "label": "string (예: 빠르게 증가 중 (+2GB/주))" }
    ]
  },
  "error": null
}
```
- **에러**: 없음(신규 사용자면 usedBytes=0, categories/largestItems 빈 배열)
- **비고**:
  - `[상충 해소]` totalBytes/planName은 사용자 플랜에 따라 결정(무료=5GB, 상위=128GB 등). 두 화면은 같은 응답의 데이터 차이일 뿐.
  - `limitReached=true`면 프론트가 한도 도달 화면(경고 헤더 + 업그레이드/정리 CTA) 렌더.
  - `largestItems`는 용량 내림차순 상위 N개(기본 5) `[가정]`. 전체 목록은 item 검색(정렬=size)로 위임 가능 — "전체 보기" CTA. 신규 엔드포인트 만들지 않음.
  - `reclaimableBytes`는 cleanup CLEAN-01과 **의미·산식 동일**(중복/흐릿 스크린샷 등). 마이 탭 상세용으로 재노출. "지금 정리하기" CTA → CLEAN-01 대시보드.

---

### MY-08: 플랜 목록/비교 조회
> 화면: plan_comparison_upgrade_my_008_2. 현재 플랜 + 가용 플랜(무료/프리미엄) 기능·가격.
- **Method/Path**: `GET /api/my/plans`
- **인증**: 필요
- **Request Body**: 없음
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "currentPlanId": "string (FREE|PREMIUM)",
    "plans": [
      {
        "id": "FREE",
        "name": "무료",
        "priceMonthly": 0,
        "currency": "KRW",
        "storageBytes": "number (5GB → bytes)",
        "features": ["기본 AI 분류", "5GB 클라우드 저장 공간", "표준 암호화"],
        "badge": null,
        "isCurrent": true
      },
      {
        "id": "PREMIUM",
        "name": "프리미엄",
        "priceMonthly": 9900,
        "currency": "KRW",
        "storageBytes": "number (500GB → bytes)",
        "features": ["무제한 AI 분석", "500GB 저장 공간", "고급 보안 프로토콜", "24/7 우선 지원"],
        "badge": "가장 인기 있음",
        "isCurrent": false
      }
    ]
  },
  "error": null
}
```
- **에러**: 없음
- **비고**: `priceMonthly` 정수(KRW, 원 단위). 화면 문구가 고정 카피이므로 features 배열은 서버 상수여도 무방. `[가정]` 연간 플랜/기타 티어는 화면 근거 없어 제외.

---

### MY-09: 플랜 업그레이드 (결제) — **stub**
> 화면: plan_comparison_upgrade_my_008_2 "지금 업그레이드". **외부 PG 미연동 → stub 계약** `[가정]`.
- **Method/Path**: `POST /api/my/plans/upgrade`
- **인증**: 필요
- **Request Body**:
```json
{ "planId": "string(필수, PREMIUM)" }
```
- **Response 200** (stub — 실제 결제 없이 구독 활성 처리 또는 미지원 안내):
```json
{
  "success": true,
  "data": {
    "planId": "PREMIUM",
    "status": "string(ACTIVE|PENDING_PAYMENT)",
    "currentPeriodEnd": "string(ISO 8601)|null",
    "stub": true
  },
  "error": null
}
```
- **에러**: `400 VALIDATION_ERROR`(planId 누락), `404 PLAN_NOT_FOUND`, `409 PLAN_ALREADY_ACTIVE`(이미 프리미엄), `501 PAYMENT_NOT_IMPLEMENTED`(결제 stub 미지원 응답 선택 시)
- **비고**: `[가정]` **채택안 A(권장)**: PG 미연동이므로 서버가 즉시 `status=ACTIVE`로 구독을 활성화(개발/데모용), `stub:true` 표식. **대안 B**: `501 PAYMENT_NOT_IMPLEMENTED`로 명시적 미지원. backend-dev는 A를 기본 구현(데모 동작), 실제 PG 연동 시 교체.

---

### MY-10: 구매 복원 — **stub**
> 화면: plan_comparison_upgrade_my_008_2 "구매 복원". `[가정]` 외부 스토어 미연동 stub.
- **Method/Path**: `POST /api/my/plans/restore`
- **인증**: 필요
- **Request Body**: 없음
- **Response 200**:
```json
{ "success": true, "data": { "restored": "boolean", "planId": "string|null", "stub": true }, "error": null }
```
- **에러**: `501 PAYMENT_NOT_IMPLEMENTED`(선택)
- **비고**: `[가정]` 기본 구현은 `restored:false`(복원할 구매 없음) 반환. 화면은 토스트만 표시.

---

## 엔드포인트 요약
| ID | Method | Path | 인증 | 비고 |
|---|---|---|---|---|
| MY-01 | GET | `/api/my/notifications` | 필요 | 페이지네이션 |
| MY-02 | POST | `/api/my/notifications/read` | 필요 | `[가정]` 선택 기능 |
| MY-03 | GET | `/api/my/export/options` | 필요 | |
| MY-04 | POST | `/api/my/export` | 필요 | 202, 비동기 잡 |
| MY-05 | GET | `/api/my/export/{jobId}` | 필요 | 폴링 |
| MY-06 | POST | `/api/my/export/{jobId}/cancel` | 필요 | |
| MY-07 | GET | `/api/my/storage` | 필요 | limitReached 변형 |
| MY-08 | GET | `/api/my/plans` | 필요 | |
| MY-09 | POST | `/api/my/plans/upgrade` | 필요 | **stub** |
| MY-10 | POST | `/api/my/plans/restore` | 필요 | **stub** |
| (재사용) VAULT-07 | POST | `/api/vault/account/deletion-request` | 필요 | **vault 소유, 신규 정의 없음** |

## 타 계약 연동/변경 통지 (backend-dev · frontend-dev)
- **vault.md VAULT-07 갱신함**: 계정 삭제 화면(account_deletion_confirmation)이 30일 유예 + 재로그인 취소 근거를 제공 → VAULT-07 비고에 반영. my 모듈은 VAULT-07을 그대로 호출(`{confirm:true}`), 신규 엔드포인트 없음.
- **cleanup.md CLEAN-01과 경계 유지**: MY-07(마이 저장공간 상세)과 CLEAN-01의 `storage` 요약은 별개 소유. `reclaimableBytes`는 동일 의미, MY-07이 상세 필드를 추가로 소유.
- **item ITEM-09 재사용**: storage_detail 대용량 자산 삭제는 `POST /api/items/delete`. 신규 없음.
