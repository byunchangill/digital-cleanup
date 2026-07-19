# item (라이브러리 핵심) 기능 명세

> 변경: 2026-07-19 item_edit_lib_004(아이템 편집) 화면 추가 분석 — ITEM-06 편집 화면 상세, ITEM-15(AI 재분석) 신규 추가.
> 대상 모듈: item · 분석일: 2026-07-19 · 분석 화면 6종
> 라이브러리의 핵심 데이터 단위인 **Item**(스크린샷/이미지/링크/문서/메모)의 가져오기·조회·상세·수정·즐겨찾기·일괄작업을 다룬다.
> 인증: 본 모듈의 모든 API는 auth 모듈의 `Authorization: Bearer {accessToken}`를 요구한다(사용자별 데이터). 응답 봉투/에러 규약은 contracts/auth.md와 동일.
> 참고: 비밀 보관함(vault) 이동은 화면상 액션으로 존재하나 잠금/PIN 검증은 vault 모듈 소관. 본 모듈은 "Item을 vault로 이동시키는 상태 변경"까지만 정의하고 PIN 검증은 포함하지 않는다(경계는 아래 "vault 경계" 참조).

## 화면 목록
| 화면 ID (폴더명) | 화면 이름 | 라우트(제안) |
|---|---|---|
| gallery_import_add_002 | 갤러리 가져오기 (기기 사진 다중 선택 → 임포트) | `/import` |
| memo_writing_add_004 | 메모 작성 (새 메모/노트 아이템 생성) | `/items/new-memo` |
| item_detail_lib_003_2 | 아이템 상세 | `/items/:id` |
| favorites_lib_005 | 즐겨찾기 | `/favorites` |
| bulk_selection_lib_001 | 일괄 선택 (라이브러리 선택 모드) | `/library?mode=select` |
| item_edit_lib_004 | 아이템 편집 (제목/카테고리/태그/썸네일 + AI 재분석/삭제) | `/items/:id/edit` |

## vault 경계 (본 모듈이 다루는 범위)
- item_detail의 "비밀 보관함으로 이동", bulk_selection에는 없으나 memo_writing의 "비밀 보관함" 토글은 **Item의 `vaulted` 플래그를 true로 바꾸는 상태 변경**이다.
- 본 모듈 API는 이 플래그 변경만 수행한다. vault 내부 열람 시 PIN 잠금/블러 해제는 vault 모듈이 별도 처리.
- **경계 규칙:** item 계약의 어떤 엔드포인트도 PIN을 요청/응답 필드로 포함하지 않는다. 목록/상세 응답에서 `vaulted=true`인 Item은 썸네일 URL 대신 잠금 표시용 최소 메타만 반환한다(`[가정]` — 화면상 블러 처리 근거).

