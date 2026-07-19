# cleanup 백엔드 구현 완료 보고서

> 모듈: cleanup · 작성일: 2026-07-19 · 패키지: `com.sortmate.cleanup.*`
> 빌드: `cd backend && gradlew.bat build` → **BUILD SUCCESSFUL** (테스트 포함, exit 0)

## 구현 엔드포인트

| ID | Method | Path | 상태 |
|---|---|---|---|
| CLEAN-01 | GET | `/api/cleanup/dashboard` | ✅ 구현 |
| CLEAN-02 | GET | `/api/cleanup/duplicates?page&size` | ✅ 구현 |
| CLEAN-03 | POST | `/api/cleanup/duplicates/{groupId}/resolve` | ✅ 구현 |
| CLEAN-04 | POST | `/api/cleanup/duplicates/{groupId}/dismiss` | ✅ 구현 |
| CLEAN-05 | GET | `/api/cleanup/screenshots?reason&page&size` | ✅ 구현 |
| CLEAN-06 | POST | `/api/items/delete` | ♻️ ITEM-09 재사용(신규 코드 없음) |
| CLEAN-07 | POST | `/api/cleanup/run` | ✅ 구현 |
| CLEAN-08 | GET | `/api/cleanup/report` | ✅ 구현 |
| CLEAN-09 | GET | `/api/cleanup/settings` | ✅ 구현 |
| CLEAN-10 | PUT | `/api/cleanup/settings` | ✅ 구현 |

모든 엔드포인트 인증 필요 — SecurityConfig의 `anyRequest().authenticated()`로 자동 커버(별도 설정 불필요).

## 신규 코드

- **엔티티**: `CleanupGroup`(+`CleanupGroupStatus`), `DuplicateCandidate`, `ScreenshotCandidate`(+`ScreenshotReason`, `ScreenshotCandidateStatus`), `CleanupSettings`, `CleanupStat`
- **리포지토리**: `CleanupGroupRepository`, `ScreenshotCandidateRepository`, `CleanupSettingsRepository`, `CleanupStatRepository`
- **DTO**: `CleanupDashboardResponse`, `DuplicateDtos`, `ScreenshotDtos`, `RunDtos`, `CleanupReportResponse`, `SettingsDtos`
- **서비스/컨트롤러**: `CleanupService`, `CleanupController`
- **시딩**: `CleanupDemoDataInitializer` (@Order 3)
- **테스트**: `CleanupServiceTest` (13개 케이스 — resolve/dismiss/run/screenshots/settings 핵심 규칙)

## 기존 코드 재사용 (중복 구현 회피)

- **삭제 물리로직**: `ItemService.delete(ownerId, ids)`(ITEM-09)를 CLEAN-03/07에서 그대로 호출. cleanup은 삭제 엔드포인트를 신규 정의하지 않음. CLEAN-03/07은 같은 트랜잭션 안에서 "그룹 상태 전이 + 삭제"를 원자적으로 래핑.
- **만료 임박 집계**: `Item.isExpiringSoon()` 재사용(home과 동일 규칙).
- **공통**: `ApiResponse`/`ErrorCode`/`BusinessException`/`GlobalExceptionHandler`/`ItemRepository`/`ItemDto` 마스킹 규칙 재사용.
- **home과의 경계**: home HOME-01은 홈 요약 위젯, CLEAN-01은 정리 탭 허브로 별도 엔드포인트 유지(계약 지침 준수). 집계 로직은 겹치지 않음(home은 제목 휴리스틱 인메모리, cleanup은 실체화된 `CleanupGroup` 엔티티 기반).

## 계약과 달라진 점 / 결정 사항 (필독)

1. **[계약 상충 해소] BULK_PARTIAL_FAILURE(422) vs 200 body `failedIds`** — CLEAN-03/07 계약은 422 에러와 200 응답의 `failedIds`를 동시에 명시(모순). **ITEM-09의 기존 동작과 동일하게 200으로 응답하고 `failedIds`를 채우는 방식**을 채택(삭제 성공분의 `deletedItemIds`/`savedBytes`를 보존하기 위함). 즉 부분 실패 시 422를 던지지 않음. → 프론트/QA 확인 필요. 필요 시 spec-analyst에게 계약 일원화 요청 권장.

