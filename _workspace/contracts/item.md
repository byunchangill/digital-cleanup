# item (라이브러리 핵심) API 계약

> 모듈: item · 작성일: 2026-07-19 · 대상 화면: gallery_import_add_002, memo_writing_add_004, item_detail_lib_003_2, favorites_lib_005, bulk_selection_lib_001
> 공통 규격: 응답 봉투 `{ success, data, error }`(common/ApiResponse.java와 동일), 필드 camelCase, 날짜 ISO 8601(UTC, 예 `2026-07-19T09:00:00Z`).
> 인증: 본 모듈 **모든 엔드포인트는 인증 필요** — `Authorization: Bearer {accessToken}`(auth 모듈 발급 JWT). 누락/만료 시 auth 계약의 `401 TOKEN_EXPIRED`/`401 TOKEN_INVALID`.

## 공통 규약

### 응답 봉투
- 성공: `{ "success": true, "data": { ... }, "error": null }`
- 실패: `{ "success": false, "data": null, "error": { "code": "STRING", "message": "STRING" } }`

### 페이지네이션 표준 (목록 공통)
- 쿼리: `page`(0-base, 기본 0), `size`(기본 20, 최대 100), `sort`(기본 `savedAt,desc`).
- 응답 `data` 공통 필드: `items`(배열), `page`, `size`, `totalElements`, `totalPages`, `hasNext`.

### Item 표준 표현 (목록/상세 공통 `item` 오브젝트)
```json
{
  "id": "number",
  "type": "string(IMAGE|SCREENSHOT|LINK|DOCUMENT|MEMO)",
  "title": "string",
  "category": "string|null",
  "thumbnailUrl": "string|null (vaulted=true면 null)",
  "sourceApp": "string|null (예: 카카오톡, medium.com)",
  "fileSize": "number|null (bytes)",
  "mimeType": "string|null",
  "tags": ["string"],
  "aiClassified": "boolean",
  "expiryDate": "string(ISO 8601 date)|null",
  "expiringSoon": "boolean (expiryDate 30일 이내)",
  "favorite": "boolean",
  "vaulted": "boolean",
  "savedAt": "string(ISO 8601)"
}
```
> `vaulted=true`인 Item은 `thumbnailUrl`·`aiSummary`·`fileUrl`을 null로 마스킹하고 잠금 표시용 메타(title/category/type)만 반환한다. `[가정]` — 화면 블러 처리 근거. 실제 열람은 vault 모듈.

### 공통 에러 코드
| HTTP | code | 발생 조건 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 요청 필드 형식/제약 위반 |
| 401 | `TOKEN_EXPIRED` / `TOKEN_INVALID` | 인증 실패 (auth 계약 공유) |
| 403 | `ITEM_FORBIDDEN` | 타 사용자 소유 Item 접근 |
| 404 | `ITEM_NOT_FOUND` | 존재하지 않는 Item |
| 413 | `FILE_TOO_LARGE` | 업로드 파일 크기 초과 |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | 허용되지 않은 파일 형식 |
| 422 | `BULK_PARTIAL_FAILURE` | 일괄 작업 일부 실패 (data에 상세) |

---

