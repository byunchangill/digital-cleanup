# admin (관리자) API 계약

> 모듈: admin · 작성일: 2026-07-20 · 대상 화면: admin_dashboard_adm_001, admin_member_cs_management_adm_003_2, classification_quality_adm_002_2
> 공통 규격: 응답 봉투 `{ success, data, error }`(common/ApiResponse.java와 동일), 필드 camelCase, 날짜 ISO 8601(UTC, 예 `2026-07-20T09:00:00Z`).
> **AI/CS 미연동 → AI 지표·오분류 클러스터·CS 티켓·Validation Pack은 근사/데모/stub.** 과도한 엔지니어링 금지(YAGNI).

## 권한 규약 (본 모듈 핵심)
- **모든 admin 엔드포인트(ADM-01~06)는 인증 + `role=ADMIN` 필요.** `Authorization: Bearer {accessToken}`(auth JWT).
- 인증 실패(토큰 누락/만료/무효): auth 계약의 `401 TOKEN_EXPIRED`/`401 TOKEN_INVALID`.
- **인증됐으나 `role≠ADMIN`: `403 ADMIN_REQUIRED`** (신규 코드, 발생 조건: 일반 사용자가 admin API 호출).
- `User.role` 필드는 현재 auth 모듈에 없음 → **본 계약 하단 "auth 계약 확장 필요" 참조. backend-dev가 User 엔티티·auth.md에 반영.**

## 집계 범위 규약
- 기존 item/home/cleanup 계약은 전부 "본인 소유(userId)"만 조회. **admin 계약은 전 사용자 전역 집계** — 소유자 필터 없이 users/items 전체 대상. 성능 민감 집계(총 아이템 수, 저장공간 합)는 backend 재량 캐싱.

## 공통 에러 코드
| HTTP | code | 발생 조건 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 요청 필드/쿼리 형식·제약 위반 |
| 401 | `TOKEN_EXPIRED` / `TOKEN_INVALID` | 인증 실패(auth 계약 공유) |
| 403 | `ADMIN_REQUIRED` | 인증됐으나 role≠ADMIN (**admin 신규**) |
| 404 | `NOT_FOUND` | 존재하지 않는 리소스 |

---

### ADM-01: 운영 대시보드 집계 조회
> 화면: admin_dashboard_adm_001 전체 + admin_member_cs_management_adm_003_2 상단 KPI 카드. **두 화면의 KPI를 단일 응답으로 공용.**
- **Method/Path**: `GET /api/admin/dashboard`
- **인증**: 필요 (ADMIN)
- **Request Body**: 없음
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "totalUsers": "number — 총 가입자/총 회원 수 (전역)",
    "totalUsersDeltaPercent": "number — 증감률(예 12.5), [가정] 데모/기간대비",
    "savedToday": "number — 오늘 저장된 자료 건수 (전역, 오늘 00:00 KST 이후 생성 Item)",
    "totalItems": "number — 누적 저장 자료 총합 (전역)",
    "aiSuccessRate": "number — AI 분석 성공률 %(예 99.4). [가정] aiClassified=true 비율 근사 또는 데모 상수",
    "aiAvgResponseMs": "number — 평균 응답 속도 ms(예 1200). [가정] 데모 상수",
    "aiStatus": "string(STABLE|DEGRADED) — [가정] 데모",
    "activeSessions": "number — 활성 세션 수. [가정] 데모 상수(세션 추적 인프라 없음)",
    "unresolvedCs": "number — 미처리 CS 수 (CsTicket status!=RESOLVED)",
    "urgentCs": "number — 그 중 긴급 건수 (urgency=URGENT)",
    "serverStatus": "string(NORMAL|WARNING|CRITICAL) — [가정] 데모",
    "uptimePercent": "number — 최근 30일 uptime %(예 99.98). [가정] 데모 상수",
    "recentSubscribers": [
      {
        "id": "number",
        "displayName": "string",
        "email": "string",
        "plan": "string(FREE|BASIC|PREMIUM)",
        "status": "string(ACTIVE|DORMANT|PENDING)",
        "joinedAt": "string(ISO 8601)"
      }
    ],
    "recentInquiries": [
      {
        "id": "number",
        "subject": "string",
        "type": "string(PAYMENT_ERROR|FEATURE_REQUEST|GENERAL)",
        "urgency": "string(URGENT|NORMAL)"
      }
    ]
  },
  "error": null
}
```
- **에러**: `401 *`, `403 ADMIN_REQUIRED`
- **비고**:
  - `recentSubscribers`는 최신 가입 순 상위 `[가정]` 4건(화면 4행). 프론트 상대시간("2분 전")은 `joinedAt`로 계산.
  - `recentInquiries`는 미처리 CS 상위 `[가정]` 2건(화면 2행). 상세 목록은 ADM-04.
  - 회원관리 화면 카드(총 회원/활성 세션/미처리 CS/시스템 상태)는 본 응답의 `totalUsers`/`activeSessions`/`unresolvedCs`+`urgentCs`/`serverStatus` 재사용.

---

### ADM-02: 회원 목록 조회 (검색/필터/페이지네이션)
> 화면: admin_member_cs_management_adm_003_2 회원 목록 테이블 + 검색 + 필터 + 페이지네이션.
- **Method/Path**: `GET /api/admin/users?q={query}&status={status}&plan={plan}&page={page}&size={size}&sort={sort}`
- **인증**: 필요 (ADMIN)
- **Query 파라미터**:
  - `q`: string(선택) — 이름/이메일 부분일치(화면 "회원 이름, 이메일 검색")
  - `status`: string(선택, ACTIVE|DORMANT|PENDING) — 필터
  - `plan`: string(선택, FREE|BASIC|PREMIUM) — 필터 `[가정]`(화면 "필터" 버튼 상세 미설계)
  - `page`: number(0-base, 기본 0), `size`: number(기본 10, 최대 100) — 화면 "1-10 표시"
  - `sort`: string(기본 `createdAt,desc`)
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "number",
        "displayName": "string",
        "email": "string",
        "joinedAt": "string(ISO 8601) — 화면 '가입일'",
        "storageUsedBytes": "number — 사용자 소유 Item fileSize 합 [가정]",
        "storageQuotaBytes": "number — [가정] 상수 53687091200 (50GB)",
        "storagePercent": "number — used/quota*100, 소수1자리",
        "plan": "string(FREE|BASIC|PREMIUM)",
        "status": "string(ACTIVE|DORMANT|PENDING)"
      }
    ],
    "page": 0, "size": 10, "totalElements": 24592, "totalPages": 2460, "hasNext": true
  },
  "error": null
}
```
- **에러**: `400 VALIDATION_ERROR`(잘못된 status/plan/sort), `401 *`, `403 ADMIN_REQUIRED`
- **비고**: 화면 more_vert(회원별 조치) 메뉴는 상세 화면 미설계 → 조치 API 미정의(YAGNI). `storageUsedBytes` 집계 비용 크면 backend 재량 캐싱/근사.

