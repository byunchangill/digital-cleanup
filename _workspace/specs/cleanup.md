# cleanup (정리) 기능 명세

> 모듈: cleanup · 작성일: 2026-07-19 · 대상 화면 5종
> 관련 모듈: home(대시보드 제안 집계), item(일괄 삭제/이동 재사용)

## 화면 목록
| 화면 ID (폴더명) | 화면 이름 | 라우트(제안) |
|---|---|---|
| cleanup_dashboard_clean_001_2 | 정리 대시보드 (정리 허브) | `/cleanup` |
| duplicate_review_clean_002 | 중복 자료 검토 | `/cleanup/duplicates` (그룹별 `/cleanup/duplicates/{groupId}`) |
| unnecessary_screenshots_clean_005 | 불필요한 스크린샷 정리 | `/cleanup/screenshots` |
| cleanup_report_clean_008_2 | 정리 리포트(요약) | `/cleanup/report` |
| cleanup_settings_my_004_2 | 정리 설정 | `/cleanup/settings` (마이 탭 진입) |

## 사용자 흐름
```
하단탭 "정리" → 정리 대시보드(/cleanup)
   ├─ [중복 자료 카드] → 중복 검토(/cleanup/duplicates)
   │      ├─ 라디오로 유지본 1개 선택 → "나머지 정리하기" → 삭제(휴지통) → history.back → 대시보드
   │      └─ "중복이 아니에요" → 그룹 해제(일반 라이브러리로 이동) → 대시보드
   ├─ [불필요 스샷 카드] → 스크린샷 정리(/cleanup/screenshots)
   │      └─ 체크박스 다중 선택 → "N개 항목 휴지통으로 이동" → history.back → 대시보드
   ├─ [만료 쿠폰 카드] → 라이브러리 만료임박 필터 (item ITEM-03, expiringSoon) [가정: 전용 화면 없음]
   ├─ [FAB "한꺼번에 정리하기"] → 추천 항목 일괄 정리 실행
   └─ (마이 탭) → 정리 설정(/cleanup/settings): 자동화 토글 + 미사용 임계값 슬라이더
정리 리포트(/cleanup/report): 주간 성과 + 누적 통계 + 디지털 위생 점수 + 정리 제안 (읽기 전용)
```

## 기능 목록
| ID | 기능 | 관련 화면 | 비고 |
|---|---|---|---|
| CLEAN-01 | 정리 대시보드 조회 (저장공간 요약 + 카테고리 카드 + 최적화 제안) | cleanup_dashboard | home HOME-01과 경계 구분(아래 참조) |
| CLEAN-02 | 중복 그룹 목록 조회 | duplicate_review | 그룹별 후보 항목(해상도/용량/추천) |
| CLEAN-03 | 중복 그룹 정리 실행 (유지 1개 + 나머지 삭제) | duplicate_review | 내부적으로 item 삭제 재사용 |
| CLEAN-04 | 중복 그룹 해제 ("중복이 아니에요") | duplicate_review | 그룹 무시 표시, 항목은 라이브러리 유지 |
| CLEAN-05 | 불필요 스크린샷 후보 목록 조회 | unnecessary_screenshots | 사유(일회성/흐릿함/정보) + 사유별 카운트 |
| CLEAN-06 | 후보 항목 휴지통 이동(삭제) | unnecessary_screenshots, duplicate_review | **item ITEM-09 재사용** (신규 정의 아님) |
| CLEAN-07 | 한꺼번에 정리하기 (추천 항목 일괄 실행) | cleanup_dashboard FAB | [가정] 대상 타입 선택 실행 |
| CLEAN-08 | 정리 리포트 조회 | cleanup_report | 주간/누적/위생점수/제안 |
| CLEAN-09 | 정리 설정 조회 | cleanup_settings | 자동화 규칙 + 임계값 |
| CLEAN-10 | 정리 설정 저장 | cleanup_settings | 토글/슬라이더 변경 |

## 화면 근거 데이터 매핑
- **대시보드(CLEAN-01)**: "1.2GB 절약할 수 있어요"(reclaimableBytes), 원형 72%(usedPercent) + "사용하지 않는 파일이 전체의 28%"(unusedPercent), 카드별 건수(중복 12 / 만료 쿠폰 5 / 불필요 스샷 24), 스샷 카드 "스캔 중..."(scanStatus=SCANNING), "최적화 제안: 사용하지 않는 태그 3개..."(optimizationInsight).
- **중복 검토(CLEAN-02/03/04)**: "3개의 유사한 스크린샷... 12.4 MB 절약"(그룹 요약), 항목별 해상도(2400x1080)/촬영일/용량(4.2MB)/"최고 화질" 배지(recommendedKeep), 하단 "유지 1 / 삭제 2".
- **스크린샷(CLEAN-05/06)**: "일시적이거나 화질이 낮은 12개"(전체 후보 수), 항목별 사유 태그(일회성/흐릿함/정보 스크린샷) + 촬영시각 + 추천 문구, 사유별 칩(일회성 4 / 흐릿함 1).
- **리포트(CLEAN-08)**: "이번 주 5.4GB 확보"(weeklySavedBytes), 누적 12.8GB(+15%), 제거된 중복 2,481, 위생점수 88(등급 훌륭함), 브레이크다운(태그 정확도 94 / 보관함 정리 72 / 정리 빈도 85), 제안(오래된 스크린샷 42 / 대용량 미디어 3·1.2GB).
- **설정(CLEAN-09/10)**: "이번 달 1.2GB 절약"(hero), 토글 2종(휴지통 자동 이동 ON / 스마트 스샷 감지 OFF), 미사용 기준 슬라이더 30~365일(현재 90), 경고("비밀 금고·영구 보관 태그는 삭제 안 함").