### ITEM-01: 갤러리 사진 가져오기 (다중 업로드)
> 화면: gallery_import_add_002. 선택한 N장을 Item으로 등록. `[가정]` multipart 다중 파일.
- **Method/Path**: `POST /api/items/import`
- **인증**: 필요
- **Content-Type**: `multipart/form-data`
- **Request (parts)**:
  - `files`: 파일[] (필수, 1개 이상, 각 최대 `[가정]` 20MB, image/*)
  - `sourceType`: string (선택, `SCREENSHOT`|`PHOTO`, 기본 `PHOTO`) — "스크린샷만" 필터 힌트
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "importedCount": "number",
    "items": [ { "id": "number", "type": "SCREENSHOT", "title": "string", "thumbnailUrl": "string", "savedAt": "string" } ]
  },
  "error": null
}
```
- **에러**: `400 VALIDATION_ERROR`(파일 없음), `413 FILE_TOO_LARGE`, `415 UNSUPPORTED_MEDIA_TYPE`

---

### ITEM-02: 메모 아이템 생성
> 화면: memo_writing_add_004. type=MEMO. 첨부 이미지는 사전 업로드된 URL 또는 별도 multipart. `[가정]` JSON 본문 + 첨부는 `attachmentIds` 참조.
- **Method/Path**: `POST /api/items/memo`
- **인증**: 필요
- **Request Body**:
```json
{
  "title": "string(선택, 최대 200자) — 미입력 시 '제목 없음'",
  "body": "string(선택) — 서식은 마크다운",
  "tags": ["string(선택, 각 최대 30자)"],
  "category": "string(선택)",
  "vaulted": "boolean(선택, 기본 false) — '비밀 보관함' 토글",
  "attachmentIds": ["number(선택) — 사전 업로드한 미디어 Item id"]
}
```
- **Response 200**:
```json
{ "success": true, "data": { "item": { "...Item 표준 표현, type=MEMO" } }, "error": null }
```
- **에러**: `400 VALIDATION_ERROR`

---

### ITEM-03: 라이브러리 아이템 목록 조회
> 화면: bulk_selection_lib_001. type/category 필터 + 페이지네이션.
- **Method/Path**: `GET /api/items?type={type}&category={category}&favorite={bool}&vaulted={bool}&q={query}&page={page}&size={size}&sort={sort}`
- **인증**: 필요
- **Query 파라미터**:
  - `type`: string(선택, IMAGE|SCREENSHOT|LINK|DOCUMENT|MEMO)
  - `category`: string(선택, 예: 스크린샷/영수증/기사)
  - `favorite`: boolean(선택) — true면 즐겨찾기만
  - `vaulted`: boolean(선택, 기본 false) — 기본은 vault 제외
  - `q`: string(선택) — title 부분일치
  - `page`/`size`/`sort`: 페이지네이션 표준
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "items": [ { "...Item 표준 표현" } ],
    "page": 0, "size": 20, "totalElements": 137, "totalPages": 7, "hasNext": true
  },
  "error": null
}
```
- **에러**: `400 VALIDATION_ERROR`(잘못된 type/sort)

---

### ITEM-04: 아이템 상세 조회
> 화면: item_detail_lib_003_2. 메타·태그·AI요약·출처·저장일.
- **Method/Path**: `GET /api/items/{id}`
- **인증**: 필요
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "item": {
      "...Item 표준 표현",
      "body": "string|null",
      "fileUrl": "string|null (원본, vaulted면 null)",
      "aiSummary": "string|null",
      "sourceApp": "string|null"
    }
  },
  "error": null
}
```
- **에러**: `404 ITEM_NOT_FOUND`, `403 ITEM_FORBIDDEN`

---

### ITEM-05: 관련 아이템 조회
> 화면: item_detail "함께 사용하기 좋은 아이템". `[가정]` 동일 category/tag 기반 추천 상위 N건.
- **Method/Path**: `GET /api/items/{id}/related?limit={limit}`
- **인증**: 필요
- **Query**: `limit`(선택, 기본 4, 최대 20)
- **Response 200**:
```json
{
  "success": true,
  "data": { "items": [ { "id": "number", "title": "string", "thumbnailUrl": "string|null", "expiryDate": "string|null" } ] },
  "error": null
}
```
- **에러**: `404 ITEM_NOT_FOUND`

---

### ITEM-06: 아이템 수정
> 화면: item_detail "수정하기". 부분 수정(PATCH). 전달된 필드만 변경.
- **Method/Path**: `PATCH /api/items/{id}`
- **인증**: 필요
- **Request Body** (모든 필드 선택, 최소 1개):
```json
{
  "title": "string(선택, 최대 200자)",
  "body": "string(선택)",
  "category": "string(선택)",
  "tags": ["string(선택) — 전체 치환"]
}
```
- **Response 200**:
```json
{ "success": true, "data": { "item": { "...Item 표준 표현" } }, "error": null }
```
- **에러**: `400 VALIDATION_ERROR`, `404 ITEM_NOT_FOUND`, `403 ITEM_FORBIDDEN`

---

### ITEM-07: 즐겨찾기 목록 조회
> 화면: favorites_lib_005. ITEM-03의 `favorite=true` 프리셋. 별도 경로로 명시(프론트 라우트 직결).
- **Method/Path**: `GET /api/items/favorites?type={type}&q={query}&page={page}&size={size}`
- **인증**: 필요
- **Query**: `type`(선택, IMAGE|LINK|DOCUMENT), `q`(선택, title 부분일치), 페이지네이션 표준
- **Response 200**: ITEM-03과 동일 구조(`favorite=true`만 포함)
- **비고**: 내부 구현은 ITEM-03과 공유 가능. `vaulted` Item도 favorite면 잠금 메타로 포함(화면상 vault 카드 존재).
- **에러**: `400 VALIDATION_ERROR`

---

### ITEM-08: 즐겨찾기 토글
> 화면: favorites/item_detail 하트 버튼.
- **Method/Path**: `PUT /api/items/{id}/favorite`
- **인증**: 필요
- **Request Body**:
```json
{ "favorite": "boolean(필수)" }
```
- **Response 200**:
```json
{ "success": true, "data": { "id": "number", "favorite": true }, "error": null }
```
- **에러**: `404 ITEM_NOT_FOUND`, `403 ITEM_FORBIDDEN`

---

### ITEM-09: 아이템 삭제 (단건/일괄)
> 화면: bulk_selection "삭제", item_detail more_vert. 다중 id 지원.
- **Method/Path**: `POST /api/items/delete`
- **인증**: 필요
- **Request Body**:
```json
{ "ids": ["number(필수, 1개 이상)"] }
```
- **Response 200**:
```json
{ "success": true, "data": { "deletedCount": "number", "failedIds": ["number"] }, "error": null }
```
- **에러**: `400 VALIDATION_ERROR`(빈 배열), `422 BULK_PARTIAL_FAILURE`(일부 실패 시 `data.failedIds`)
- **비고**: 단건 삭제도 `ids: [id]`로 처리(엔드포인트 단일화). `[가정]` 소프트 삭제 여부는 backend 재량이나 "정리" 탭 존재로 휴지통 정책 가능(별도 모듈).

---

### ITEM-10: 일괄 카테고리 이동
> 화면: bulk_selection "이동"(drive_file_move). 선택 항목 category 일괄 변경.
- **Method/Path**: `POST /api/items/bulk/category`
- **인증**: 필요
- **Request Body**:
```json
{ "ids": ["number(필수)"], "category": "string(필수)" }
```
- **Response 200**:
```json
{ "success": true, "data": { "updatedCount": "number", "failedIds": ["number"] }, "error": null }
```
- **에러**: `400 VALIDATION_ERROR`, `422 BULK_PARTIAL_FAILURE`

---

### ITEM-11: 일괄 태그 추가
> 화면: bulk_selection "태그". 선택 항목에 태그 append(기존 유지).
- **Method/Path**: `POST /api/items/bulk/tags`
- **인증**: 필요
- **Request Body**:
```json
{ "ids": ["number(필수)"], "tags": ["string(필수, 1개 이상, 각 최대 30자)"] }
```
- **Response 200**:
```json
{ "success": true, "data": { "updatedCount": "number", "failedIds": ["number"] }, "error": null }
```
- **에러**: `400 VALIDATION_ERROR`, `422 BULK_PARTIAL_FAILURE`

---

### ITEM-12: 비밀 보관함으로 이동 (vaulted 토글)
> 화면: item_detail "비밀 보관함으로 이동", memo_writing "비밀 보관함" 토글. `vaulted` 플래그만 변경. **PIN 검증은 vault 모듈 소관 — 본 계약에 PIN 필드 없음.**
- **Method/Path**: `PUT /api/items/{id}/vault`
- **인증**: 필요
- **Request Body**:
```json
{ "vaulted": "boolean(필수)" }
```
- **Response 200**:
```json
{ "success": true, "data": { "id": "number", "vaulted": true }, "error": null }
```
- **에러**: `404 ITEM_NOT_FOUND`, `403 ITEM_FORBIDDEN`
- **비고**: `[가정]` vault로 **넣을 때**는 잠금만 걸면 되지만, **뺄 때**(vaulted=false)는 vault unlock이 선행되어야 함 → 프론트가 vault 세션 언락 후 호출한다는 전제. 서버는 플래그만 처리.

---

### ITEM-13: 아이템 공유
> 화면: item_detail "공유하기", bulk_selection "공유". `[가정]` 공유 링크/토큰 발급. 화면 근거 약해 최소 계약.
- **Method/Path**: `POST /api/items/share`
- **인증**: 필요
- **Request Body**:
```json
{ "ids": ["number(필수, 1개 이상)"] }
```
- **Response 200**:
```json
{ "success": true, "data": { "shareUrl": "string", "expiresAt": "string(ISO 8601)|null" }, "error": null }
```
- **에러**: `400 VALIDATION_ERROR`, `404 ITEM_NOT_FOUND`
- **비고**: vaulted Item은 공유 불가(`[가정]` — 보안). 포함 시 `400 VALIDATION_ERROR`.

---

### ITEM-14: 카테고리 목록 조회
> 화면: favorites/bulk_selection 필터 칩 구성용. `[가정]` 미구현 시 Item.category distinct로 대체 가능.
- **Method/Path**: `GET /api/categories`
- **인증**: 필요
- **Response 200**:
```json
{
  "success": true,
  "data": { "categories": [ { "name": "string", "itemCount": "number" } ] },
  "error": null
}
```
- **에러**: 없음(빈 배열 가능)

---

## 엔드포인트 요약
| ID | Method | Path | 인증 |
|---|---|---|---|
| ITEM-01 | POST | `/api/items/import` (multipart) | 필요 |
| ITEM-02 | POST | `/api/items/memo` | 필요 |
| ITEM-03 | GET | `/api/items` | 필요 |
| ITEM-04 | GET | `/api/items/{id}` | 필요 |
| ITEM-05 | GET | `/api/items/{id}/related` | 필요 |
| ITEM-06 | PATCH | `/api/items/{id}` | 필요 |
| ITEM-07 | GET | `/api/items/favorites` | 필요 |
| ITEM-08 | PUT | `/api/items/{id}/favorite` | 필요 |
| ITEM-09 | POST | `/api/items/delete` | 필요 |
| ITEM-10 | POST | `/api/items/bulk/category` | 필요 |
| ITEM-11 | POST | `/api/items/bulk/tags` | 필요 |
| ITEM-12 | PUT | `/api/items/{id}/vault` | 필요 |
| ITEM-13 | POST | `/api/items/share` | 필요 |
| ITEM-14 | GET | `/api/categories` | 필요 |
