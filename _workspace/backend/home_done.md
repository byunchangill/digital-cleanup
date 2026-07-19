# home (홈/검색) 백엔드 구현 완료 보고

> 모듈: home · 구현일: 2026-07-19 · 대상: HOME-01 대시보드, HOME-02 자연어 검색
> 빌드: `cd backend && gradlew.bat build` → **BUILD SUCCESSFUL (45 tests passed)**

## 구현 엔드포인트

| ID | Method | Path | 인증 | 상태 |
|---|---|---|---|---|
| HOME-01 | GET | `/api/home/dashboard?recentSize={n}` | 필요 | 완료 |
| HOME-02 | GET | `/api/home/search?q=&mode=&page=&size=` | 필요 | 완료 |

재사용 엔드포인트(ITEM-03/14/08)는 item 모듈에 이미 존재 — 신규 구현 없음.

## 패키지 / 파일

```
com.sortmate.home
├── controller/HomeController.java      # /api/home/dashboard, /api/home/search
├── service/HomeService.java           # 집계 + 규칙 기반 자연어 검색(핵심 로직)
└── dto/
    ├── DashboardResponse.java         # suggestions + recentItems(ItemDto 재사용) + categories(CategoryCount 재사용)
    ├── CleanupSuggestion.java
    ├── SearchResponse.java
    ├── SearchInterpretation.java
    ├── SearchResultItem.java          # Item 표준 필드 평탄화 + matchScore
    └── RefinedFilter.java
```

재사용(중복 구현 없음): `common/ApiResponse·ErrorCode·BusinessException·GlobalExceptionHandler`, `item/ItemDto`(vaulted 마스킹 포함), `item/CategoryListResponse.CategoryCount`, `item/ItemRepository`, `item/Item·ItemType`.
`ItemRepository`에 `findByOwnerId(Long)` 1개 메서드만 추가(확장, 기존 코드 리팩터링 없음).

## HOME-01 동작

- `suggestions`: 조회 시점 동적 산출(영속 엔티티 없음).
  - `DUPLICATE_PHOTOS`: IMAGE/SCREENSHOT을 정규화 제목으로 묶어 그룹당 초과분 합계. → `count`.
  - `EXPIRING_ITEMS`: `Item.isExpiringSoon()`(만료일 30일 이내) 개수.
  - 조건 없으면 각 항목 미포함 → 없으면 `suggestions: []`(홈에서 섹션 숨김).
- `recentItems`: ITEM-03 기본과 동일 규약(vault 제외, `savedAt desc`), `recentSize`(기본 10, 최대 20)만큼. `ItemDto` 재사용.
- `categories`: ITEM-14와 동일한 `aggregateCategories` 재사용 → `{name, itemCount}`.
- `recentSize` 범위(1~20) 초과 시 `400 VALIDATION_ERROR`.

## HOME-02 동작 (규칙 기반, AI 미연동)

- **질의 해석(interpretations)**: 규칙 기반 파서.
  - `PERIOD`: `오늘/어제/지난주/이번달/지난달/N월` → 날짜 범위 필터. `N월` value는 `YYYY-MM`(현재 연도 기준).
  - `ITEM_TYPE`: 스크린샷·캡처/사진·이미지/링크·url/문서·pdf·자료/메모·노트 → `ItemType` 필터.
  - `LOCATION`: 집/회사/사무실/카페/학교/여행 사전 매칭(칩 표시용).
  - `KEYWORD`: 신호어·짧은 토큰 제거 후 남은 2자 이상 토큰.
- **결과(results)**: 소유자 전체 아이템 인메모리 스캔 → 유형/기간/favorite/category 필터 통과 + (키워드가 있으면) title/category/body/aiSummary/tags 중 1개 이상 일치. `matchScore desc` 정렬.
  - `matchScore`(0~100): 기본 50 + 유형일치 20 + 기간일치 15 + 키워드 적중 비례(최대 30). 순수 유형/기간 질의는 +15.
  - vaulted 결과는 `ItemDto.of`로 썸네일 마스킹(item 계약 공유).
