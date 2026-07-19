# home (홈/검색) 기능 명세

> 대상 모듈: home · 분석일: 2026-07-19 · 분석 화면 3종
> 홈 대시보드(정리 제안 + 최근 문서 + 카테고리 요약)와 **자연어 검색**(해석 → 결과 → 상세 필터 / 빈 상태)을 다룬다.
> 인증: 본 모듈의 모든 API는 auth 모듈의 `Authorization: Bearer {accessToken}`를 요구한다(사용자별 데이터). 응답 봉투/에러/페이지네이션 규약은 contracts/item.md·contracts/auth.md와 동일.

## item 계약 재사용 경계 (중요)
홈 화면의 데이터 대부분은 **Item**이므로 item 계약을 최대한 재사용한다. home 전용으로 **신규 정의하는 것은 2개뿐**이다.

| 홈 화면 구성요소 | 처리 방식 | 근거 |
|---|---|---|
| "최근 문서" 가로 리스트 | **재사용 ITEM-03** `GET /api/items?sort=savedAt,desc&size=N` | Item 표준 표현 그대로. "전체보기" → 라이브러리(ITEM-03 전체) |
| "카테고리" 그리드(쿠폰 48개 등) | **재사용 ITEM-14** `GET /api/categories` (`{name, itemCount}`) | 아이콘/문구는 프론트 매핑. 카드 탭 → ITEM-03 `?category=` |
| 검색 결과 카드(썸네일/제목/저장일/vault 블러) | Item 표준 표현 재사용 (+ `matchScore` 필드만 확장) | vaulted 마스킹 규칙도 item 계약 공유 |
| **"정리 제안" 카드**(중복 사진/만료 쿠폰) | **신규 HOME-01** | 홈 전용 집계, item 목록으로 표현 불가 |
| **자연어 검색**(해석 칩 + 결과 + 상세필터 + 빈 상태) | **신규 HOME-02** | ITEM-03의 `q`(title 부분일치)와 다른 축: 자연어 해석·일치도·필터 추천 |

- **ITEM-03의 `q` vs HOME-02 구분:** ITEM-03 `q`는 라이브러리 내 단순 제목 부분일치 필터다. HOME-02는 자연어 질의("지난달 와이파이 비번")를 해석해 기간/유형 필터를 추출하고 일치도(matchScore)와 필터 추천을 반환하는 별도 기능이다. 중복 아님.
- **HOME-01 대시보드 집계:** 홈 진입 1회 호출로 정리 제안 + 최근 문서 + 카테고리 요약을 함께 반환(모바일 왕복 절감, `[가정]`). 이때 `recentItems`/`categories`는 ITEM-03/ITEM-14와 **동일한 데이터 형태를 참조**할 뿐 필드를 재정의하지 않는다. 프론트가 개별 호출을 선호하면 ITEM-03/ITEM-14로 대체 가능.

## 화면 목록
| 화면 ID (폴더명) | 화면 이름 | 라우트(제안) |
|---|---|---|
| home_home_001_2 | 홈 대시보드 | `/` |
| search_results_home_002_2 | 자연어 검색 결과 | `/search?q={query}` |
| search_no_results_home_002 | 검색 결과 없음 | `/search?q={query}` (동일 라우트, 빈 상태) |

## 사용자 흐름
```
[홈 /  (home_001)]
  ├─ AI 검색 바 input 제출 / 상단 검색 아이콘 → [검색 결과 /search?q=]
  ├─ 정리 제안 카드:
  │    ├─ "중복 사진 12건" [정리하기] → 정리 탭(off-module, cleanup)
  │    └─ "만료 임박 쿠폰 3장" [확인하기] → 라이브러리 필터(ITEM-03 ?expiringSoon 또는 ?category=쿠폰)
  ├─ 최근 문서 카드 탭 → [아이템 상세 /items/:id (item 모듈)]
  ├─ 최근 문서 "전체보기" → 라이브러리(off-module)
  ├─ 카테고리 카드 탭 → 라이브러리 category 필터(ITEM-03 ?category=)
  └─ 하단 탭바: 홈/라이브러리/추가/정리/마이 (off-module)

[검색 결과 /search?q= (search_results_002)]
  ├─ 질의 해석 표시: 원문 + 해석 칩(기간: 6월 / 유형: 스크린샷)
  ├─ 결과 그리드: 카드별 썸네일·제목·저장일·일치도(98% 일치), 즐겨찾기 star, vault 카드 블러(lock)
  ├─ 카드 탭 → [아이템 상세 /items/:id]
  ├─ 상세 필터 버튼("연결 성공한 항목만", "위치로 검색: 사무실") → HOME-02 재질의(refine)
  └─ "다른 검색어 입력하기" → 검색 입력 재진입
       └─ 결과 없음 → [검색 결과 없음]

[검색 결과 없음 /search?q= (search_no_results_002)]
  ├─ 검색 컨텍스트 칩 + close(X) → 검색어 지우고 홈 복귀
  ├─ 도움 제안 리스트(넓은 키워드/필터 해제/오타 확인) — 정적 안내
  ├─ [Sortmate에게 물어보기] → HOME-02 AI 확장 모드 재질의 (`[가정]`)
  ├─ [필터 초기화] → 필터 제거 후 HOME-02 재질의
  └─ AI 어시스턴트 힌트 버블(OCR 안내) — 서버가 assistantHint로 제공 가능
```