---

### ADM-03: 회원 목록 CSV 내보내기
> 화면: admin_member_cs_management_adm_003_2 "CSV 내보내기" 버튼.
- **Method/Path**: `GET /api/admin/users/export?q={query}&status={status}&plan={plan}`
- **인증**: 필요 (ADMIN)
- **Query**: ADM-02와 동일 필터(페이지네이션 제외 — 전체 내보내기)
- **Response 200**: **봉투 아님.** `Content-Type: text/csv; charset=UTF-8`, `Content-Disposition: attachment; filename="members.csv"`
  - 컬럼: `id,displayName,email,joinedAt,storageUsedBytes,storageQuotaBytes,storagePercent,plan,status`
- **에러**: `400 VALIDATION_ERROR`, `401 *`, `403 ADMIN_REQUIRED` (에러는 봉투 JSON으로 반환)
- **비고**: `[가정]` 대용량 시 스트리밍/행수 상한은 backend 재량. 화면 근거상 최소 구현이면 충분.

---

### ADM-04: CS 문의(티켓) 목록 조회  `[가정] 데모 데이터`
> 화면: admin_dashboard_adm_001 문의 내역 요약, admin_member_cs_management_adm_003_2 미처리 CS 카드/FAB. **실제 CS 시스템 연동 범위 밖 → 데모 시드.**
- **Method/Path**: `GET /api/admin/cs/tickets?status={status}&urgency={urgency}&page={page}&size={size}`
- **인증**: 필요 (ADMIN)
- **Query**: `status`(선택, OPEN|IN_PROGRESS|RESOLVED), `urgency`(선택, URGENT|NORMAL), 페이지네이션(기본 page 0, size 20)
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "number",
        "subject": "string",
        "type": "string(PAYMENT_ERROR|FEATURE_REQUEST|GENERAL)",
        "urgency": "string(URGENT|NORMAL)",
        "status": "string(OPEN|IN_PROGRESS|RESOLVED)",
        "createdAt": "string(ISO 8601)"
      }
    ],
    "page": 0, "size": 20, "totalElements": 42, "totalPages": 3, "hasNext": true
  },
  "error": null
}
```
- **에러**: `400 VALIDATION_ERROR`, `401 *`, `403 ADMIN_REQUIRED`
- **비고**: **조회 전용.** 티켓 생성/응답/상태변경 API는 화면(작성·응답 폼) 미설계 → 미정의. backend는 seed 데모 티켓만 제공.

---

### ADM-05: 분류 품질 지표 조회  `[가정] AI 근사/데모`
> 화면: classification_quality_adm_002_2 정확도 추이 차트 + 오분류 클러스터 + AI 제안. **단일 응답으로 화면 전체 구성.**
- **Method/Path**: `GET /api/admin/classification/quality?range={range}`
- **인증**: 필요 (ADMIN)
- **Query**: `range`(선택, `30D`|`90D`, 기본 `30D`) — 화면 30D/90D 토글
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "avgAccuracy": "number — 기간 평균 정확도 %(예 94.2). [가정] aiClassified 비율 근사 또는 데모",
    "deltaPercent": "number — 전기간 대비 증감(예 2.4)",
    "trend": [
      { "date": "string(ISO 8601 date)", "accuracy": "number" }
    ],
    "clusters": [
      {
        "categoryA": "string(예 Shopping)",
        "categoryB": "string(예 Receipts)",
        "biasLevel": "string(HIGH|MEDIUM|LOW)",
        "correctionRate": "number — %(예 42)",
        "eventCount": "number — 이벤트 수(예 1200)"
      }
    ],
    "suggestion": {
      "title": "string — 예 'Increase sampling rate for OCR-heavy documents.'",
      "detail": "string"
    }
  },
  "error": null
}
```
- **에러**: `400 VALIDATION_ERROR`(잘못된 range), `401 *`, `403 ADMIN_REQUIRED`
- **비고**: `trend`/`clusters`/`suggestion`은 **데모 데이터**(시계열·오분류 상관·제안은 AI 파이프라인 산물, 현 단계 없음). `avgAccuracy`만 aiClassified 비율로 근사 가능. 프론트 차트/막대는 `trend`/`correctionRate`로 렌더.

