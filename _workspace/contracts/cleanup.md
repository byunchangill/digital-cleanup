# cleanup (정리) API 계약

> 모듈: cleanup · 작성일: 2026-07-19 · 대상 화면: cleanup_dashboard_clean_001_2, duplicate_review_clean_002, unnecessary_screenshots_clean_005, cleanup_report_clean_008_2, cleanup_settings_my_004_2
> 공통 규격: 응답 봉투 `{ success, data, error }`(common/ApiResponse.java 동일), 필드 camelCase, 날짜 ISO 8601(UTC), 용량은 **bytes(number)**.
> 인증: 본 모듈 **모든 엔드포인트 인증 필요** — `Authorization: Bearer {accessToken}`. 누락/만료 시 auth 계약 `401 TOKEN_EXPIRED`/`TOKEN_INVALID`.

## 공통 규약 (auth/item/home 계약과 동일)
- **응답 봉투**: 성공 `{ "success": true, "data": {...}, "error": null }` / 실패 `{ "success": false, "data": null, "error": { "code", "message" } }`.
- **페이지네이션 표준**: `page`(0-base, 기본 0), `size`(기본 20, 최대 100), `sort`. 응답 `data`에 `page, size, totalElements, totalPages, hasNext` 포함.
- **Item 표준 표현**: contracts/item.md의 `item` 오브젝트 참조(재정의하지 않음). vaulted 마스킹 동일.
- **공통 에러**: `400 VALIDATION_ERROR`, `401 TOKEN_EXPIRED`/`TOKEN_INVALID`, `403 ITEM_FORBIDDEN`, `404 ITEM_NOT_FOUND`(item 계약 공유).
- **cleanup 전용 에러**:

| HTTP | code | 발생 조건 |
|---|---|---|
| 404 | `CLEANUP_GROUP_NOT_FOUND` | 존재하지 않는 중복 그룹 |
| 409 | `CLEANUP_GROUP_ALREADY_RESOLVED` | 이미 RESOLVED/DISMISSED된 그룹 재처리 |
| 422 | `BULK_PARTIAL_FAILURE` | 일괄 삭제 일부 실패 (item 계약과 동일, `data.failedIds`) |

## 재사용 엔드포인트 (신규 정의 아님 — item 계약 참조)
| cleanup 액션 | 재사용 엔드포인트 | 호출 예 |
|---|---|---|
| 불필요 스크린샷 "휴지통으로 이동" | ITEM-09 | `POST /api/items/delete` `{ "ids": [...] }` |
| 만료 쿠폰 카드 → 만료임박 목록 | ITEM-03 | `GET /api/items?expiringSoon=true` (item `expiringSoon` 필터, `[가정]`) |

> **신규 정의는 CLEAN-01~CLEAN-10.** 실제 삭제 물리로직은 ITEM-09를 재사용하며, CLEAN-03만 "그룹 상태 전이 + 삭제"를 래핑한다.

---