## 사용자 흐름
```
[갤러리 가져오기 /import]  (+ 버튼/가져오기 진입, add_002)
  ├─ 탭: [모든 사진] / [스크린샷만 보기] → 소스 필터
  ├─ 썸네일 탭 → 다중 선택 토글 (선택 수 카운터 갱신)
  ├─ "사진 N장 가져오기" → 선택 이미지 업로드/등록 → (성공) 라이브러리로 복귀
  └─ close(X) → 진입 이전 화면(history.back)

[메모 작성 /items/new-memo]  (+ 버튼 → 메모, add_004)
  ├─ 제목/본문 입력, AI 추천 태그 표시("AI 추천: 초안")
  ├─ [미디어 첨부] 카드 → 이미지 업로드(첨부)
  ├─ [분류] 카드 → 태그 추가/보관함 이동 설정
  ├─ 툴바 "비밀 보관함" 토글 → vaulted=true로 저장
  ├─ [저장] → Item(type=MEMO) 생성 → (토스트 "메모가 라이브러리에 저장되었습니다")
  └─ arrow_back → history.back

[라이브러리/즐겨찾기 목록]
  ├─ [즐겨찾기 /favorites (lib_005)]
  │    ├─ 검색 input(제목 검색), 타입 필터 칩(전체/이미지/링크/문서)
  │    ├─ 카드 하트(favorite) 토글 → 즐겨찾기 해제(해제 시 목록에서 흐려짐)
  │    ├─ 카드 탭 → [아이템 상세 /items/:id]
  │    ├─ 빈 상태 힌트("즐겨찾기를 추가해 보세요")
  │    └─ 하단 탭: 홈/라이브러리/정리/마이 (off-module)
  └─ [일괄 선택 /library?mode=select (lib_001)]
       ├─ 헤더 "N개 항목 선택됨", [전체 선택]
       ├─ 카테고리 필터 칩(모든 파일/스크린샷/영수증/기사)
       ├─ 카드 탭 → 선택 토글(체크)
       ├─ 하단 액션바: [이동](카테고리) / [태그] / [공유] / [삭제]
       └─ close(X) → 선택 모드 해제

[아이템 상세 /items/:id (lib_003_2)]
  ├─ 히어로 이미지 "탭하여 확대" → 원본 뷰어(off-module/lightbox)
  ├─ AI 배지(AI 자동 분류), 만료 임박 배지, 제목/카테고리/태그/AI 요약/메타(출처·저장일)
  ├─ "함께 사용하기 좋은 아이템"(관련 아이템) → 해당 상세로 이동
  ├─ more_vert → 추가 메뉴(삭제 등, 화면 미상세 [가정])
  └─ 하단 액션: [공유하기] / [수정하기](→ [아이템 편집]) / [비밀 보관함으로 이동]

[아이템 편집 /items/:id/edit (lib_004)]
  ├─ 진입: 아이템 상세 "수정하기"
  ├─ 썸네일 편집 버튼(photo_camera/edit) → 이미지 교체(미디어 재선택)
  ├─ 제목 input, 카테고리 select(쿠폰/영수증/링크/메모), 태그 관리(칩 X 삭제 + 새 태그 추가)
  ├─ AI 분석 요약(읽기 전용, "AI 요약은 편집할 수 없습니다")
  ├─ [AI 재분석 요청](refresh) → 서버 재분류 요청(ITEM-15)
  ├─ [아이템 삭제하기](danger) → ITEM-09 재사용 → 삭제 후 라이브러리 복귀
  ├─ [저장] → ITEM-06 → (토스트 "변경사항이 저장되었습니다") → 상세로 복귀 [가정]
  └─ close(X) → 변경 취소, history.back
```

## 기능 목록
| ID | 기능 | 관련 화면 | 비고 |
|---|---|---|---|
| ITEM-01 | 갤러리 사진 가져오기(다중 업로드/등록) | gallery_import_add_002 | 선택한 N장을 Item으로 등록. 소스=스크린샷/사진 |
| ITEM-02 | 메모 아이템 생성 | memo_writing_add_004 | type=MEMO. 제목/본문/태그/첨부/vaulted |
| ITEM-03 | 라이브러리 아이템 목록 조회 | bulk_selection_lib_001 | 타입/카테고리 필터 + 페이지네이션 |
| ITEM-04 | 아이템 상세 조회 | item_detail_lib_003_2 | 메타·태그·AI요약·출처·관련아이템 |
| ITEM-05 | 관련 아이템 조회 | item_detail_lib_003_2 | "함께 사용하기 좋은 아이템" |
| ITEM-06 | 아이템 수정 | item_detail_lib_003_2, item_edit_lib_004 | "수정하기". 제목/카테고리/태그/본문/썸네일 |
| ITEM-07 | 즐겨찾기 목록 조회 | favorites_lib_005 | favorite=true만. 검색어·타입 필터 |
| ITEM-08 | 즐겨찾기 토글 | favorites_lib_005, item_detail | 하트 on/off |
| ITEM-09 | 아이템 삭제 (단건/일괄) | bulk_selection_lib_001, item_detail | 다중 id 삭제 |
| ITEM-10 | 일괄 카테고리 이동 | bulk_selection_lib_001 | 선택 항목 category 일괄 변경 |
| ITEM-11 | 일괄 태그 추가 | bulk_selection_lib_001 | 선택 항목에 태그 append |
| ITEM-12 | 비밀 보관함으로 이동 (vaulted 토글) | item_detail, memo_writing | vaulted=true 상태변경. PIN은 vault 소관 |
| ITEM-13 | 공유 | item_detail, bulk_selection | 공유 링크/토큰 발급 (`[가정]`) |
| ITEM-14 | 카테고리 목록 조회 | favorites, bulk_selection | 필터 칩 구성용 (`[가정]` 이면 조회) |
| ITEM-15 | AI 재분석 요청 | item_edit_lib_004 | "AI 재분석 요청". AI 미연동 → 최소 stub 계약 |

