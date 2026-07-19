# cleanup 모듈 QA 리포트 (2026-07-19)

> 기준: contracts/cleanup.md (CLEAN-01~10, CLEAN-06=ITEM-09 재사용)
> 방식: 계약↔백엔드↔프론트 3자 교차 비교 + 동적 검증(최신 빌드 :8088 별도 기동, 스테일 8080 회피)
> 빌드: backend `gradlew.bat build` BUILD SUCCESSFUL(테스트 13케이스 포함) / frontend `npm run build` 통과(116 modules)

## 요약: 통과 24 / 실패 0 / 보류 0 / 관찰 2 → **최종 통과**

신규 9엔드포인트(CLEAN-01~05,07~10) + 재사용(CLEAN-06=ITEM-09) 모두 계약과 정합. 특별 확인 6항목 전부 통과. 실패 없음.

---

## 특별 확인 사항 결과

### 1. CLEAN-03/07 부분 실패 규약 (계약 422 vs 구현 200+failedIds) — **정합**
- **계약 문서 vs 구현 차이(기록)**: 계약(cleanup.md L131, L229)은 부분 실패를 `422 BULK_PARTIAL_FAILURE`로 명시하나, 백엔드는 **200 + `data.failedIds`** 로 구현. 이는 ITEM-09(item 모듈)에서 확립된 동일 규약이며, 삭제 성공분의 `deletedItemIds`/`savedBytes` 보존을 위한 일관된 해석.
- **판단**: 정합. item 모듈과 동일 패턴이므로 방향이 맞음. 계약 문서 자체의 422/200 모순은 spec-analyst가 일원화(422 제거) 권장 — 코드 결함 아님.
- **프론트 교차 확인(afterBulk 패턴 준수)**:
  - `ScreenshotCleanupPage.jsx:56-66` onTrash — `d.failedIds?.length` 확인, `deletedCount===0`이면 에러 토스트 후 중단, 부분 성공이면 "N개 이동, M건 실패" 병기.
  - `DuplicateReviewPage.jsx:49-57` onResolve — `r.failedIds?.length` 확인, 부분 실패 문구 병기.
  - `CleanupDashboardPage.jsx:37-44` onRunAll — `r.failedIds?.length` 확인, 부분 실패 병기.
- **동적 확인**: CLEAN-03 resolve group1 → `200 {"status":"RESOLVED","keptItemId":10,"deletedItemIds":[9,11],"savedBytes":439500,"failedIds":[]}`. CLEAN-07 run → `200 {"deletedCount":4,...,"byType":[...],"failedIds":[]}`.

### 2. CLEAN-06 삭제 = itemApi.deleteItems(ITEM-09) + `itemId` 전달 — **통과**
- `ScreenshotCleanupPage.jsx`: 선택 집합을 후보 `id`가 아닌 `c.itemId`로 구성(:34,:40,:47,:49) → `deleteItems(Array.from(selected))`(:56)로 itemId 배열 전달. 신규 삭제 엔드포인트 없음(itemApi 재사용). 계약 CLEAN-06 비고 준수.

### 3. cleanupMock ↔ 백엔드 응답 스키마 — **통과**(관찰 OBS-C01 제외)
- dashboard: storage{usedPercent,unusedPercent,reclaimableBytes} + categories 3타입(DUPLICATE/EXPIRING_COUPON/UNNECESSARY_SCREENSHOT) + optimizationInsight{title,message} — DTO와 일치.
- report: weekly/cumulative/hygiene{score,grade,breakdown 3키(tagAccuracy/vaultOrganization/cleanupFrequency)}/suggestions — 동적 확인 일치.
- duplicates/screenshots/run/settings: candidate/candidates/reasonCounts/byType 필드셋 DTO와 일치(동적 키셋 확인).

### 4. scanStatus 항상 READY — SCANNING 분기 사인 — **통과(죽은 분기지만 무해)**
- 동적 확인: dashboard 3카테고리 모두 `scanStatus=READY`(백엔드 [가정]대로 SCANNING 미생성).
- `CleanupDashboardPage.jsx:158` `shot.scanStatus === 'SCANNING' ? "스캔 중..." : 진행바` — 조건부 렌더라 오동작 없음. 실백엔드에선 항상 else. mock만 SCANNING 방출(OBS-C02).

