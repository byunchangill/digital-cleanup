# home 모듈 QA 리포트 (2026-07-19)

> 기준: contracts/home.md (HOME-01 대시보드, HOME-02 자연어 검색 + item 재사용 지침)
> 방식: 계약↔백엔드↔프론트 3자 교차 비교 + 동적 검증(최신 빌드 :8087 별도 기동, 스테일 8080 회피)
> 빌드: backend `gradlew.bat build` BUILD SUCCESSFUL / frontend `npm run build` 통과
> **재검증(2026-07-19, 2차): QA-H01 수정 확인 + OBS-H01 반영 확인 → 최종 통과.**

## 요약(2차 재검증 후): 통과 19 / 실패 0 / 보류 0 → **최종 통과**

### 재검증 결과 (수정본)
- **QA-H01 → 통과(FIXED)**: 근본 가드가 `SearchResultsPage`에 들어가 직접 URL 진입까지 커버.
  - `SearchResultsPage.jsx:107-113` useEffect가 `!q.trim()`이면 API 호출 생략(setData(null), 반환) → 빈 q로 400 유발 안 함.
  - `:153-163` 전용 렌더 분기 `!q.trim()` → "무엇을 찾아드릴까요?" 검색 유도 화면 + "검색하러 가기"→/home (에러 토스트 없음). 3분기 삼항: 빈q→유도 / isEmpty→결과없음 / else→결과. data=null은 빈q 분기에서만 도달하여 null-deref 없음.
  - `HomePage.jsx:80,109,120` 헤더 검색 아이콘 `/search` 이동 → `searchInput.current?.focus()`로 변경(ref 배선). 빈 q 진입 경로 제거.
  - frontend `npm run build` 통과.
- **OBS-H01 → 반영(RESOLVED)**: `homeMock.js:65,83-97` mockSearch가 `favorite`/`category` 파라미터를 실제로 필터링, refinedFilters params 키를 백엔드 실제 키(`{favorite:true}`, `{category:'여행'}`)로 교체 → mock/실백엔드 재질의 동작 일치.

---

## (1차) 요약: 통과 18 / 실패 1(경미) / 보류 0 / 관찰 1

신규 2엔드포인트(HOME-01/02)와 재사용 경계(ITEM-03/08/14)는 계약과 정합. 실패 1건은 검색 진입 경미 버그(프론트).

---

## 실패 항목

### QA-H01(경미): 홈 헤더 검색 아이콘 → 빈 쿼리로 `/search` 진입 시 400 에러 토스트
- **상태: ✅ FIXED (2차 재검증 통과 — SearchResultsPage 근본 가드 + HomePage 아이콘 focus 전환)**
- **담당**: frontend-dev
- **근거(계약)**: HOME-02는 `q` 필수(1~200자), 누락 시 `400 VALIDATION_ERROR`(contracts/home.md L62, L116). 동적 확인: `GET /api/home/search?q=` → `400 {"code":"VALIDATION_ERROR","message":"q는 1~200자여야 합니다."}`.
- **실제**: `frontend/src/pages/home/HomePage.jsx:108` 헤더 검색 아이콘 `onClick={() => navigate('/search')}` — 쿼리 없이 `/search`로 이동. `SearchResultsPage.jsx:95,110`은 `q = params.get('q') || ''`로 즉시 `search({ q:'' })` 호출 → 백엔드 400 → `:103` 에러 토스트 "검색에 실패했습니다"/서버 메시지, `data`는 null로 남아 결과 영역 공백.
- **기대**: 검색어 없이 진입하면 검색 입력 상태를 보여주거나(홈 입력창 포커스), 최소한 빈 q일 때 API를 호출하지 않아야 함(빈 상태 화면 또는 홈 복귀).
- **재현**: `/home` → 우상단 search 아이콘 클릭 → `/search`(q 없음) → 에러 토스트 + 빈 결과.
- **수정 방법(택1, 최소)**:
  - `HomePage.jsx:108` 헤더 검색 아이콘을 입력창 포커스로 바꾸거나 제거(홈 입력 form이 이미 검색 진입 담당, `:116` submitSearch는 빈 q를 이미 가드함).
  - 또는 `SearchResultsPage`에서 `q`가 비면 API 호출 생략하고 빈 상태/홈 리다이렉트 처리.
- **비고**: mock 모드에서는 `mockSearch`가 빈 q를 "결과 있음"으로 반환(빈-상태 정규식 `팬케이크|레시피|블루베리` 불일치)하여 이 버그가 가려짐 → 실백엔드 기준으로 검증/수정할 것.

---

## 관찰(수정 불요, 기록용)

### OBS-H01 [✅ RESOLVED 2차]: homeMock의 refinedFilters `params` 키가 실제 백엔드 키와 다름
- `frontend/src/api/mock/homeMock.js:91-92` refinedFilters params = `{connected:true}`, `{location:'사무실'}`.
- 실제 백엔드는 `{category:'<name>'}`, `{favorite:true}`만 방출/해석(`HomeService.buildRefinedFilters`, 동적 확인됨).
- 구조(자유 key-value Map)는 계약과 일치하므로 스키마 불일치 아님. 다만 mock 모드에서 상세필터 재질의는 백엔드가 해석 못 하는 키라 실질 no-op. 계약이 params를 "자유 형식 힌트"로 규정하므로 결함은 아님. 데모 일관성을 원하면 mock 키를 category/favorite로 맞추면 됨(선택).

