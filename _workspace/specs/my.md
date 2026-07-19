# my (마이/설정) 기능 명세

> 모듈: my · 작성일: 2026-07-19 · 대상 화면 7종
> 공통 규격: 응답 봉투 `{ success, data, error }`, 필드 camelCase, 날짜 ISO 8601(UTC), 용량은 bytes(number).
> 인증: 본 모듈 모든 화면은 로그인 사용자 전용 — `Authorization: Bearer {accessToken}`.

## 화면 목록
| 화면 ID (폴더명) | 화면 이름 | 라우트(제안) |
|---|---|---|
| notifications_my_004 | 알림 센터(인박스) | `/my/notifications` |
| export_options_my_005 | 데이터 내보내기 옵션 | `/my/export` |
| data_export_progress_my_005 | 내보내기 진행 | `/my/export/:jobId` |
| storage_detail_my_006 | 저장공간 상세 | `/my/storage` |
| storage_limit_reached_my_006 | 저장공간 한도 도달(상태) | `/my/storage` (limitReached 변형) |
| plan_comparison_upgrade_my_008_2 | 플랜 비교/업그레이드 | `/my/plans` |
| account_deletion_confirmation_my_009_2 | 계정 삭제 확인 | `/my/account/delete` |

> **주의 — 화면명 vs 실제 내용**: `notifications_my_004`는 폴더명이 "알림 설정"으로 지정됐으나, `code.html`은 **토글식 알림 설정이 아니라 알림 인박스(필터 탭 + 시간별 그룹 + 빈 상태)**다. 화면에 설정 토글이 없으므로 설정 API를 만들지 않고 인박스 조회로 명세한다. `[가정]`

## 사용자 흐름
```
마이(하단 탭) ─┬─ 알림 센터 → (카드 탭) → 정리/라이브러리/시크릿 등 관련 화면 (actionRoute)
               ├─ 저장공간 상세 ─┬─ "지금 정리하기" → 정리 대시보드(cleanup)
               │                 └─ 대용량 자산 delete → 항목 삭제(item ITEM-09)
               ├─ 데이터 내보내기 옵션 → "내보내기 시작" → 내보내기 진행(폴링) ─┬─ 완료 → 다운로드
               │                                                              └─ "취소" → 옵션 화면
               └─ 플랜 비교/업그레이드 → "지금 업그레이드" → (PG stub)

저장공간 한도 도달(업로드/저장 차단 시 진입) ─┬─ "플랜 업그레이드" → 플랜 비교(MY-006 라우트)
                                            └─ "지금 정리하기" → 정리 대시보드(CLEAN-001)

계정 삭제 확인(프라이버시 설정 등에서 진입) ─┬─ 체크박스 동의 후 "계정 탈퇴" → 삭제 요청 접수(VAULT-07 재사용)
                                          └─ "계정 유지" → 뒤로
```

## 기능 목록
| ID | 기능 | 관련 화면 | 비고 |
|---|---|---|---|
| MY-01 | 알림 목록 조회(카테고리 필터 + 페이지네이션) | notifications_my_004 | 시간 그룹은 클라이언트가 `createdAt`으로 구성 |
| MY-02 | 알림 읽음 처리 | notifications_my_004 | 카드 탭 시. `[가정]` 화면 근거 약함(빈 상태 문구 "모두 확인했습니다") |
| MY-03 | 내보내기 옵션 조회(선택 항목 수·예상 크기·가용 옵션) | export_options_my_005 | 진입 시 1회 |
| MY-04 | 내보내기 작업 시작 | export_options_my_005 | 데이터 유형 + 저장 위치. 비동기 잡 생성 |
| MY-05 | 내보내기 진행 폴링 | data_export_progress_my_005 | 퍼센트·현재 작업·완료 시 다운로드 URL |
| MY-06 | 내보내기 취소 | export_options / progress | 진행 중 취소 |
| MY-07 | 저장공간 상세 조회(유형별 분해 + 대용량 자산 + 인사이트 + 한도) | storage_detail_my_006, storage_limit_reached_my_006 | `limitReached` 플래그로 한도 도달 변형 표현 |
| MY-08 | 플랜 목록/비교 조회 | plan_comparison_upgrade_my_008_2 | 현재 플랜 + 가용 플랜 |
| MY-09 | 플랜 업그레이드(결제) | plan_comparison_upgrade_my_008_2 | **PG 미연동 stub** `[가정]` |
| MY-10 | 구매 복원 | plan_comparison_upgrade_my_008_2 | **stub** `[가정]` |
| (재사용) | 계정 삭제 요청 | account_deletion_confirmation_my_009_2 | **vault VAULT-07 재사용 — 신규 정의 없음** |

