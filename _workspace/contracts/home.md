# home (홈/검색) API 계약

> 모듈: home · 작성일: 2026-07-19 · 대상 화면: home_home_001_2, search_results_home_002_2, search_no_results_home_002
> 공통 규격: 응답 봉투 `{ success, data, error }`(common/ApiResponse.java와 동일), 필드 camelCase, 날짜 ISO 8601(UTC).
> 인증: 본 모듈 **모든 엔드포인트 인증 필요** — `Authorization: Bearer {accessToken}`. 누락/만료 시 auth 계약 `401 TOKEN_EXPIRED`/`401 TOKEN_INVALID`.

## 공통 규약 (item/auth 계약과 동일)
- **응답 봉투**: 성공 `{ "success": true, "data": {...}, "error": null }` / 실패 `{ "success": false, "data": null, "error": { "code", "message" } }`.
- **페이지네이션 표준**: `page`(0-base, 기본 0), `size`(기본 20, 최대 100), `sort`. 응답 `data`에 `page, size, totalElements, totalPages, hasNext` 포함.
- **Item 표준 표현**: contracts/item.md의 `item` 오브젝트 그대로 사용(id/type/title/category/thumbnailUrl/savedAt/favorite/vaulted/expiringSoon 등). 본 계약에서 재정의하지 않는다.
- **vaulted 마스킹**: item 계약과 동일 — `vaulted=true`면 `thumbnailUrl=null`, 잠금 표시용 최소 메타만 반환.
- **공통 에러**: `400 VALIDATION_ERROR`, `401 TOKEN_EXPIRED`/`TOKEN_INVALID`(auth 공유).

## 재사용 엔드포인트 (신규 정의 아님 — item 계약 참조)
| 홈 구성요소 | 재사용 엔드포인트 | 호출 예 |
|---|---|---|
| 최근 문서 가로 리스트 | ITEM-03 | `GET /api/items?sort=savedAt,desc&size=10` |
| 카테고리 그리드 카운트 | ITEM-14 | `GET /api/categories` |
| 카테고리 카드 탭 → 필터 결과 | ITEM-03 | `GET /api/items?category={name}` |
| 검색 결과 즐겨찾기 star | ITEM-08 | `PUT /api/items/{id}/favorite` |

> **신규 정의는 HOME-01, HOME-02 뿐.**

---

### HOME-01: 홈 대시보드 요약 조회
> 화면: home_home_001_2. 홈 진입 1회 호출로 정리 제안 + 최근 문서 + 카테고리 요약을 집계 반환(모바일 왕복 절감, `[가정]`). `recentItems`는 ITEM-03(sort=savedAt,desc) 형태, `categories`는 ITEM-14 형태를 참조.
- **Method/Path**: `GET /api/home/dashboard?recentSize={n}`
- **인증**: 필요
- **Query 파라미터**:
  - `recentSize`: number (선택, 기본 10, 최대 20) — 최근 문서 개수
- **Request Body**: 없음
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "type": "string(DUPLICATE_PHOTOS|EXPIRING_ITEMS)",
        "title": "string (예: 중복 사진 12건이 있어요)",
        "count": "number",
        "actionLabel": "string (예: 정리하기 / 확인하기)",
        "actionRoute": "string (예: /cleanup/duplicates, /library?filter=expiring)"
      }
    ],
    "recentItems": [ { "...Item 표준 표현 (contracts/item.md)" } ],
    "categories": [ { "name": "string", "itemCount": "number" } ]
  },
  "error": null
}
```
- **에러**: `400 VALIDATION_ERROR`(recentSize 범위 초과)
- **비고**: `suggestions`는 조건 없을 때 빈 배열(홈에서 섹션 숨김). `categories`·`recentItems`는 각각 ITEM-14·ITEM-03 결과와 동일 데이터로, 프론트가 개별 호출을 선호하면 본 필드를 무시하고 ITEM-03/ITEM-14를 직접 호출해도 된다.

---

### HOME-02: 자연어 검색
> 화면: search_results_home_002_2(결과), search_no_results_home_002(빈 상태). 자연어 질의를 해석(기간/유형 등)해 일치도 순 결과와 필터 추천을 반환한다. **ITEM-03의 `q`(단순 제목 부분일치)와 다른 기능 — 중복 아님.**
- **Method/Path**: `GET /api/home/search?q={query}&mode={mode}&page={page}&size={size}`
- **인증**: 필요
- **Query 파라미터**:
  - `q`: string (필수, 1~200자) — 자연어 질의
  - `mode`: string (선택, `NORMAL`|`ASSISTANT`, 기본 `NORMAL`) — `ASSISTANT`는 "Sortmate에게 물어보기"(OCR/AI 확장) `[가정]`
  - `page`/`size`: 페이지네이션 표준 (기본 page=0, size=20)
  - 정렬: 서버 고정 `matchScore desc` (`[가정]`, sort 파라미터 미노출)
- **Request Body**: 없음
- **Response 200** (결과 있음):
```json
{
  "success": true,
  "data": {
    "query": "string — 원문 질의",
    "interpretations": [
      {
        "type": "string(PERIOD|ITEM_TYPE|LOCATION|KEYWORD)",
        "label": "string (예: 기간: 6월)",
        "value": "string (예: 2024-06)"
      }
    ],
    "results": [
      {
        "...Item 표준 표현 (contracts/item.md)",
        "matchScore": "number (0~100, 일치도 %)"
      }
    ],
    "refinedFilters": [
      {
        "id": "string",
        "title": "string (예: 연결 성공한 항목만 보기)",
        "description": "string",
        "params": { "...HOME-02 재호출용 추가 필터 파라미터 (자유 key-value)" }
      }
    ],
    "assistantHint": "string|null — AI 안내 문구(OCR 등). 없으면 null",
    "page": 0, "size": 20, "totalElements": 4, "totalPages": 1, "hasNext": false
  },
  "error": null
}
```
- **Response 200** (결과 없음 — 빈 상태 화면):
```json
{
  "success": true,
  "data": {
    "query": "계란 없는 블루베리 팬케이크 레시피",
    "interpretations": [ ],
    "results": [ ],
    "refinedFilters": [ ],
    "assistantHint": "이미지 내부의 텍스트도 검색할 수 있습니다. 스크린샷에서 '블루베리'를 찾아볼까요?",
    "page": 0, "size": 20, "totalElements": 0, "totalPages": 0, "hasNext": false
  },
  "error": null
}
```
- **에러**: `400 VALIDATION_ERROR`(q 누락/길이 초과, mode 값 오류)
- **비고**:
  - 빈 결과는 에러가 아니라 `200 + results: []`. 프론트가 이를 "검색 결과 없음" 화면으로 렌더.
  - vaulted 결과는 item 계약과 동일 마스킹(썸네일 null + lock).
  - "필터 초기화"·"다른 검색어" = 프론트가 `q`/필터를 바꿔 재호출(별도 엔드포인트 없음).
  - `refinedFilters[].params`는 프론트가 다음 HOME-02 호출 쿼리에 병합해 재질의하는 자유 형식 힌트(`[가정]` 서버-프론트 합의 key 사용).

---

## 엔드포인트 요약
| ID | Method | Path | 인증 |
|---|---|---|---|
| HOME-01 | GET | `/api/home/dashboard` | 필요 |
| HOME-02 | GET | `/api/home/search` | 필요 |
| (재사용) ITEM-03 | GET | `/api/items` | 필요 |
| (재사용) ITEM-14 | GET | `/api/categories` | 필요 |
| (재사용) ITEM-08 | PUT | `/api/items/{id}/favorite` | 필요 |