## 화면별 상세

### gallery_import_add_002 — 갤러리 가져오기
- **표시 데이터:** 기기 갤러리 썸네일 그리드(3열), 각 썸네일 선택 상태, 상단 [앨범] 버튼(앨범 선택 진입, off-module), 하단 버튼 카운터("사진 N장 가져오기").
- **입력 요소:** 필터 탭 [모든 사진]/[스크린샷만 보기], 썸네일 다중 선택 토글, [가져오기] 버튼, close(X).
- **상태 변형:** 선택 수 0 → 버튼 disabled(opacity/grayscale). 1개 사전 선택 상태로 진입.
- **[가정]:** 이 화면은 **기기 로컬 갤러리**를 읽는 네이티브/브라우저 기능이며 서버 목록이 아니다. 서버 관점 기능은 "선택된 이미지 바이너리를 업로드하여 Item 생성"(ITEM-01)이다. 업로드 방식은 `multipart/form-data` 다중 파일로 확정.
- **[가정]:** "스크린샷만" 필터는 클라이언트측 기기 필터. 업로드 시 `source` 힌트(SCREENSHOT|PHOTO)를 함께 전송.

### memo_writing_add_004 — 메모 작성
- **표시 데이터:** 자동 태그 칩("# 제목 없음"), AI 추천 칩("AI 추천: 초안"), 제목/본문 placeholder.
- **입력 요소:** 제목 input, 본문 textarea, [미디어 첨부] 카드, [분류] 카드(태그/보관함), 툴바(굵게/목록/링크/음성입력 mic), "비밀 보관함" 토글, [저장].
- **상태 변형:** 저장 성공 토스트("메모가 라이브러리에 저장되었습니다"). 실패 상태 화면 미표현 → 표준 에러.
- **[가정]:** 서식(굵게/목록/링크)은 본문에 마크다운/HTML로 저장. 음성입력(mic)은 클라이언트 STT → 텍스트 삽입(서버 계약 없음).
- **[가정]:** "AI 추천: 초안"은 서버 생성 태그 제안이나 저장 시점엔 사용자가 확정한 태그만 전송. AI 제안 조회 API는 화면 근거 약해 본 계약에서 제외.

