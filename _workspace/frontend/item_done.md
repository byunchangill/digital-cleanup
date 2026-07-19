# item (라이브러리 핵심) 프론트엔드 구현 완료 보고

> 모듈: item · 구현일: 2026-07-19 · 스택: React 18 + Vite + Tailwind
> 빌드: `npm run build` 통과 (104 modules, 1.76s)

## 구현 화면 / 라우트

| 화면 ID | 파일 | 라우트 | 연동 계약 |
|---|---|---|---|
| gallery_import_add_002 | `src/pages/item/GalleryImportPage.jsx` | `/import` | ITEM-01 |
| memo_writing_add_004 | `src/pages/item/MemoWritingPage.jsx` | `/items/new-memo` | ITEM-02 |
| item_detail_lib_003_2 | `src/pages/item/ItemDetailPage.jsx` | `/items/:id` | ITEM-04, 05, 08, 09, 12, 13 |
| favorites_lib_005 | `src/pages/item/FavoritesPage.jsx` | `/favorites` | ITEM-07, 08 |
| bulk_selection_lib_001 | `src/pages/item/BulkSelectionPage.jsx` | `/library` | ITEM-03, 09, 10, 11, 13, 14 |

## 신규 파일

- `src/api/itemApi.js` — 계약 14개 엔드포인트(ITEM-01~14) 연동 함수 전부. 경로/필드 계약과 글자 단위 일치.
- `src/api/mock/itemMock.js` — 백엔드 미완성 구간 mock. 반환 형태는 인터셉터 봉투 해제 후 `data`(계약 스키마)와 동일.
- `src/components/BottomNav.jsx` — 하단 5탭 네비(공용). favorites에서 사용, 타 모듈 재사용 대비.
- `src/pages/item/*.jsx` — 화면 5종.
- `src/index.css` — `.memo-shadow`, `.no-scrollbar` 유틸 추가(화면 HTML의 인라인 스타일 공용화).

## Mock 사용 위치 (⚠️ 실서비스 전 제거/확인 필요)

- **전 화면이 `VITE_USE_MOCK=true` 시 `src/api/mock/itemMock.js`로 분기.** 기본값 `false` → 실제 `/api` 호출.
- auth 모듈과 동일한 분기 패턴(`itemApi.js`의 `USE_MOCK`). 백엔드 완성 시 환경변수만 끄면 실연동.
- mock DB는 9개 샘플 아이템 하드코딩. 페이지네이션/필터/검색은 클라이언트 계산으로 근사.

## 계약과 다르게 해석/처리한 부분

1. **ITEM-01 갤러리**: 브라우저는 기기 갤러리를 임의로 못 읽으므로 `<input type="file" multiple>`로 사진 선택 → `importPhotos(files, sourceType)`. 설계의 3열 썸네일 그리드/선택 토글/카운터 버튼은 그대로 재현하되, 그리드 첫 칸에 "사진 추가" 타일 추가. 탭(모든 사진/스크린샷만) → `sourceType`(PHOTO/SCREENSHOT) 매핑. 계약 ITEM-01 [가정]과 일치.
2. **ITEM-02 메모 첨부**: `attachmentIds`는 사전 업로드 참조인데 업로드 UI가 설계에 없음 → "미디어 첨부" 카드는 안내 토스트만. `attachmentIds` 미전송. (계약 [가정] 따름)
3. **서식 툴바/음성입력(mic)**: 계약 없음([가정] 클라이언트 서식/STT) → 시각만 재현, 동작 미구현.
4. **item_detail "수정하기"**: 별도 편집 화면이 설계 5종에 없음 → 안내 토스트만. ITEM-06 `updateItem` 함수는 itemApi에 구현해 뒀으나 화면 미연결. **편집 화면 확보 시 연결 필요.**
5. **item_detail more_vert**: 계약 [가정]대로 삭제 메뉴(드롭다운)로 매핑, ITEM-09 연결.
6. **저장일 표기 [상충] 해소**: 서버 `savedAt`(ISO) 단일 필드 사용, 상세=절대일자(`2024년 5월 12일`)/즐겨찾기=상대시간(`2시간 전 저장됨`)로 프론트에서 포맷. 계약 결정과 일치.
7. **bulk 카테고리 칩**: 설계는 고정 칩(모든 파일/스크린샷/영수증/기사)이나, ITEM-14 `listCategories` 조회 결과 + "모든 파일"로 동적 구성(계약 [가정] "필터 칩 구성용" 반영). 실데이터 기반이라 설계 칩 텍스트와 다를 수 있음.
8. **bulk 이동/태그**: 입력 UI가 설계에 없어 `window.prompt`로 카테고리/태그 수집 후 ITEM-10/11 호출. (최소 구현, 전용 시트 미제공)
9. **/library 라우트**: bulk_selection을 라이브러리 기본 화면으로 배치. 선택 0개면 헤더 "라이브러리", 1개+면 "N개 항목 선택됨"으로 전환(설계는 선택 모드 스냅샷만 제공).
10. **BottomNav 홈/정리/마이**: 타 모듈 소관이라 라우트(`/`, `/cleanup`, `/my`) 미구현. 클릭 시 이동만 걸어둠(현재는 로그인으로 fallback).

## QA 수정 내역

### QA-01: 일괄 작업 부분 실패 미처리 (수정 완료, `npm run build` 통과)
백엔드가 부분 실패를 `200 + data.failedIds`로 반환하는데 프론트가 `failedIds`를 확인하지 않던 문제.
- `BulkSelectionPage.jsx`: `afterBulk(successCount, failedIds, verb)`로 중앙화. **성공 0건 → 에러 토스트 후 선택 유지/목록 미갱신**(성공 동작 미수행), 부분 성공 → `N개 삭제됨, M건 실패` 병기 후 갱신. onDelete/onMove/onTag 3핸들러 적용.
- `ItemDetailPage.jsx onDelete`: `deletedCount === 0`이면 에러 토스트 후 화면 이탈 안 함(기존엔 항상 "삭제했습니다" + 이탈).
- `itemMock.js`: `splitByExistence()` 추가 — DB에 없는 id는 `failedIds`로 분류. delete/bulkCategory/bulkTags mock이 실제 실패 케이스를 시뮬레이션(예: id 999999 → `{deletedCount:0, failedIds:[999999]}`).
- 참고: `shareItems`(ITEM-13)는 계약상 `failedIds`가 없어(shareUrl 반환) 대상 아님.

## 미연결/후속 (frontend 범위 밖 or 화면 미제공)

- ITEM-06 수정 화면(편집 폼) — 함수만 존재, 화면 없음.
- 미디어 첨부 업로드 플로우 — 화면 없음.
- 홈/정리/마이 탭 — 타 모듈.