### CLEAN-01: 정리 대시보드 조회
> 화면: cleanup_dashboard. 저장공간 요약 + 정리 카테고리 카드 + 최적화 제안을 1회 호출로 반환. **home HOME-01과 별개**(홈 요약 위젯 vs 정리 탭 허브 — specs/cleanup.md 재사용 경계 참조).
- **Method/Path**: `GET /api/cleanup/dashboard`
- **인증**: 필요
- **Request Body**: 없음
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "storage": {
      "usedPercent": "number (0~100, 원형 게이지)",
      "unusedPercent": "number (0~100, '사용하지 않는 파일 28%')",
      "reclaimableBytes": "number (절약 가능 용량, 예 1.2GB → bytes)"
    },
    "categories": [
      {
        "type": "string(DUPLICATE|EXPIRING_COUPON|UNNECESSARY_SCREENSHOT)",
        "title": "string (예: 중복 자료)",
        "description": "string (예: 비슷한 사진이 묶여 있어요)",
        "count": "number (건수)",
        "scanStatus": "string(READY|SCANNING)",
        "actionRoute": "string (예: /cleanup/duplicates, /cleanup/screenshots, /library?expiringSoon=true)"
      }
    ],
    "optimizationInsight": {
      "title": "string (예: 최적화 제안)",
      "message": "string (예: 사용하지 않는 태그 3개를 삭제하여 로딩 속도를 개선할 수 있습니다.)"
    }
  },
  "error": null
}
```
- **에러**: 없음(신규 사용자면 categories 빈 배열, optimizationInsight null 가능)
- **비고**: `scanStatus=SCANNING`인 카테고리는 `count`가 잠정치일 수 있음. 프론트는 대시보드 재호출로 갱신(폴링 주기 미정 `[가정]`). `reclaimableBytes`는 READY 카테고리 합계 기준.

---

### CLEAN-02: 중복 그룹 목록 조회
> 화면: duplicate_review. 중복 그룹과 그룹별 후보 항목(해상도/촬영일/용량/추천 유지본)을 반환. 화면은 단일 그룹을 보여주나 목록 API로 정의하고 `groupId`로 상세 진입.
- **Method/Path**: `GET /api/cleanup/duplicates?page={page}&size={size}`
- **인증**: 필요
- **Query 파라미터**: 페이지네이션 표준(기본 page=0, size=20). `status` 고정 PENDING만 반환(`[가정]`).
- **Request Body**: 없음
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "groups": [
      {
        "groupId": "number",
        "type": "DUPLICATE",
        "summary": "string (예: 3개의 유사한 스크린샷을 찾았습니다.)",
        "estimatedSaveBytes": "number (예: 12.4MB → bytes)",
        "candidates": [
          {
            "itemId": "number",
            "thumbnailUrl": "string|null (vaulted면 null)",
            "width": "number",
            "height": "number",
            "fileSize": "number (bytes)",
            "capturedAt": "string(ISO 8601)",
            "recommendedKeep": "boolean (최고 화질 배지)"
          }
        ]
      }
    ],
    "page": 0, "size": 20, "totalElements": 1, "totalPages": 1, "hasNext": false
  },
  "error": null
}
```
- **에러**: `400 VALIDATION_ERROR`(페이지 파라미터 오류)
- **비고**: `candidates`는 화질 우수순 정렬(`[가정]`), 최소 2개. `recommendedKeep=true`는 그룹당 1개(화면 "최고 화질" 기본 선택).

---

### CLEAN-03: 중복 그룹 정리 실행 (유지 1개 + 나머지 삭제)
> 화면: duplicate_review "나머지 정리하기". 유지할 `keepItemId`를 받아 그룹 내 나머지를 삭제(휴지통)하고 그룹을 RESOLVED로 전이. **삭제 물리로직은 ITEM-09 재사용**, 본 엔드포인트는 그룹 상태 전이 + 삭제를 원자적으로 래핑.
- **Method/Path**: `POST /api/cleanup/duplicates/{groupId}/resolve`
- **인증**: 필요
- **Request Body**:
```json
{ "keepItemId": "number(필수) — 그룹 후보 중 유지할 항목 id" }
```
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "groupId": "number",
    "status": "RESOLVED",
    "keptItemId": "number",
    "deletedItemIds": ["number"],
    "savedBytes": "number (실제 확보 용량)",
    "failedIds": ["number"]
  },
  "error": null
}
```
- **에러**: `400 VALIDATION_ERROR`(keepItemId 누락/그룹 미소속), `404 CLEANUP_GROUP_NOT_FOUND`, `409 CLEANUP_GROUP_ALREADY_RESOLVED`, `422 BULK_PARTIAL_FAILURE`(일부 삭제 실패 시 `data.failedIds`)
- **비고**: 삭제는 소프트 삭제(휴지통). `keepItemId`가 그룹 후보가 아니면 400.

---

### CLEAN-04: 중복 그룹 해제 ("중복이 아니에요")
> 화면: duplicate_review "중복이 아니에요"(thumb_down). 그룹을 DISMISSED로 표시하고 항목은 삭제 없이 일반 라이브러리에 유지. 향후 재그룹화 제외.
- **Method/Path**: `POST /api/cleanup/duplicates/{groupId}/dismiss`
- **인증**: 필요
- **Request Body**: 없음
- **Response 200**:
```json
{ "success": true, "data": { "groupId": "number", "status": "DISMISSED" }, "error": null }
```
- **에러**: `404 CLEANUP_GROUP_NOT_FOUND`, `409 CLEANUP_GROUP_ALREADY_RESOLVED`
- **비고**: 항목 데이터는 변경하지 않음(그룹 링크만 해제).

---

### CLEAN-05: 불필요 스크린샷 후보 목록 조회
> 화면: unnecessary_screenshots. 사유(일회성/흐릿함/정보) 라벨과 추천 문구가 붙은 후보 목록 + 사유별 카운트를 반환. 항목 삭제는 CLEAN-06(=ITEM-09)로 수행.
- **Method/Path**: `GET /api/cleanup/screenshots?reason={reason}&page={page}&size={size}`
- **인증**: 필요
- **Query 파라미터**:
  - `reason`: string(선택, `ONE_TIME`|`BLURRY`|`INFO`) — 사유 필터(칩 클릭)
  - 페이지네이션 표준(기본 page=0, size=20)
- **Request Body**: 없음
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "candidates": [
      {
        "id": "number (후보 id)",
        "itemId": "number (→ Item)",
        "thumbnailUrl": "string|null",
        "title": "string (예: 탑승권 QR 코드)",
        "reason": "string(ONE_TIME|BLURRY|INFO)",
        "reasonLabel": "string (예: 일회성 / 흐릿함 / 정보 스크린샷)",
        "recommendationText": "string (예: 만료된 이벤트 또는 여행 티켓일 가능성이 큼.)",
        "capturedAt": "string(ISO 8601)",
        "defaultSelected": "boolean (진입 시 기본 체크 여부)"
      }
    ],
    "reasonCounts": [
      { "reason": "ONE_TIME", "label": "일회성", "count": 4 },
      { "reason": "BLURRY", "label": "흐릿함", "count": 1 }
    ],
    "page": 0, "size": 20, "totalElements": 12, "totalPages": 1, "hasNext": false
  },
  "error": null
}
```
- **에러**: `400 VALIDATION_ERROR`(reason 값 오류)
- **비고**: `defaultSelected`는 화면의 기본 체크 상태(일부 항목만 checked) 근거. `reasonCounts`는 현재 후보 전체 기준(필터 무관, `[가정]`).