## 기능 목록
| ID | 기능 | 관련 화면 | 비고 |
|---|---|---|---|
| HOME-01 | 홈 대시보드 요약 조회 | home_home_001_2 | 정리 제안 + 최근 문서 + 카테고리 요약 집계. recentItems/categories는 ITEM-03/ITEM-14 형태 참조 |
| HOME-02 | 자연어 검색 | search_results_home_002_2, search_no_results_home_002 | 질의 해석(칩) + 결과(일치도) + 상세 필터 추천 + 빈 상태. 재사용: 결과 카드는 Item 표준 표현 |
| (재사용) ITEM-03 | 최근 문서 리스트 / 카테고리 필터 결과 | home | `sort=savedAt,desc&size=N` / `?category=` |
| (재사용) ITEM-14 | 카테고리 그리드 카운트 | home | `{name, itemCount}` |
| (재사용) ITEM-08 | 검색 결과 즐겨찾기 star 토글 | search_results | 화면상 star 아이콘 |

## 화면별 상세

### home_home_001_2 — 홈 대시보드
- **표시 데이터:** 프로필 아바타, AI 검색 바(placeholder), 정리 제안 2건("중복 사진 12건이 있어요" / "만료 임박 쿠폰 3장"), 최근 문서 카드 3건(썸네일·타입 배지·제목·저장 상대시간·상태 배지 D-3 등), 카테고리 4종(쿠폰 48개/영수증 125개/여행 12 프로젝트/쇼핑 스크랩 86건).
- **입력 요소:** 검색 input(제출), 상단 검색 아이콘, 정리 제안 [정리하기]/[확인하기], 최근 문서 "전체보기", 카드 탭, 카테고리 카드 탭, 하단 탭바 + FAB(추가).
- **상태 변형:** (화면 미표현) 제안 없음 시 "정리 제안" 섹션 숨김, 최근 문서 없음 시 리스트 비움 → 표준 빈 배열.
- **[가정]:** 정리 제안은 서버 집계(중복 감지/만료 임박 스캔)로 홈에서만 노출. 제안 유형: `DUPLICATE_PHOTOS`, `EXPIRING_ITEMS`(쿠폰 등). 각 제안은 count와 이동 액션(actionRoute)을 가진다.
- **[가정]:** 카테고리 카드의 문구("48개 저장됨" / "12개 프로젝트" / "스크랩 86건")는 프론트 표기이며 서버는 `{name, itemCount}`(ITEM-14)만 반환. 아이콘 매핑도 프론트.

### search_results_home_002_2 — 자연어 검색 결과
- **표시 데이터:** "자연어 검색" 레이블, 원문 질의("지난달 와이파이 비밀번호"), 해석 칩(기간: 6월 / 유형: 스크린샷), 결과 카드 4건(제목·저장일 절대일자·일치도 %·즐겨찾기 star·vault 블러 카드), 상세 필터 버튼 2건(제목·설명·아이콘), "다른 검색어 입력하기" CTA.
- **입력 요소:** 상단 검색 아이콘, 결과 카드 탭(→상세), 상세 필터 버튼(재질의), "다른 검색어 입력하기", FAB.
- **상태 변형:** 결과 있음 그리드. vaulted 결과는 썸네일 블러 + lock 아이콘(썸네일 URL 마스킹, item 계약 공유). 일치도 배지(85~98%).
- **[가정]:** 일치도 `matchScore`는 0~100 정수(%). 정렬 기본 = matchScore 내림차순.
- **[가정]:** 해석 칩 = 서버가 질의에서 추출한 필터. `interpretations: [{ type, label, value }]`. type 예: `PERIOD`(기간), `ITEM_TYPE`(유형), `LOCATION`(위치), `KEYWORD`.
- **[가정]:** 상세 필터 버튼("연결 성공한 항목만", "위치로 검색: 사무실")은 서버가 제안한 추가 필터. 프론트가 `refinedQuery`/필터를 얹어 HOME-02 재호출. `refinedFilters: [{ id, title, description, params }]`.