- **refinedFilters**: 결과 내 최다 카테고리 좁히기 + 즐겨찾기만 보기(최대 2개). 빈 결과 시 `[]`.
- **assistantHint**: 결과 없음이면 OCR 대안 문구(계약 빈-상태 예시 형태), `mode=ASSISTANT`면 결과가 있어도 힌트 제공, 그 외 `null`.
- 페이지네이션: 인메모리 서브리스트, `page/size` 표준(size 최대 100). 응답에 `page/size/totalElements/totalPages/hasNext` 포함.

## 계약과 달라진 점 / [가정]

1. **[계약 확장] HOME-02에 `favorite`, `category` 쿼리 파라미터 추가.** 계약 HOME-02 파라미터 표에는 `q/mode/page/size`만 명시되어 있으나, 계약 본문이 `refinedFilters[].params`를 "다음 HOME-02 호출 쿼리에 병합해 재질의하는 자유 key-value"로 규정한다. 재질의를 실제로 동작시키기 위해 서버가 해석하는 key로 `favorite`(Boolean), `category`(String)를 추가하고 `refinedFilters`가 이 key를 방출한다. **프론트-스펙 합의 필요** — spec-analyst가 계약 파라미터 표에 명문화하는 것을 권장.
2. **[가정] DUPLICATE_PHOTOS 제안 title**을 `"중복 사진 {count}건이 있어요"`로, EXPIRING_ITEMS를 `"만료 임박 항목 {count}건이 있어요"`로 생성. 계약은 예시만 제시하고 문구를 고정하지 않음.
3. **[가정] 중복 감지 = 동일(정규화) 제목 그룹** 휴리스틱. 실제 이미지 해시 비교 아님. `ponytail: naive title-grouping heuristic — 실제 perceptual hash로 승격 가능`.
4. **[가정] 자연어 파서는 한국어 사전 기반 최소 구현.** 조사 분해·의미 임베딩 없음. `LOCATION`은 소규모 사전 매칭. 고도화 시 형태소 분석/전문검색/OCR로 확장.
5. **[가정] matchScore 산식**은 위 가중치 휴리스틱(계약은 "0~100 정수"만 규정).
6. **[가정] 인메모리 스캔**(`ItemRepository.findByOwnerId` 전체 로드). 데모/개인 스케일에 충분, 대규모 시 인덱스/전문검색으로 승격 필요.

## 데모 데이터 보강

`item/bootstrap/ItemDemoDataInitializer.java`에 동일 제목 스크린샷 3장("카카오톡 대화 캡처") 추가 → HOME-01 `DUPLICATE_PHOTOS`가 **중복 2건**으로 노출된다. 기존 데모의 만료 임박 아이템 2건(D-12, D-5)이 `EXPIRING_ITEMS`로 집계된다. 검색은 기존 데모 아이템(쿠폰/영수증/디자인/메모 등)으로 키워드·유형·기간 질의 결과가 노출된다.

## 단위 테스트 (`HomeServiceTest`, 9종)

- 대시보드: 중복/만료 집계, vault 제외 최근목록, recentSize 범위 검증, 제안 없음 → 빈 배열.
- 검색: 유형+기간 해석 및 matchScore 정렬, 빈 결과 → assistantHint, q 공백/잘못된 mode → VALIDATION_ERROR, ASSISTANT 힌트, vaulted 마스킹, `SearchResultItem` 평탄 직렬화(matchScore 최상위 + Item 필드 평탄).

## 실행 방법

```
cd backend
gradlew.bat build          # 컴파일 + 테스트
gradlew.bat bootRun        # 기동(H2 in-memory, 데모 데이터 자동 시딩)
```

- 인증: `POST /api/auth/...`로 accessToken 발급 후 `Authorization: Bearer {token}`.
- 예: `GET /api/home/dashboard?recentSize=5`, `GET /api/home/search?q=지난달 스크린샷 쿠폰&mode=NORMAL`.