---

### CLEAN-06: 후보 항목 휴지통 이동 (삭제) — item ITEM-09 재사용
> 화면: unnecessary_screenshots "N개 항목 휴지통으로 이동", duplicate_review 개별 삭제. **신규 엔드포인트 없음.** 선택 항목의 `itemId` 배열로 ITEM-09 호출.
- **Method/Path**: `POST /api/items/delete` (item 계약 ITEM-09)
- **인증**: 필요
- **Request Body**:
```json
{ "ids": ["number(필수, 1개 이상) — 스크린샷 후보의 itemId"] }
```
- **Response 200**:
```json
{ "success": true, "data": { "deletedCount": "number", "failedIds": ["number"] }, "error": null }
```
- **에러**: `400 VALIDATION_ERROR`(빈 배열), `422 BULK_PARTIAL_FAILURE`
- **비고**: 삭제 성공 시 해당 CleanupCandidate 상태는 서버가 TRASHED로 전이(`[가정]`). 프론트는 `id`가 아니라 `itemId`를 전달.

---

### CLEAN-07: 한꺼번에 정리하기 (추천 항목 일괄 실행)
> 화면: cleanup_dashboard FAB "한꺼번에 정리하기". 지정한 카테고리 타입의 추천 항목을 서버가 일괄 정리(중복은 추천 유지본 외 삭제, 스크린샷은 defaultSelected 삭제). `[가정]` 대상 미지정 시 전체 READY 카테고리.
- **Method/Path**: `POST /api/cleanup/run`
- **인증**: 필요
- **Request Body**:
```json
{ "types": ["string(선택, DUPLICATE|EXPIRING_COUPON|UNNECESSARY_SCREENSHOT) — 생략 시 전체"] }
```
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "deletedCount": "number",
    "savedBytes": "number",
    "resolvedGroupIds": ["number"],
    "byType": [ { "type": "DUPLICATE", "deletedCount": "number", "savedBytes": "number" } ],
    "failedIds": ["number"]
  },
  "error": null
}
```
- **에러**: `400 VALIDATION_ERROR`(types 값 오류), `422 BULK_PARTIAL_FAILURE`
- **비고**: `[가정]` 되돌리기는 휴지통 전제(소프트 삭제). 화면에 확인 다이얼로그 근거 약함 → 프론트에서 확인 UX 권장.

---

### CLEAN-08: 정리 리포트 조회
> 화면: cleanup_report. 주간 성과 + 누적 통계 + 디지털 위생 점수(브레이크다운) + 정리 제안. 읽기 전용.
- **Method/Path**: `GET /api/cleanup/report`
- **인증**: 필요
- **Request Body**: 없음
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "weekly": {
      "savedBytes": "number (예: 5.4GB → bytes)",
      "message": "string (예: 잘하고 있어요, Alex님!)"
    },
    "cumulative": {
      "savedBytes": "number (예: 12.8GB)",
      "savedBytesChangePercent": "number (지난달 대비, 예: 15)",
      "duplicatesRemoved": "number (예: 2481)"
    },
    "hygiene": {
      "score": "number (0~100, 예: 88)",
      "grade": "string (예: 훌륭함)",
      "breakdown": [
        { "key": "tagAccuracy", "label": "태그 정확도", "percent": 94 },
        { "key": "vaultOrganization", "label": "보관함 정리", "percent": 72 },
        { "key": "cleanupFrequency", "label": "정리 빈도", "percent": 85 }
      ]
    },
    "suggestions": [
      {
        "type": "string (예: OLD_SCREENSHOTS|LARGE_MEDIA)",
        "title": "string (예: 오래된 스크린샷)",
        "description": "string (예: 6개월 동안 열어보지 않은 항목 42개)",
        "count": "number|null",
        "actionRoute": "string|null"
      }
    ]
  },
  "error": null
}
```
- **에러**: 없음(신규 사용자면 0/빈 배열)
- **비고**: `grade`·`score` 산식은 서버 재량(`[가정]`). `suggestions`는 리포트 맥락의 제안으로 CLEAN-01 categories와 별개(리포트는 회고형, 대시보드는 실행형).

