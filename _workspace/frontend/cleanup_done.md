# cleanup 모듈 프론트엔드 구현 완료 보고

> 작성일: 2026-07-19 · 담당: frontend-dev · 빌드: `npm run build` 통과 (116 modules, 2.69s)

## 구현 화면 / 라우트
| 화면 (Stitch 폴더) | 라우트 | 파일 | 사용 API |
|---|---|---|---|
| cleanup_dashboard_clean_001_2 | `/cleanup` | pages/cleanup/CleanupDashboardPage.jsx | CLEAN-01, CLEAN-07 |
| duplicate_review_clean_002 | `/cleanup/duplicates` | pages/cleanup/DuplicateReviewPage.jsx | CLEAN-02, CLEAN-03, CLEAN-04 |
| unnecessary_screenshots_clean_005 | `/cleanup/screenshots` | pages/cleanup/ScreenshotCleanupPage.jsx | CLEAN-05, ITEM-09(삭제) |
| cleanup_report_clean_008_2 | `/cleanup/report` | pages/cleanup/CleanupReportPage.jsx | CLEAN-08 |
| cleanup_settings_my_004_2 | `/cleanup/settings` | pages/cleanup/CleanupSettingsPage.jsx | CLEAN-09, CLEAN-10 |

## 신규 파일
- `src/api/cleanupApi.js` — CLEAN-01,02,03,04,05,07,08,09,10. 삭제(CLEAN-06)는 신규 정의 없이 `itemApi.deleteItems`(ITEM-09) 재사용.
- `src/api/mock/cleanupMock.js` — 위 엔드포인트 mock (삭제 mock은 itemMock 재사용).
- `src/lib/formatBytes.js` — bytes → GB/MB/KB 표시 헬퍼 (대시보드/중복/리포트/설정 공용).
- 페이지 5종 (pages/cleanup/).

## 라우팅 연결
- `App.jsx`에 5개 라우트 추가.
- `BottomNav`의 "정리" 탭은 이미 `/cleanup`을 가리키고 있어 그대로 사용(수정 불필요). 대시보드/리포트/설정에서 `<BottomNav active="cleanup" />` 렌더.
- HomePage의 정리 제안 카드(actionRoute `/cleanup/duplicates`)와 정합 — 대시보드 카드도 `category.actionRoute`로 이동.

## 재사용 컴포넌트 (신규 컴포넌트 추출 없음)
- `BottomNav`, `Toast` + `useToast` 그대로 재사용.
- 스크린샷 삭제는 BulkSelectionPage의 `afterBulk` 부분 실패 규약(200+failedIds, deletedCount===0 → 에러 토스트)을 동일 적용.
- 공통 컴포넌트로 추출할 만큼 반복되는 신규 UI 없음(체크박스/라디오/토글은 각 화면 1회성 → 인라인 유지). Toggle만 설정 화면 내부 로컬 컴포넌트로 둠.

## Mock 사용 위치 (VITE_USE_MOCK=true 일 때만 활성)
- `src/api/mock/cleanupMock.js` 전체가 CLEAN-01~10(삭제 제외)의 mock 응답.
- 삭제 경로는 `src/api/mock/itemMock.js`의 `mockDeleteItems` 재사용(itemId 배열 → deletedCount/failedIds).
- **백엔드 CLEAN 엔드포인트 완성 시 mock 없이 실 연동됨** (USE_MOCK=false 기본). 계약 경로/필드 글자 일치로 구현.

## 계약과 달라진 점 / 가정
- **화면 하드코딩 텍스트 → API 필드 치환**: 중복 검토 인사이트 헤더의 "CLEAN-002", 스크린샷 헤더의 "CLEAN-005" 등 화면에 박힌 스펙 ID 뱃지는 제품 UI가 아니라 설계 주석으로 판단하여 제거(대신 계약 데이터로 문구 구성). 임의 데이터 추가 아님.
- **대시보드 카테고리 렌더링**: 계약 `categories[]`는 배열이지만 Stitch 레이아웃이 타입별로 heterogeneous(중복=대형 카드, 쿠폰/스샷=중형)하여 `type`으로 조회해 각 카드에 매핑. 새 타입이 오면 렌더 안 됨 — 계약의 3개 타입(DUPLICATE/EXPIRING_COUPON/UNNECESSARY_SCREENSHOT) 고정 전제.
- **중복 검토는 단일 그룹 화면**: CLEAN-02는 목록 API지만 화면은 첫 그룹만 표시(`groups[0]`). 계약 비고와 일치. 다중 그룹 순차 처리 UX는 범위 밖(그룹 없으면 빈 상태 표시).
- **스크린샷 삭제는 `itemId` 전달**: 계약 CLEAN-06 비고대로 후보 `id`가 아닌 `itemId`를 ITEM-09에 전달. 기본 체크는 `defaultSelected` 기준.
- **CLEAN-07(한꺼번에 정리)**: 화면 확인 다이얼로그 근거 약함 → 계약 비고 권고대로 `window.confirm`으로 확인 UX 추가. `types` 미지정(전체 READY) 호출.
- **설정 저장 타이밍**: 토글은 즉시 PUT(부분 수정), 슬라이더는 드래그 종료(onMouseUp/onTouchEnd)에 PUT. 실패 시 서버 값으로 롤백.
- **만료 쿠폰 카드 라우트**: 전용 화면 없음 → `actionRoute` `/library?expiringSoon=true`로 이동(계약/명세 일치). 라이브러리 필터 처리는 item 모듈 소관.
- **폴링 미구현**: 스샷 카드 `scanStatus=SCANNING`은 "스캔 중..." 정적 표시만. 자동 폴링/웹소켓은 계약상 미정(`[가정]`) → 대시보드 재진입 시 재조회로 갱신.
- **BottomNav `/my` 미구현**: 정리 설정은 명세상 마이 탭 진입이나 마이 모듈 미구현. 현재는 `/cleanup/settings` 직접 라우트로만 접근 가능(설정 화면 자체는 완성).
