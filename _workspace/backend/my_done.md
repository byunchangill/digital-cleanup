# my (마이/설정) 백엔드 구현 완료 보고

> 작성일: 2026-07-19 · 대상 계약: `_workspace/contracts/my.md` (MY-01~10) + vault VAULT-07 갱신 반영
> 빌드: `cd backend && gradlew.bat build` → **BUILD SUCCESSFUL** (전 테스트 통과)

## 구현 엔드포인트

| ID | Method | Path | 상태 |
|---|---|---|---|
| MY-01 | GET | `/api/my/notifications?category=&page=&size=` | 완료 (페이지네이션 + unreadCount) |
| MY-02 | POST | `/api/my/notifications/read` | 완료 (ids/all 겸용) |
| MY-03 | GET | `/api/my/export/options` | 완료 (DRIVE/EMAIL available:false stub) |
| MY-04 | POST | `/api/my/export` | 완료 (**202 ACCEPTED** + 잡ID) |
| MY-05 | GET | `/api/my/export/{jobId}` | 완료 (폴링, 진행률 파생) |
| MY-06 | POST | `/api/my/export/{jobId}/cancel` | 완료 |
| MY-07 | GET | `/api/my/storage` | 완료 (유형별 분해 + 대용량 + 인사이트 + limitReached) |
| MY-08 | GET | `/api/my/plans` | 완료 |
| MY-09 | POST | `/api/my/plans/upgrade` | 완료 (**채택안 A**: 즉시 ACTIVE + stub:true) |
| MY-10 | POST | `/api/my/plans/restore` | 완료 (restored:false stub) |
| VAULT-07 | POST | `/api/vault/account/deletion-request` | **갱신** (gracePeriodDays:30 추가) |

재사용(신규 정의 없음): 계정 삭제=VAULT-07, 대용량 자산 삭제=ITEM-09, "지금 정리하기"=CLEAN-01. 계약대로 my에서 재정의하지 않음.

## 패키지 구조 (`com.sortmate.my`)
- entity: `Notification`/`NotificationCategory`, `ExportJob`/`ExportStatus`/`DataType`/`Destination`, `UserSubscription`/`Plan`/`SubscriptionStatus`
- repository: `NotificationRepository`, `ExportJobRepository`, `UserSubscriptionRepository`
- dto: `NotificationDtos`, `ExportDtos`, `StorageDtos`, `PlanDtos`
- service: `NotificationService`, `ExportService`, `StorageService`, `PlanService`
- controller: `MyController` (단일, `/api/my`)
- bootstrap: `MyDemoDataInitializer` (@Order 4)

## VAULT-07 갱신 내용 (계약 변경 전파)
- `VaultDtos.DeletionResponse`에 `gracePeriodDays`(long) 필드 추가 → 응답이 `{status, requestedAt, gracePeriodDays:30, scheduledPurgeAt}`.
- `scheduledPurgeAt = requestedAt + 30일`은 기존 구현이 이미 보유(`VaultService.PURGE_GRACE_DAYS=30`, `AccountDeletionRequest`). 취소는 유예 내 재로그인(auth 소관, 별도 엔드포인트 없음) — 계약과 일치, 코드 변경 불필요.
- 기존 `VaultServiceTest.deletionIdempotent` 그대로 통과.

## 계약과 달라진/주의할 점 (필수 명시)