## 데이터 모델 초안
- **CleanupSuggestionGroup** (중복 그룹): `id`, `userId`, `type(DUPLICATE)`, `status(PENDING|RESOLVED|DISMISSED)`, `estimatedSaveBytes`, `createdAt`. 1:N `items`.
  - **DuplicateCandidate**: `groupId`, `itemId`(→ Item), `width`, `height`, `fileSize`, `capturedAt`, `recommendedKeep(boolean)`.
- **CleanupCandidate** (불필요 스크린샷): `id`, `userId`, `itemId`(→ Item), `reason(ONE_TIME|BLURRY|INFO)`, `reasonLabel`, `recommendationText`, `capturedAt`, `status(PENDING|TRASHED|KEPT)`.
- **CleanupSettings** (사용자당 1행): `userId`, `autoTrashExpired(boolean)`, `smartScreenshotDetection(boolean)`, `unusedThresholdDays(int, 30~365)`, `updatedAt`.
- **CleanupStat** (리포트 집계): 파생/집계값 — 실시간 계산 또는 배치 저장은 백엔드 재량. `weeklySavedBytes`, `cumulativeSavedBytes`, `duplicatesRemoved`, `hygieneScore`, 브레이크다운.
> Item 엔티티는 item 모듈 소유. cleanup은 Item을 참조만 하며 삭제/이동은 item API를 재사용한다.

## home / item 재사용 경계 (중복 정의 금지)
- **home HOME-01 vs CLEAN-01**: HOME-01의 `suggestions`(DUPLICATE_PHOTOS/EXPIRING_ITEMS)는 **홈 진입용 요약 위젯**(제목+건수+액션 라우트만). CLEAN-01은 **정리 탭 전용 허브**로 저장공간 분석치(usedPercent/reclaimableBytes/unusedPercent), 카테고리별 스캔 상태, 최적화 제안을 추가로 반환한다. 서로 다른 화면·다른 데이터 밀도 → **별도 엔드포인트 유지**. 프론트는 홈에서 HOME-01, 정리 탭에서 CLEAN-01을 호출. 카드 탭 시 라우트는 CLEAN 화면으로 연결.
  - 타입 매핑: home `DUPLICATE_PHOTOS` ↔ cleanup `DUPLICATE`, home `EXPIRING_ITEMS` ↔ cleanup `EXPIRING_COUPON`. cleanup은 추가로 `UNNECESSARY_SCREENSHOT` 카테고리를 가진다.
- **item ITEM-09 재사용**: 스크린샷 "휴지통으로 이동"과 중복 "나머지 정리하기"의 실제 삭제는 `POST /api/items/delete` (`ids[]` + `failedIds`)를 그대로 사용한다. cleanup은 **삭제 엔드포인트를 신규 정의하지 않는다.** 단, 중복 그룹은 "정리 후 그룹을 RESOLVED로 마킹"하는 상태 전이가 필요하므로 CLEAN-03(래핑 엔드포인트)을 두되, 내부적으로 ITEM-09 로직을 재사용한다.
- **만료 쿠폰**: 전용 리뷰 화면이 없어 대시보드 카드의 route만 정의. 클릭 시 `GET /api/items` 만료임박 필터(item `expiringSoon`)로 이동 → 신규 API 없음.

## 가정 및 상충
- `[가정]` 저장공간 수치(reclaimableBytes 등)는 **bytes(number)** 로 반환하고 GB/MB 포맷은 프론트가 수행. 화면의 "1.2GB"는 표시값.
- `[가정]` "휴지통으로 이동" = 소프트 삭제. 휴지통/복원 전용 화면이 미제공이므로 trash 모듈은 범위 밖. ITEM-09 소프트삭제 정책과 일치(item 계약 비고).
- `[가정]` 스캔 상태(scanStatus SCANNING/READY)는 백그라운드 분석 진행 표현. 실시간 폴링/웹소켓은 미정 → CLEAN-01 재호출로 갱신.
- `[가정]` CLEAN-07 "한꺼번에 정리하기"는 대상 타입(`types[]`)을 받아 추천 항목을 일괄 삭제. 화면에 세부 확인 다이얼로그 근거 약함 → 응답에 정리 요약 반환, 되돌리기는 휴지통 전제.
- `[가정]` 위생 점수/등급 산식은 서버 재량. 브레이크다운 3항목(tagAccuracy/vaultOrganization/cleanupFrequency)은 화면 근거로 고정.
- `[가정]` 중복 그룹은 사진뿐 아니라 스크린샷도 포함(화면 문구 "유사한 스크린샷"). type는 DUPLICATE 단일.
- `[상충]` 없음. (대시보드 "중복 12건"과 중복 검토의 "그룹당 3개"는 층위가 다름 — 12는 그룹/항목 총계, 3은 단일 그룹 후보 수. 모순 아님.)