### item_detail_lib_003_2 — 아이템 상세
- **표시 데이터:** 히어로 이미지, AI 자동 분류 배지, 만료 임박 배지, 제목("스타벅스 아메리카노 쿠폰"), 카테고리(쿠폰 + local_activity 아이콘), 태그(#쿠폰 #스타벅스 #음료 #선물), AI 요약 문장, 출처(카카오톡), 저장일(2024년 5월 12일), 관련 아이템 2건(썸네일/제목/만료일).
- **입력 요소:** arrow_back, more_vert(추가 메뉴), "탭하여 확대", [공유하기], [수정하기], [비밀 보관함으로 이동].
- **상태 변형:** 만료 임박 배지는 `expiryDate`가 임박(`[가정]` 30일 이내)일 때만. AI 배지는 `aiClassified=true`일 때.
- **[가정]:** more_vert 메뉴 = 삭제/vault이동 등. 삭제(ITEM-09)로 매핑.
- **[상충]:** 저장일이 상세는 "2024년 5월 12일"(절대일자), 즐겨찾기는 "2시간 전"(상대시간)으로 표현. → 동일 `savedAt`(ISO 8601) 필드를 반환하고 **표기 형식은 프론트 책임**으로 통일. 데이터 상충 아님, 표현 차이로 병기.

### item_edit_lib_004 — 아이템 편집
- **표시 데이터:** 썸네일(현재 이미지), 제목(현재값 프리필), 카테고리 select(현재값 선택), 태그 칩(현재 태그), AI 분석 요약(읽기 전용 문장), 저장 성공 토스트("변경사항이 저장되었습니다").
- **입력 요소:** close(X), [저장], 썸네일 편집 버튼(photo_camera/edit), 제목 input, 카테고리 select, 태그 칩 삭제(X) + 새 태그 input/[add], [AI 재분석 요청](refresh), [아이템 삭제하기](danger).
- **상태 변형:** 저장 시 버튼 스피너(sync 애니메이션) → 토스트. 실패 상태 화면 미표현 → 표준 에러.
- **카테고리 select 옵션(화면 고정):** `쿠폰`(coupon) / `영수증`(receipt) / `링크`(link) / `메모`(memo). HTML `<option value>`가 하드코딩됨.
- **[가정] 카테고리 소스:** 편집 select는 **화면 고정 enum**이며 ITEM-14(동적 카테고리 조회)와 별개다. ITEM-14는 라이브러리 필터 칩(주제 분류: 스크린샷/영수증/기사/디자인 등 사용자·시스템 파생)용이고, 편집 드롭다운은 아이템의 **1차 분류 타입**을 고르는 고정 목록이다. → `category` 필드에는 이 고정 값(coupon/receipt/link/memo)이 저장된다고 확정. 향후 동적화가 필요하면 프론트가 ITEM-14 결과로 select를 채우도록 전환 가능(계약 무변경).
- **[가정] 썸네일 편집:** 이미지 교체는 ITEM-01(multipart 업로드) 흐름 재사용 또는 ITEM-06에 `thumbnailFileId` 참조 전달. 화면 근거 약해 계약에는 선택 필드로만 명시(교체된 미디어의 사전 업로드 id).
- **[상충 해소] 태그 저장 방식:** 편집 화면은 개별 칩 삭제 + 개별 추가(증분 UX)지만, 저장 시점엔 최종 태그 집합을 ITEM-06 `tags` 배열로 **전체 치환** 전송한다(기존 ITEM-06 규약 유지). 증분 API 불필요.
- **AI 요약:** 읽기 전용. ITEM-06 요청에 `aiSummary`를 포함하지 않는다(서버가 무시/거부). 재생성은 ITEM-15로만.

### favorites_lib_005 — 즐겨찾기
- **표시 데이터:** 프로필 아바타, 검색 input, 타입 필터 칩(전체/이미지/링크/문서), 카드 그리드. 카드별: 썸네일 또는 타입 아이콘(link/pdf), 제목, 저장 상대시간, 카테고리 칩(디자인), 출처 도메인(medium.com), 파일 크기/타입(2.4MB · PDF), 태그, vault 잠금 카드(블러+"잠긴 보관함"/"비공개"), 빈 상태 힌트.
- **입력 요소:** 검색 input, 타입 필터 칩, 하트(즐겨찾기 토글), 카드 탭(→상세), FAB(+, 추가), 하단 탭바.
- **상태 변형:** 하트 해제 시 카드 흐려짐(grayscale). 빈 상태 힌트 섹션. vault 카드 블러.
- **[가정]:** 필터 칩 "이미지/링크/문서"는 `type` 필터(IMAGE|LINK|DOCUMENT). "전체"=필터 없음.
- **[가정]:** 검색은 제목 대상(화면 JS가 title로 필터). 서버는 title 부분일치로 확정.

### bulk_selection_lib_001 — 일괄 선택
- **표시 데이터:** 헤더 "N개 항목 선택됨", [전체 선택], 카테고리 필터 칩(모든 파일/스크린샷/영수증/기사), 카드 그리드(파일명·카테고리 칩·선택 체크), vault 카드(블러+lock).
- **입력 요소:** 카드 탭(선택 토글), [전체 선택], close(X), 하단 액션바 [이동]/[태그]/[공유]/[삭제].
- **상태 변형:** 선택 0 → 하단 액션바 숨김(translate-y-full). 선택 시 체크서클/outline.
- **[가정]:** 카테고리 칩(스크린샷/영수증/기사)은 `category` 필터. favorites의 type 필터와 별개 축(type=매체형식, category=주제분류). 두 화면이 서로 다른 필터축을 보여주므로 목록 API는 `type`과 `category` 둘 다 지원.
- **[가정]:** [이동]=카테고리 이동(drive_file_move 아이콘 + DESIGN "Move Category"). vault 이동이 아님.

## 데이터 모델 초안
> 백엔드 참고용 초안. 최종 스키마는 backend-dev 재량.

- **Item**
  - `id` (PK), `ownerId` (FK User), `type` (enum: `IMAGE`|`SCREENSHOT`|`LINK`|`DOCUMENT`|`MEMO`), `title`, `body` (nullable, MEMO/링크 설명), `category` (nullable, 주제 분류 예: 쿠폰/영수증/기사/디자인/금융), `thumbnailUrl` (nullable), `fileUrl` (원본, nullable), `fileSize` (bytes, nullable), `mimeType` (nullable), `sourceApp` (출처 예: 카카오톡/medium.com, nullable), `sourceType` (enum: `SCREENSHOT`|`PHOTO`|`LINK`|`UPLOAD`|`MEMO`, `[가정]`), `aiSummary` (nullable), `aiClassified` (boolean, 기본 false), `expiryDate` (nullable, 쿠폰/만료 아이템), `favorite` (boolean, 기본 false), `vaulted` (boolean, 기본 false), `savedAt` (ISO 8601), `createdAt`, `updatedAt`.
- **Tag**
  - `id`, `ownerId`, `name` (unique per owner). Item과 N:M (`ItemTag` 조인) 또는 Item에 `tags: string[]` 역정규화. `[가정]` 조인 테이블 권장.
- **Category** (`[가정]` — 필터 칩 구성용)
  - `id`, `ownerId`(nullable=시스템 기본), `name`, `type`(subject/system). 최소 구현은 Item.category 문자열 + distinct 조회로 대체 가능.
- **RelatedItem** (ITEM-05)
  - 별도 엔티티 아님. 같은 category/tag 기반 추천 조회로 도출(`[가정]`).

## 가정 및 상충
- `[가정] ITEM-01` 갤러리 가져오기는 기기 로컬 접근 + 서버는 `multipart` 다중 업로드로 Item 생성. "스크린샷만" 필터는 클라이언트측.
- `[가정] ITEM-02` 메모 서식은 본문에 마크다운 저장. 음성입력/AI 태그 제안은 서버 계약 제외(클라이언트/후속).
- `[가정] ITEM-03` 필터축 2종: `type`(매체형식 IMAGE/LINK/DOCUMENT…)과 `category`(주제 스크린샷/영수증/기사…). 목록 API가 둘 다 지원.
- `[가정] ITEM-05` 관련 아이템 = 동일 category/tag 기반 추천, 상위 N건.
- `[가정] ITEM-07` 즐겨찾기 검색 = title 부분일치, 타입 필터.
- `[가정] ITEM-12` vault 이동 = `vaulted` 플래그 변경만. PIN 검증은 vault 모듈. vaulted=true Item은 목록/상세에서 썸네일 대신 잠금 메타만 반환.
- `[가정] ITEM-13` 공유 = 공유 토큰/링크 발급. 화면은 버튼만 존재해 최소 계약으로 정의(서버가 shareUrl 반환).
- `[가정] ITEM-14` 카테고리 목록 조회 API는 필터 칩 구성을 위해 포함. 미구현 시 Item.category distinct로 대체 가능.
- `[가정]` 만료 임박 = `expiryDate` 30일 이내(배지 표시 기준). 서버가 `expiringSoon` boolean 동봉.
- `[가정]` 페이지네이션 = `page`(0-base)/`size`(기본 20), 정렬 기본 `savedAt` 내림차순.
- `[상충]` 저장일 표기: 상세(절대일자) vs 즐겨찾기(상대시간). → 서버는 `savedAt` ISO 8601 단일 필드 반환, 표기 형식은 프론트 책임. 데이터 상충 아님.
- `[가정]` more_vert 상세 메뉴 = 삭제 등. ITEM-09 삭제로 매핑.
- `[가정] ITEM-06(편집)` 카테고리 편집 select는 화면 고정 enum(coupon/receipt/link/memo)이며 ITEM-14 동적 조회와 별개. `category` 필드에 고정 값 저장.
- `[가정] ITEM-06(편집)` 태그는 증분 UX여도 저장 시 최종 집합을 `tags` 배열로 전체 치환. AI 요약은 편집 불가(요청에 미포함).
- `[가정] ITEM-06(편집)` 썸네일 교체는 사전 업로드(ITEM-01) 후 `thumbnailFileId` 선택 필드로 참조. 화면 근거 약함.
- `[가정] ITEM-15` AI 미연동 상태 → 재분석은 **요청 접수(큐잉) stub**으로 정의. 즉시 재분류 결과를 반환하지 않고 접수 확인만. AI 연동 후 비동기 결과 반영.