---

## 통과 항목

### 특별 확인 사항
1. **refinedFilters params 병합·재질의(라운드트립)**: ✅
   - 백엔드 HOME-02가 계약 파라미터 표 외 `favorite`(Boolean)/`category`(String)를 `@RequestParam`으로 수용(`HomeController.java:37-38`), `refinedFilters`가 동일 키를 방출(`HomeService.buildRefinedFilters`).
   - 프론트 `SearchResultsPage.jsx:256` `runSearch({ ...f.params })` → `:99-101` `search({ q, ...opts })` → `homeApi.search`가 `{ q, mode, page, size, ...extra }`로 그대로 쿼리 병합(`homeApi.js:22-24`).
   - 동적 라운드트립: `q=쿠폰` 결과의 `refinedFilters[0].params={category:"쿠폰"}` → `?q=쿠폰&category=쿠폰` 재호출 시 결과 전부 category=쿠폰. `favorite:true` → 결과 전부 favorite=true. 스키마 불일치 없음.
2. **대시보드 1회 호출 통합 + star ITEM-08 재사용**: ✅
   - `HomePage.jsx:83` `getDashboard(10)` 1회로 suggestions/recentItems/categories 렌더(HOME-01 비고 허용).
   - 검색 star 토글은 `SearchResultsPage.jsx:4,122` `itemApi.toggleFavorite`(ITEM-08 `PUT /api/items/{id}/favorite`) 재사용 — home 신규 favorite 엔드포인트 없음. 재사용 경계 준수.
3. **homeMock ↔ 백엔드 스키마 일치**: ✅(OBS-H01 제외)
   - mockGetDashboard: suggestions{type,title,count,actionLabel,actionRoute} / recentItems(Item 표준) / categories{name,itemCount} — DTO(CleanupSuggestion, ItemDto, CategoryCount)와 일치.
   - mockSearch: results=Item 평탄 + matchScore / interpretations{type,label,value} / refinedFilters{id,title,description,params} / assistantHint / page·size·totalElements·totalPages·hasNext — SearchResultItem·SearchInterpretation·RefinedFilter·SearchResponse와 일치. 동적 응답 키셋 확인(결과 16키: Item 15 + matchScore).
4. **동적 검증**: 최신 빌드 :8087 별도 기동으로 스테일 8080 회피.
5. **item/auth 회귀**: 없음.
   - `ItemRepository.findByOwnerId(Long)` 1개 메서드 추가(파생 쿼리, 기존 리팩터링 없음). `/api/categories`(ITEM-14) 정상, 로그인 200.
   - `ItemDemoDataInitializer` 중복 스크린샷 시딩 보강 → HOME-01 DUPLICATE_PHOTOS 2건 집계 정상, 기존 item 데모 응답 스키마 불변.

### 계약↔백엔드
- HOME-01 `GET /api/home/dashboard?recentSize`: 경로/메서드/응답(suggestions/recentItems/categories) 일치. recentSize 1~20 초과 시 `400 VALIDATION_ERROR`(동적 확인). recentItems vault 제외 savedAt desc.
- HOME-02 `GET /api/home/search?q&mode&page&size`: 응답(query/interpretations/results+matchScore/refinedFilters/assistantHint/pagination) 일치. 빈 결과 200+results:[] + assistantHint(동적 확인). q 누락/길이·mode 오류 400. vaulted 결과 마스킹(ItemDto.of 재사용).
- 인증 실패(무헤더/무효토큰) → `401 TOKEN_INVALID` 봉투(동적 확인, auth entryPoint 공유).

### 계약↔프론트
- `homeApi.js`: HOME-01/02 경로·파라미터 계약 일치. 봉투 해제 후 `data` 접근(이중해제/미해제 없음).
- 저장일 표기: 홈=상대시간(`relativeTime`), 검색결과=절대일자(`formatDate`) — 서버 `savedAt` ISO 단일 필드, 표기는 프론트 책임(계약 준수).
- 정리제안 `actionRoute`는 서버 제공값으로 navigate. `/cleanup/*`·`/library?filter=expiring`은 off-module(미구현) → `*` fallback(로그인). 죽은 링크는 아니며 해당 모듈 구현 시 자동 연결.

### 프론트 내부
- 라우트: `App.jsx:24-25` `/home`·`/search` 등록. `BottomNav.jsx:9` 홈 탭 `/home` 연결(기존 로그인 fallback 해소).
- 화면 흐름: 홈 검색 form(빈 q 가드됨)→/search?q=, 카테고리 카드→/library?category=, 최근/결과 카드→/items/:id, FAB→/items/new-memo. (헤더 검색 아이콘 예외는 QA-H01.)
- mock 위치: home_done.md 기록(`VITE_USE_MOCK` 분기)과 일치. 기록 없는 mock 없음.