---

### ADM-06: Validation Pack 실행  `[가정] stub`
> 화면: classification_quality_adm_002_2 "Run Validation Pack" 버튼. **모델 재학습/검증 파이프라인 범위 밖 → 접수 stub.**
- **Method/Path**: `POST /api/admin/classification/validation-pack`
- **인증**: 필요 (ADMIN)
- **Request Body**: 없음
- **Response 202** (접수됨):
```json
{
  "success": true,
  "data": { "runId": "string", "status": "QUEUED", "message": "검증 팩 실행이 접수되었습니다." },
  "error": null
}
```
- **에러**: `401 *`, `403 ADMIN_REQUIRED`, `429 RATE_LIMITED`(남용 방지, `[가정]`)
- **비고**: no-op stub로 충분(ITEM-15 재분석 stub과 동일 패턴). 진행 조회/폴링은 파이프라인 연동 시 별도 정의(현재 불필요, YAGNI).

---

## auth 계약 확장 필요 (backend-dev가 auth.md·User 엔티티에 반영)
> **admin 계약에서만 정리. auth.md는 직접 수정하지 않았다.** backend-dev가 아래를 User 엔티티(`backend/.../auth/entity/User.java`)와 auth.md에 반영할 것.
1. `User.role`: `enum Role { USER, ADMIN }`, `@Enumerated(EnumType.STRING)`, non-null 기본 `USER`. AUTH-02/08 가입은 항상 USER. ADMIN 승격은 시드/DB 수동(승격 API 화면 근거 없음).
2. `User.plan`: `enum Plan { FREE, BASIC, PREMIUM }`, non-null 기본 `FREE`.
3. `User.status`: `enum UserStatus { ACTIVE, DORMANT, PENDING }`, non-null 기본 `ACTIVE`.
4. 인가: admin 라우트는 `role=ADMIN` 가드. 미충족 시 `403 ADMIN_REQUIRED`를 auth/공통 에러표에 추가.
5. (선택) AUTH-02/08 응답 `user`에 `role` 노출 → 프론트 `/admin` 진입 판단 편의. 미노출 시 프론트는 admin API 403으로 판단.

## 엔드포인트 요약
| ID | Method | Path | 인증 |
|---|---|---|---|
| ADM-01 | GET | `/api/admin/dashboard` | ADMIN |
| ADM-02 | GET | `/api/admin/users` | ADMIN |
| ADM-03 | GET | `/api/admin/users/export` (CSV) | ADMIN |
| ADM-04 | GET | `/api/admin/cs/tickets` | ADMIN |
| ADM-05 | GET | `/api/admin/classification/quality` | ADMIN |
| ADM-06 | POST | `/api/admin/classification/validation-pack` | ADMIN |