### search_no_results_home_002 — 검색 결과 없음
- **표시 데이터:** 검색 컨텍스트 칩(원문 + close), 일러스트, "검색 결과가 없습니다" + 설명, 도움 제안 3개(정적: 넓은 키워드/필터 해제/오타), AI 힌트 버블("이미지 내부 텍스트도 검색... '블루베리' 찾아볼까요?").
- **입력 요소:** close(X)(검색어 지움), [Sortmate에게 물어보기], [필터 초기화].
- **상태 변형:** 이 화면 = HOME-02가 빈 결과(`results: []`)를 반환한 상태. 서버는 빈 결과 시에도 `assistantHint`(OCR 기반 대안 제안)를 함께 반환할 수 있다.
- **[가정]:** [Sortmate에게 물어보기]는 HOME-02를 `mode=ASSISTANT`(AI 확장/OCR 포함)로 재호출. 화면 근거가 버튼뿐이라 최소 계약(mode 파라미터)으로 정의.
- **[가정]:** 도움 제안 3개는 정적 UI 문구로 서버 계약 없음. AI 힌트 버블만 서버 `assistantHint`로 매핑.

## 데이터 모델 초안
> 백엔드 참고용 초안. 최종 스키마는 backend-dev 재량. Item 엔티티는 item 모듈 정의 재사용.

- **home 전용 신규 엔티티 없음.** HOME-01/HOME-02는 기존 Item(+Tag/Category) 위의 **집계·검색 뷰**다.
- **CleanupSuggestion**(HOME-01, 조회 시 동적 산출 권장 — 영속 엔티티 불필요):
  - `type` (enum: `DUPLICATE_PHOTOS`|`EXPIRING_ITEMS`), `title`, `count`, `actionRoute`, `actionLabel`.
  - `[가정]` 중복 감지/만료 스캔은 배치 또는 조회 시점 계산. 최소 구현은 조회 시 계산.
- **검색 인덱스**(HOME-02): Item의 title/OCR텍스트/tags/category/savedAt 대상. `[가정]` 최소 구현은 DB LIKE + 기간/타입 파싱, 고도화 시 전문검색/임베딩.

## 가정 및 상충
- `[가정] HOME-01` 대시보드는 1회 호출 집계(제안+최근문서+카테고리). recentItems=ITEM-03(sort=savedAt,desc) 형태, categories=ITEM-14 형태를 **참조만** 하고 재정의 안 함. 프론트가 개별 호출 선호 시 ITEM-03/ITEM-14로 대체 가능.
- `[가정] HOME-01` 정리 제안 유형 = `DUPLICATE_PHOTOS`(중복 사진), `EXPIRING_ITEMS`(만료 임박). 각 count·이동 액션 포함. 서버 동적 집계.
- `[가정] HOME-02` 자연어 검색은 ITEM-03 `q`(단순 제목 부분일치)와 별개. 질의 해석(interpretations)·일치도(matchScore 0~100)·필터 추천(refinedFilters) 반환. 정렬 기본 matchScore desc.
- `[가정] HOME-02` vaulted 결과는 item 계약과 동일하게 썸네일 마스킹 + lock 표시. 실제 열람은 vault 모듈.
- `[가정] HOME-02` [Sortmate에게 물어보기] = `mode=ASSISTANT` 재질의(OCR/AI 확장). 최소 계약.
- `[가정]` 검색 결과 페이지네이션 = 페이지네이션 표준(page 0-base/size 기본 20) 적용. 화면에 페이저 미표시하나 규약 일관성 위해 포함.
- `[상충 없음]` 저장일 표기: 홈 최근문서=상대시간("어제 오후 2:30"), 검색 결과=절대일자("2024년 6월 14일"). item 계약과 동일하게 서버는 `savedAt` ISO 8601 단일 필드만 반환, 표기 형식은 프론트 책임.