## 데이터 모델 초안
> 백엔드 참고용 초안. 최종 스키마는 backend-dev 재량.

- **Notification**: `id`, `userId`, `category`(AI_ANALYSIS|SYSTEM|BENEFIT), `type`(세부 종류: AI_COMPLETE, DUPLICATE_FOUND, COUPON_EXPIRING, VAULT_BACKUP …), `title`, `body`, `actionRoute`(nullable), `read`(boolean), `createdAt`. 카테고리 탭: 전체/AI 분석(AI_ANALYSIS)/시스템 관리(SYSTEM)/혜택(BENEFIT).
- **ExportJob**: `id`, `userId`, `dataTypes`(Set: JSON_METADATA, ORIGINAL_FILES), `destination`(DOWNLOAD|GOOGLE_DRIVE|EMAIL), `status`(PREPARING|COMPRESSING|DONE|FAILED|CANCELED), `progressPercent`(0~100), `currentTask`(string), `itemCount`, `estimatedBytes`, `downloadUrl`(nullable, DONE시), `createdAt`, `completedAt`.
- **Plan**: `id`(FREE|PREMIUM), `name`, `priceMonthly`(KRW number), `storageBytes`, `features`(string[]), `badge`(nullable, 예 "가장 인기 있음"). 사용자-플랜 관계는 `UserSubscription`(userId, planId, status, currentPeriodEnd).
- **StorageUsage**(파생/집계, 엔티티 아닐 수 있음): `usedBytes`, `totalBytes`(플랜 한도), `planName`, `limitReached`, `categories[]`(type, label, bytes, itemCount), `largestItems[]`, `insights[]`, `reclaimableBytes`.
- **AccountDeletionRequest**: vault 소유(VAULT-07). status PENDING, requestedAt, scheduledPurgeAt(요청+30일).

## 가정 및 상충
- `[가정]` notifications_my_004는 설정이 아닌 **알림 인박스**로 해석(토글 없음).
- `[가정]` MY-02 읽음 처리: 명시 read UI 없음. 빈 상태 문구 근거로 최소 계약만. 미구현 시 프론트는 클라이언트 상태로만 처리 가능.
- `[가정]` 알림 시간 그룹("오늘"/"이번 주")은 서버가 아닌 프론트가 `createdAt` 기준으로 분류.
- `[가정]` 내보내기 destination GOOGLE_DRIVE/EMAIL은 실제 연동 미구현 → 서버는 DOWNLOAD만 완주하고 나머지는 잡 상태만 진행(다운로드 URL 대신 안내). PG/외부 연동 stub.
- `[가정]` MY-09/MY-10 결제·복원은 외부 PG 미연동 → stub 응답(상태만 전이 또는 미지원 안내).
- `[상충]` 저장공간 총량: storage_detail은 `42.8 / 128 GB`, storage_limit_reached는 `5.0 / 5.0 GB(무료 5GB)`. → **동일 엔드포인트(MY-07)가 사용자 플랜에 따라 `totalBytes`/`planName`을 달리 반환**하는 것으로 통일. 128GB는 상위 플랜 예시, 5GB는 무료 플랜. `limitReached`로 한도 변형 구분.
- `[상충]` 계정 삭제: account_deletion 화면은 "30일 유예 + 재로그인 시 취소". vault VAULT-07 비고는 "유예·취소 흐름 화면 미제공"이었음 → **본 화면이 근거를 제공하므로 VAULT-07을 갱신**(scheduledPurgeAt = 요청+30일, 취소는 유예 내 재로그인). vault.md 변경 반영함(중복 정의 금지, 재사용).

## 재사용 경계 요약 (중요)
- **계정 삭제 = vault VAULT-07 `POST /api/vault/account/deletion-request` 재사용.** my 모듈은 신규 엔드포인트를 만들지 않는다. 화면의 확인 체크박스 → `{ confirm: true }`.
- **저장공간 분석**: cleanup CLEAN-01 대시보드의 `storage`(usedPercent/reclaimableBytes)는 **정리 탭용 요약**. MY-07은 **마이 탭용 상세**(유형별 분해·대용량 자산·플랜 한도)로 별개 소유. 중복 필드(reclaimableBytes)는 MY-07에도 포함하되 의미 동일.
- **대용량 자산 삭제/정리 실행**은 item ITEM-09 / cleanup 재사용(신규 없음).
