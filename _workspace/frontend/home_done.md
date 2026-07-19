# home (홈/검색) 프론트엔드 구현 완료 보고

> 모듈: home · 구현일: 2026-07-19 · 빌드: `npm run build` 통과 (108 modules, 2.83s)

## 구현 화면 / 라우트

| 화면 ID | 화면 | 라우트 | 파일 |
|---|---|---|---|
| home_home_001_2 | 홈 대시보드 | `/home` | `src/pages/home/HomePage.jsx` |
| search_results_home_002_2 | 자연어 검색 결과 | `/search?q={query}` | `src/pages/home/SearchResultsPage.jsx` |
| search_no_results_home_002 | 검색 결과 없음(빈 상태) | `/search?q={query}` (동일 라우트, `results:[]` 분기) | 위와 동일 파일 내 분기 렌더 |

## API 연동 (계약 준수)

- `src/api/homeApi.js`
  - `getDashboard(recentSize)` → **HOME-01** `GET /api/home/dashboard?recentSize=`
  - `search({ q, mode, page, size, ...extra })` → **HOME-02** `GET /api/home/search`
- **재사용**: 검색 결과 star 토글은 `itemApi.toggleFavorite` (**ITEM-08** `PUT /api/items/{id}/favorite`).
- 응답은 client.js 인터셉터가 공통 봉투 `{success,data,error}`를 해제한 `data`만 다룸. 필드명은 계약 스키마와 글자 단위 일치(suggestions/recentItems/categories, query/interpretations/results/matchScore/refinedFilters/assistantHint).

## Mock 사용 위치

- `src/api/mock/homeMock.js` — `VITE_USE_MOCK=true`일 때만 활성(기본 false → 실제 `/api` 호출).
  - `mockGetDashboard` : 정리 제안 2건 + 최근 문서 3건 + 카테고리 4종(디자인 값 그대로).
  - `mockSearch` : 질의에 `팬케이크|레시피|블루베리` 포함 시 **빈 상태**(assistantHint 포함) 반환, 그 외 와이파이 결과 4건(vaulted 1건 포함) + 해석 칩 2 + 상세필터 2 반환.
- 실서비스 배포 시 백엔드 HOME-01/02 완성 후 `VITE_USE_MOCK` 미설정이면 자동으로 실제 API 사용.

## 공통 컴포넌트 재사용

- `BottomNav` : 홈 탭 `to`를 `/` → **`/home`**으로 연결(기존 로그인 fallback 해소). 홈/검색 화면 모두 `active="home"`.
- `Toast` / `useToast` : 에러 토스트.
- 신규 공통 컴포넌트는 만들지 않음(카드류는 홈/검색 각 화면 로컬 컴포넌트로 유지 — shape이 서로 달라 추출 이득 없음).

## 계약/디자인과 달라진 점 (명시)

1. **검색 결과 상세필터 아이콘**: 디자인은 항목별 고정 아이콘(network_check, location_on)이나, 서버 `refinedFilters`에 아이콘 필드가 없어 공통 아이콘 `tune`으로 렌더. (계약 필드 밖 데이터를 지어내지 않기 위함)
2. **검색 결과 없음 일러스트**: 디자인의 3D 일러스트 이미지 대신 `search_off` 심볼 아이콘 사용(정적 에셋 미제공). 레이아웃/문구/버튼은 디자인 그대로.
3. **최근 문서 카드 썸네일 없음(LINK/DOCUMENT)**: `thumbnailUrl=null`이면 링크/문서 아이콘 플레이스홀더 표시(디자인은 이미지 카드만 예시).
4. **카테고리 아이콘·문구**: 계약대로 서버는 `{name, itemCount}`만 반환. 아이콘/색/서브텍스트("48개 저장됨"/"12개 프로젝트"/"스크랩 86건")는 프론트 매핑(`CATEGORY_STYLE`, `categorySubtitle`). 매핑에 없는 카테고리는 default 스타일 + "N개 저장됨".
5. **정리 제안 → 이동**: `actionRoute`로 `navigate` 연결. `/cleanup/*`, `/library?filter=expiring`은 타 모듈(off-module) 라우트 — 아직 미구현이라 이동 시 로그인 fallback(`*` 라우트). 계약상 route 문자열은 서버 제공값 그대로 사용.
6. **[가정] 반영**: 저장일 표기 — 홈=상대시간(`relativeTime`), 검색결과=절대일자(`formatDate`). 서버는 `savedAt` ISO 단일 필드만 반환(계약 [상충 없음] 항목 준수).
7. **[가정] Sortmate에게 물어보기 / 필터 초기화**: 빈 상태에서 각각 `mode=ASSISTANT` / `mode=NORMAL` 재질의(HOME-02 재호출). 별도 엔드포인트 없음(계약 비고 준수).

## QA 수정 내역 (2026-07-19, home_report.md 대응)

- **QA-H01 (빈 쿼리 검색 400) 수정**:
  1. 근본 가드 — `SearchResultsPage` useEffect에서 `q.trim()`이 빈 값이면 **API 호출을 생략**하고 `data=null`로 둠. 어떤 경로로 `/search`에 진입해도(직접 URL 포함) 400을 유발하지 않음.
  2. 빈 q 전용 렌더 분기 추가 — "무엇을 찾아드릴까요?" 검색 유도 화면 + [검색하러 가기](→`/home`).
  3. `HomePage` 헤더 검색 아이콘: `navigate('/search')`(빈 쿼리 이동) → **홈 검색 입력창 포커스**(`useRef`)로 변경. 빈 쿼리로 검색 화면 진입 경로 자체를 제거.
- **OBS-H01 (mock refinedFilters params 키) 정리**: `connected`/`location` → 실제 백엔드 키 **`favorite`/`category`**로 교체. `mockSearch`가 해당 키를 실제로 필터링하도록 반영 → mock 모드에서도 상세필터 재질의가 결과에 반영됨. (params 키는 프론트↔백엔드 합의 키로, item 계약의 favorite/category와 동일)
- 재빌드: `npm run build` 통과 (108 modules).

## 미해결 / 후속

- off-module 라우트(`/cleanup`, `/library?category=`, `/library?filter=expiring`)는 아직 미정의 → 현재 `*` fallback으로 로그인 이동. 해당 모듈 구현 시 자동 연결됨(경로 문자열은 유지).