---

### CLEAN-09: 정리 설정 조회
> 화면: cleanup_settings. 자동화 토글 2종 + 미사용 임계값 슬라이더 현재값 + hero 절약 요약.
- **Method/Path**: `GET /api/cleanup/settings`
- **인증**: 필요
- **Request Body**: 없음
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "autoTrashExpired": "boolean (휴지통으로 자동 이동)",
    "smartScreenshotDetection": "boolean (스마트 스크린샷 감지)",
    "unusedThresholdDays": "number (30~365, 미사용 자료 기준)",
    "monthlySavedBytes": "number (hero: 이번 달 자동 정리 절약, 표시용)"
  },
  "error": null
}
```
- **에러**: 없음(설정 없으면 기본값 반환: autoTrashExpired=true, smartScreenshotDetection=false, unusedThresholdDays=90 — 화면 초기 상태 근거)
- **비고**: `monthlySavedBytes`는 읽기 전용 파생값. 경고 문구(비밀 금고·영구 보관 태그 제외)는 정적 카피 → API 불필요.

---

### CLEAN-10: 정리 설정 저장
> 화면: cleanup_settings 토글/슬라이더 변경. 전달된 필드만 갱신(부분 수정).
- **Method/Path**: `PUT /api/cleanup/settings`
- **인증**: 필요
- **Request Body** (모든 필드 선택, 최소 1개):
```json
{
  "autoTrashExpired": "boolean(선택)",
  "smartScreenshotDetection": "boolean(선택)",
  "unusedThresholdDays": "number(선택, 30~365)"
}
```
- **Response 200**: CLEAN-09와 동일 구조(갱신된 전체 설정 반환)
- **에러**: `400 VALIDATION_ERROR`(unusedThresholdDays 범위 초과 등)
- **비고**: `[가정]` 슬라이더는 30~365 정수. 자동 정리 로직에서 vaulted 항목·`영구 보관` 태그는 대상 제외(item 소유 규칙, 서버 강제).

---

## 엔드포인트 요약
| ID | Method | Path | 인증 |
|---|---|---|---|
| CLEAN-01 | GET | `/api/cleanup/dashboard` | 필요 |
| CLEAN-02 | GET | `/api/cleanup/duplicates` | 필요 |
| CLEAN-03 | POST | `/api/cleanup/duplicates/{groupId}/resolve` | 필요 |
| CLEAN-04 | POST | `/api/cleanup/duplicates/{groupId}/dismiss` | 필요 |
| CLEAN-05 | GET | `/api/cleanup/screenshots` | 필요 |
| CLEAN-06 | (재사용 ITEM-09) POST | `/api/items/delete` | 필요 |
| CLEAN-07 | POST | `/api/cleanup/run` | 필요 |
| CLEAN-08 | GET | `/api/cleanup/report` | 필요 |
| CLEAN-09 | GET | `/api/cleanup/settings` | 필요 |
| CLEAN-10 | PUT | `/api/cleanup/settings` | 필요 |