### 5. 동적 검증 — 최신 빌드 :8088 별도 기동으로 스테일 8080 회피. (완료)

### 6. auth/item/home 회귀 (CLEAN-03/07이 ItemService.delete 트랜잭션 래핑) — **회귀 없음**
- CLEAN-03 resolve 시 item 실제 삭제 확인: `/api/items` totalElements 17→15(삭제 2건), 유지본(id=10)은 ITEM-04로 정상 조회. ItemService.delete 재사용 경로 정상.
- 재-resolve → `409 CLEANUP_GROUP_ALREADY_RESOLVED`(그룹 상태 전이 원자성 확인).
- 크로스 모듈: `/api/home/dashboard` 200, `/api/categories`(ITEM-14) 200, `/api/auth/login` 200.

---

## 통과 항목 (계약↔백엔드↔프론트)

- **엔드포인트 9종**: 경로/메서드 계약=CleanupController=cleanupApi.js 3자 일치. CLEAN-06은 itemApi.deleteItems 재사용(신규 정의 없음).
- **DTO 필드**: CleanupDashboardResponse/DuplicateDtos/ScreenshotDtos/RunDtos/CleanupReportResponse/SettingsDtos 전부 계약 스키마와 camelCase 포함 일치. 용량 필드 bytes(number), 날짜 ISO 8601.
- **cleanup 에러코드**: `CLEANUP_GROUP_NOT_FOUND(404)`, `CLEANUP_GROUP_ALREADY_RESOLVED(409)` ErrorCode 등재. 동적으로 404/409/400(keepItemId 미소속·누락·reason 오류·threshold 범위·빈 설정) 전부 봉투 응답 확인.
- **인증 실패**: 무헤더 → `401 TOKEN_INVALID` 봉투(동적).
- **봉투 처리**: client.js 해제 후 `data` 접근, 이중해제/미해제 없음. formatBytes(bytes→GB/MB) 표시 전담(계약 bytes 유지).
- **라우팅**: App.jsx `/cleanup`, `/cleanup/duplicates`, `/cleanup/screenshots`, `/cleanup/report`, `/cleanup/settings` 5종 등록. BottomNav "정리"→/cleanup. 대시보드 카드→category.actionRoute, 리포트 제안→actionRoute(null이면 비활성). 화면 흐름 정상.
- **설정 저장 UX**: 토글 즉시 PUT, 슬라이더 드래그 종료(onMouseUp/onTouchEnd) PUT, 실패 시 서버값 롤백. CLEAN-10 부분수정 계약 준수.
- **mock 위치**: cleanup_done.md 기록과 일치(삭제 mock은 itemMock 재사용). 기록 없는 mock 없음.

---

## 관찰(수정 불요 / 저우선)

### OBS-C01: cleanupMock CLEAN-05 `reasonCounts`가 INFO 사유를 누락
- `cleanupMock.js:90-93` reasonCounts를 ONE_TIME/BLURRY 2건으로 하드코딩. 같은 mock에 INFO 후보(id 3)가 있으나 reasonCounts엔 미포함.
- 백엔드는 count>0인 모든 사유 방출(동적: ONE_TIME 4/BLURRY 1/INFO 2). 구조는 동일해 스키마 결함 아님. mock 모드에서만 INFO 칩 미표시. 데모 일관성 원하면 mock reasonCounts를 후보 기반 동적 산출로 바꾸면 됨(선택, frontend-dev).

### OBS-C02: mock dashboard `scanStatus=SCANNING`은 실백엔드에서 발생 안 함
- 백엔드 [가정]상 항상 READY. mock만 SCANNING을 넣어 프론트 "스캔 중..." UI를 시연. 실서비스에서 해당 분기는 미도달(무해). 조치 불요.

### (참고) /cleanup/report·/cleanup/settings 인앱 진입 링크 부재
- 두 화면은 라우트 등록·렌더 정상이나 앱 내 이동 링크가 없어 현재 직접 URL로만 접근(마이 탭 off-module 미구현 때문 — cleanup_done.md 명시). cleanup 모듈 결함 아님. 마이 모듈 구현 시 연결 예정.
