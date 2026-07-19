# item 모듈 QA 리포트 (2026-07-19)

> 기준: contracts/item.md(14 엔드포인트) · 정적 3자 교차 비교 + 동적 검증
> 빌드: backend `gradlew.bat build` BUILD SUCCESSFUL / frontend `npm run build` 통과
> **재검증(2026-07-19, 2차): QA-01 / QA-02 모두 수정 확인 → 통과.**

## 요약(2차 재검증 후): 통과 26 / 실패 0 / 보류 1 → **최종 통과**

### 재검증 결과 (수정본, 최신 빌드 :8086 별도 기동 — 스테일 8080 회피)
- **QA-01 → 통과(FIXED)**: `BulkSelectionPage.jsx:50-91` `afterBulk(successCount, failedIds, verb)` 중앙화 확인 — 성공 0이면 에러 토스트+동작 미수행, 부분성공이면 "N개 …, M건 실패" 병기. `ItemDetailPage.jsx:72-79` `deletedCount===0`이면 이탈 안 함. `itemMock.js:127-138` `splitByExistence`로 존재하지 않는 id를 failedIds에 채움. frontend `npm run build` 통과. 백엔드 부분실패 동작 재확인: `POST /items/delete {"ids":[999999]}` → `200 {"deletedCount":0,"failedIds":[999999]}`.
- **QA-02 → 통과(FIXED)**: 무헤더/무효토큰 `GET /api/items` → `401 {"success":false,"error":{"code":"TOKEN_INVALID","message":"토큰이 유효하지 않습니다."}}` (봉투 준수). 정상 토큰 경로 정상. JwtAuthenticationEntryPoint + SecurityConfig 배선 확인.

---

## (1차) 요약: 통과 24 / 실패 2 / 보류 1

- 경로·메서드·요청/응답 스키마(14 엔드포인트): 계약↔백엔드↔프론트 3자 일치.
- 응답 봉투 해제(client.js 인터셉터) ↔ 페이지 `data` 접근: 이중해제/미해제 없음.
- 에러코드 enum·404·vault-share 400 가드: 동적 확인 통과.
- 실패 2건은 아래 상세.

---

## 실패 항목

### QA-01: 일괄 작업 부분 실패(`failedIds`) 미처리 — 프론트가 실패를 성공으로 표기
- **상태: ✅ FIXED (2차 재검증 통과)**
- **담당**: frontend-dev
- **근거(계약/백엔드 보고)**: 백엔드는 ITEM-09/10/11 부분 실패를 `200 + data.failedIds`로 반환(item_done.md "계약과 달라진 점 1"). 프론트는 "`failedIds` 비어있지 않음"으로 부분 실패를 판단해야 한다고 명시됨.
- **동적 확인**: `POST /api/items/delete {"ids":[999999]}` → `200 {"deletedCount":0,"failedIds":[999999]}`. `POST /api/items/bulk/tags {"ids":[999999],...}` → `200 {"updatedCount":0,"failedIds":[999999]}`.
- **실제**:
  - `frontend/src/pages/item/BulkSelectionPage.jsx:52-59`(onDelete) — `afterBulk(`${d.deletedCount}개 삭제됨`)`. `d.failedIds` 미확인. 전부 실패해도 "0개 삭제됨"만 표시하고 실패 안내 없음.
  - 동 파일 `:60-69`(onMove), `:70-80`(onTag) — `updatedCount`만 사용, `failedIds` 무시.
  - `frontend/src/pages/item/ItemDetailPage.jsx:69-78`(onDelete) — `deleteItems([item.id])` 후 `failedIds` 확인 없이 항상 "삭제했습니다" 토스트 + `/library` 이동. 단건 삭제가 실패(권한/부재)해도 사용자에겐 성공으로 보이고 화면 이탈.
- **기대**: 응답의 `failedIds.length > 0`이면 부분/전체 실패로 처리 — 예: `성공 N개 / 실패 M개` 안내, 실패 시 상세 이동 취소. 단건(ItemDetailPage)은 `failedIds.includes(id)`면 에러 토스트 + 이동 보류.
- **재현**:
  ```
  curl -X POST localhost:8081/api/items/delete -H "Authorization: Bearer <t>" \
    -H "Content-Type: application/json" -d '{"ids":[999999]}'
  # → 200 {"deletedCount":0,"failedIds":[999999]}  (UI는 "0개 삭제됨"으로 성공처럼 표기)
  ```
- **참고**: mock(`itemMock.js` mockDeleteItems/mockBulkCategory/mockBulkTags)은 `failedIds:[]` 고정이라 mock 모드에서는 이 버그가 드러나지 않음. 수정 시 실백엔드 기준으로 검증할 것.