1. **[가정 유지] 내보내기 진행률은 시간 경과 파생 (ponytail).** 실제 압축 워커/스케줄러 대신 `ExportJob.settle(now)`가 `createdAt` 경과로 상태를 전진(약 9초에 100%). 폴링(MY-05)·취소 판정(MY-06)·중복 실행 판정(MY-04)이 모두 이 파생을 공유해 일관됨. **화면 폴링이 실제로 동작**하도록 설계. 실 파이프라인 연동 시 워커가 progress/status를 갱신하도록 교체하면 됨. (파일: `ExportJob.java`)
2. **[가정] downloadUrl은 stub 서명 URL 문자열.** DONE+DOWNLOAD 시 `/files/exports/{id}.zip?token=stub-{id}` 형태. 별도 다운로드 엔드포인트는 계약 엔드포인트 요약에 없어 만들지 않음(프론트는 URL만 사용). DRIVE/EMAIL은 DONE 시 downloadUrl=null이나, MY-04에서 available:false → `VALIDATION_ERROR`로 애초에 잡 생성 차단(계약 MY-04 비고 준수).
3. **[가정] MY-04 EXPORT_ALREADY_RUNNING.** 비종료 잡 존재 시 409. 단, 조회 시점에 시간 경과로 완료된 잡은 `settle`로 먼저 종료 전이 후 판정 → 오래된 데모 잡이 새 내보내기를 영구 차단하지 않음.
4. **MY-07 categories `type` 코드 확장.** 계약 예시는 `VIDEO|SCREENSHOT|DOCUMENT|LINK`(비배타 예시)이나, 실제 Item에는 VIDEO 타입 enum이 없어 **mimeType이 `video*`면 VIDEO**, 그 외는 ItemType으로 매핑(`IMAGE`/`MEMO`도 등장 가능). 프론트는 label+bytes+percent만 렌더하므로 영향 없음. bytes 내림차순 정렬. (파일: `StorageService.storageType`)
5. **MY-07 totalBytes/planName = 현재 플랜.** `[상충 해소]` 계약대로 사용자 플랜에 따라 결정(무료 5GB / 프리미엄 500GB). 계약 예시의 128GB는 사용하지 않고 Plan 상수(`PREMIUM=500GB`)를 따름 — MY-08 storageBytes와 일치시키기 위함.
6. **MY-07 reclaimableBytes = CLEAN-01 재사용.** `CleanupService.dashboard().storage().reclaimableBytes()` 그대로 호출 → 의미·산식 동일(중복 정의 회피, 계약 비고 준수).
7. **MY-07 대용량 자산/썸네일 마스킹.** `largestItems`는 fileSize 상위 5개, vaulted 아이템 thumbnailUrl은 null 마스킹(item 계약 공유 규칙). `modifiedAt`=Item.updatedAt.
8. **MY-09 채택안 A 채택.** PG 미연동이므로 즉시 `status=ACTIVE`, `currentPeriodEnd=now+30일`, `stub:true`. `PAYMENT_NOT_IMPLEMENTED`(501)는 enum에만 정의(대안 B용), 기본 경로에서는 미사용. `PLAN_ALREADY_ACTIVE`(현재 플랜과 동일), `PLAN_NOT_FOUND`(미지의 planId) 처리.
9. **MY-02 category/all 우선순위.** `ids`와 `all:true` 동시 전달 시 `all` 우선(계약 비고). `updatedCount`는 실제로 미읽음→읽음 전이된 건수만 카운트.

## 데모 시딩 (화면 동작 보장)
- `MyDemoDataInitializer`(@Order 4)가 데모 사용자에게 **알림 4건** 시딩: AI 분석 완료, 중복 발견(actionRoute `/cleanup/duplicates`), 쿠폰 만료(BENEFIT), 볼트 백업(SYSTEM, read=true). → MY-01 필터 탭/미읽음 뱃지/빈 상태 검증 가능.
- 플랜은 서버 상수(무료 기본, 구독 행 없음=FREE)이라 별도 시딩 불필요. MY-09 업그레이드 시 구독 행 생성.
- 내보내기 잡·저장공간·플랜은 기존 item 시딩(11건, fileSize 보유)을 그대로 집계 → MY-03/07이 실제 값 반환.
- 시딩은 `app.seed-demo-data=false`로 비활성화 가능.

## 신규 에러 코드 (`common/ErrorCode`)
`NOTIFICATION_NOT_FOUND(404)`, `EXPORT_JOB_NOT_FOUND(404)`, `EXPORT_ALREADY_RUNNING(409)`, `EXPORT_NOT_CANCELABLE(409)`, `PLAN_NOT_FOUND(404)`, `PLAN_ALREADY_ACTIVE(409)`, `PAYMENT_NOT_IMPLEMENTED(501)`. 계약의 my 전용 코드 전부 반영(VALIDATION_ERROR는 기존 재사용).

## 테스트
- `ExportJobTest` — 진행률 파생(settle) 4케이스: 생성/중간/완료(다운로드URL·resultBytes)/종료 멱등.
- `ExportServiceTest` — 미가용 destination, 잘못된 dataTypes, 잡 생성, EXPORT_ALREADY_RUNNING, not found, 취소(종료/진행) 7케이스.
- `PlanServiceTest` — 기본 FREE, 업그레이드 성공(stub ACTIVE), PLAN_ALREADY_ACTIVE, PLAN_NOT_FOUND, restore.
- `NotificationServiceTest` — 빈 요청 검증, 없는 id, all 일괄 읽음, 잘못된 category.
- 전 테스트 통과(기존 auth/item/cleanup/vault 테스트 포함 회귀 없음).

## 실행 방법
```
cd backend
gradlew.bat build        # 컴파일 + 테스트
gradlew.bat bootRun      # 로컬 실행 (H2 in-memory, 데모 시딩 자동)
```
- 인증: 데모 계정 `demo@sortmate.app` / `GreenPine!Harbor42`로 로그인 → accessToken → `Authorization: Bearer {token}`로 `/api/my/**` 호출.