2. **[가정] `scanStatus`는 항상 `READY`** — 백그라운드 스캐너 인프라가 없어 SCANNING 상태를 만들 수 없음. 대시보드 카드는 count가 있으면 즉시 READY로 노출(화면의 "스캔 중..." 상태는 미시연). 폴링 로직 불필요.

3. **[가정] 저장공간 수치 파생** — 실제 스토리지 미연동. `usedPercent = 100·(소유 아이템 fileSize 합) / 5GB(데모 할당량 상수)`, `unusedPercent = 100·reclaimableBytes / 사용량`, `reclaimableBytes = 중복 그룹 estimatedSaveBytes 합 + 스크린샷 후보 Item fileSize 합`. 모두 실데이터 파생(순수 상수 아님).

4. **[가정] 스크린샷 후보 삭제 후 상태 전이** — CLEAN-06은 ITEM-09를 **직접**(ItemController) 호출하므로 `ScreenshotCandidate.status`를 서버가 자동으로 TRASHED로 바꾸는 훅은 두지 않음(item 모듈을 침범하지 않기 위해). 대신 **CLEAN-05 목록은 Item이 실제 존재하는 후보만 반환**(삭제되면 자동 제외)하여 재노출을 방지. CLEAN-07(run) 경로는 CleanupService를 거치므로 TRASHED로 명시 전이함.

5. **[가정] 위생 점수 산식(서버 재량)** — `tagAccuracy=aiClassified 비율`, `vaultOrganization=카테고리 지정 비율`, `cleanupFrequency=min(100, 60+min(40, duplicatesRemoved))`, `score=세 항목 평균`. 등급: ≥85 훌륭함 / ≥70 좋음 / ≥50 보통 / 그 외 개선 필요. 브레이크다운 3키(tagAccuracy/vaultOrganization/cleanupFrequency)는 계약 고정값 준수.

6. **[가정] CLEAN-07 대상 타입** — `types` 생략 시 전체(DUPLICATE/EXPIRING_COUPON/UNNECESSARY_SCREENSHOT). 실제 삭제는 **DUPLICATE(추천 유지본 외)와 UNNECESSARY_SCREENSHOT(defaultSelected)만** 수행. `EXPIRING_COUPON`은 값으로 허용하되 정의된 일괄삭제 시맨틱이 없어 no-op(byType 미포함). 만료 쿠폰은 대시보드 내비게이션 카드일 뿐 파괴적 액션 대상이 아니라는 명세 해석.

7. **[가정] `CleanupStat` 누적 방식** — 리포트 주간/월간/누적 성과는 실시간 재계산 대신 정리 액션 시 누적 갱신(명세 "배치/저장은 백엔드 재량"). 데모는 화면 근거 수치(주간 5.4GB / 월간 1.2GB / 누적 12.8GB +15% / 중복 2,481)로 시딩.

8. **CLEAN-09 GET은 설정 미존재 시 기본값을 반환만 하고 저장하지 않음**(읽기 전용). 최초 저장은 CLEAN-10 PUT에서 발생.

## 데모 시딩 (`app.seed-demo-data=true` 기본)

- **중복 그룹 1개**: item 시딩의 "카카오톡 대화 캡처" 3장을 PENDING 그룹으로 묶음(최고 용량본에 `recommendedKeep`). → CLEAN-02/03/07 화면 확인 가능.
- **스크린샷 후보 7개**: 전용 SCREENSHOT Item + 후보 행(ONE_TIME 4 / BLURRY 1 / INFO 2, 일부 `defaultSelected`). → CLEAN-05 사유 칩/기본 체크 확인 가능.
- **CleanupStat 1행**: 리포트/설정 hero 수치.

## 실행 방법

```bash
cd backend
gradlew.bat build          # 컴파일 + 테스트
gradlew.bat bootRun        # 기동 (H2 in-memory, 데모 데이터 자동 시딩)
```
데모 로그인: `demo@sortmate.app` / `GreenPine!Harbor42` (auth 모듈). 토큰 획득 후 `Authorization: Bearer {accessToken}`로 `/api/cleanup/*` 호출.

## 테스트 결과

`CleanupServiceTest` 13 케이스 통과 (resolve 정상/부분실패/keep검증/404/409, dismiss 정상/409, run 중복정리/타입검증, screenshots 삭제항목제외/reason검증, settings 빈요청/기본값). 전체 `gradlew.bat build` GREEN.