### QA-02: 인증 실패 시 401 봉투가 아닌 403 빈 응답 — 계약의 401 TOKEN_* 위반
- **상태: ✅ FIXED (2차 재검증 통과 — 무헤더/무효토큰 모두 401 TOKEN_INVALID 봉투)**
- **담당**: backend-dev (SecurityConfig / auth 모듈 소관이나 item 계약 위반으로 surfacing)
- **근거(계약)**: contracts/item.md L5 — "누락/만료 시 auth 계약의 `401 TOKEN_EXPIRED`/`401 TOKEN_INVALID`." integration-qa 체크리스트 — "토큰 없이 요청 시 401 봉투 응답 확인."
- **동적 확인(현재 소스 :8081)**:
  - 헤더 없음 → `GET /api/items` = **HTTP 403, 본문 비어있음**.
  - garbage bearer 토큰 → **HTTP 403, 본문 비어있음**.
  - (정상 토큰 경로/404/400 가드는 모두 계약대로 봉투 응답 정상)
- **실제**: 인증 실패가 Spring Security 기본 거부(403, 봉투 미경유)로 나감. `GlobalExceptionHandler`/`ApiResponse` 봉투를 타지 않음.
- **프론트 영향**: `frontend/src/api/client.js:51-58` — 응답 에러에 `res.data.error`가 없으면 `ApiError('NETWORK_ERROR','서버에 연결할 수 없습니다.')`로 정규화. 즉 토큰 만료/누락 시 사용자는 "서버에 연결할 수 없습니다" 토스트만 보고 로그인 재유도 없음.
- **기대**: 인증 실패 시 `401` + `{success:false,error:{code:"TOKEN_INVALID"|"TOKEN_EXPIRED",...}}` 봉투. SecurityConfig에 `authenticationEntryPoint`(401 봉투 작성) 및 필요 시 `accessDeniedHandler` 지정.
- **재현**:
  ```
  curl -i localhost:8081/api/items            # → HTTP/1.1 403, 빈 본문 (기대: 401 TOKEN_INVALID 봉투)
  ```
- **참고**: item_done.md는 "SecurityConfig 변경 없음"이라 이는 auth 모듈에서 이월된 갭일 가능성이 큼. 다만 item 계약을 직접 위반하므로 리포트에 포함. 우선순위는 QA-01보다 낮음(전 모듈 공통 인증 UX).

---

## 보류 항목
- **ITEM-06 수정(PATCH) 화면 미연결**: `updateItem` 함수는 `itemApi.js:45`에 존재하나 편집 화면이 설계 5종에 없어 미연결(frontend_done.md 명시, 화면 미제공). 백엔드 PATCH 엔드포인트/DTO는 계약과 일치. 편집 화면 확보 시 재검증.

---

## 통과 항목(주요)
- 엔드포인트 14종 경로/메서드: 계약=백엔드 컨트롤러=itemApi.js 함수 3자 일치(글자 단위).
- Item 표준 표현/상세/페이지네이션/import/related/category 응답 필드·타입: DTO record가 계약 스키마와 camelCase 포함 일치. 동적으로 `GET /items`·`/categories` shape 확인.
- vaulted 마스킹: `ItemDto/ItemDetailDto.of`에서 thumbnailUrl(+상세 fileUrl/aiSummary) null 마스킹, 프론트 카드/상세가 `it.vaulted`로 블러·잠금 렌더.
- vault-share 가드: 동적 확인 — vaulted id=7 공유 시 `400 VALIDATION_ERROR`(계약 ITEM-13 비고 준수).
- 404/403 소유권: `getOwned` → 존재X 404 ITEM_NOT_FOUND / 타인소유 403 ITEM_FORBIDDEN. 동적으로 404 확인.
- 라우트 등록: App.jsx에 `/import`, `/items/new-memo`, `/items/:id`, `/favorites`, `/library` 전부 등록, 화면 간 이동(즐겨찾기 카드→상세, 관련→상세, FAB→메모) 죽은 링크 없음.
- mock 위치: frontend_done.md 기록(`VITE_USE_MOCK` 분기, itemMock 9건)과 실제 코드 일치. 기록 없는 mock 없음.
- 공통코드 회귀: ErrorCode에 auth 코드 원형 유지 + item 5종 추가(additive), GlobalExceptionHandler 핸들러 추가만(기존 로직 불변). auth 로그인 동적 정상(`/api/auth/login` 200). 회귀 없음.
