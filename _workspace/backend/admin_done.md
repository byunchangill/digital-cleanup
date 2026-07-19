# admin 모듈 백엔드 구현 완료 보고

> 모듈: admin · 작성일: 2026-07-20 · 기준: contracts/admin.md, specs/admin.md
> 빌드: `gradlew.bat build` **BUILD SUCCESSFUL** (전 테스트 통과, 컨텍스트 로드 + 신규 admin 테스트 포함)

## 데모 관리자 계정 (로그인 테스트용)
| 항목 | 값 |
|---|---|
| 이메일 | `admin@sortmate.app` |
| 비밀번호 | `GreenPine!Harbor42` (auth 데모와 동일 데모 비밀번호) |
| role | `ADMIN` / plan `PREMIUM` / status `ACTIVE` |

일반 로그인(`POST /api/auth/login`, EMAIL provider)으로 로그인 → 응답 `user.role="ADMIN"` 노출 → 프론트가 `/admin` 게이팅에 사용. accessToken으로 `/api/admin/**` 접근 가능.
기존 데모 유저 `demo@sortmate.app`(role=USER)로 admin API 호출 시 `403 ADMIN_REQUIRED` 확인 가능.

---

## Phase A — auth 확장 내역

| 변경 | 파일 |
|---|---|
| `User.role`(Role USER/ADMIN, 기본 USER), `User.plan`(UserPlan FREE/BASIC/PREMIUM, 기본 FREE), `User.status`(UserStatus ACTIVE/DORMANT/PENDING, 기본 ACTIVE) 필드 추가. 모두 `@Enumerated(STRING)` non-null, 빌더 미지정 시 기본값 채움(기존 signup/social 플로우 무변경) | `auth/entity/User.java` |
| 신규 enum | `auth/entity/Role.java`, `auth/entity/UserPlan.java`, `auth/entity/UserStatus.java` |
| `ADMIN_REQUIRED`(403) 추가 | `common/ErrorCode.java` |
| 로그인 응답 `user`에 `role` 노출(신규 필드) | `auth/dto/UserResponse.java` |
| ADMIN 라우트 가드 — 인증됐으나 role≠ADMIN이면 403. 기존 SecurityConfig(`anyRequest authenticated`)·JwtAuthenticationFilter 그대로 재사용, **신규 필터/인프라 없음**. 미인증은 기존 401 EntryPoint가 처리 | `admin/service/AdminGuard.java` (컨트롤러가 매 엔드포인트에서 호출) |

### `[가정]` UserPlan vs my.entity.Plan
- 계약은 `User.plan`을 `FREE/BASIC/PREMIUM`으로 정의. my 모듈의 `Plan`(구독 상수, `FREE/PREMIUM`만·가격 포함)과 값·의미가 달라 **재사용 불가** → 이름 충돌 회피 위해 `UserPlan`(auth 패키지)로 신규 정의. JSON에는 `.name()`만 노출되어 계약 값과 일치.
- **정합 주의**: admin `User.plan`(표시 배지)과 my `UserSubscription.plan`(실제 구독)은 현재 **독립**. 결제/구독 연동 시 동기화 로직이 필요하나 화면 근거 없어 미구현(YAGNI). 완료 보고서에 남김.

---

## Phase B — admin 구현 (`com.sortmate.admin.*`)

| ID | Method / Path | 상태 | 비고 |
|---|---|---|---|
| ADM-01 | `GET /api/admin/dashboard` | 구현 | 전역 집계. `totalUsers`(count), `savedToday`(오늘 00:00 KST 이후 savedAt), `totalItems`(count), `aiSuccessRate`(aiClassified 비율 근사, 아이템 0이면 데모 99.4), `unresolvedCs`/`urgentCs`(CsTicket 실집계), `recentSubscribers`(top4 최신), `recentInquiries`(미처리 top2). delta/응답속도/세션/서버/uptime은 데모 상수 |
| ADM-02 | `GET /api/admin/users` | 구현 | q(이름/이메일 부분일치)·status·plan 필터 + 페이지네이션. `storageUsedBytes`=소유 Item.fileSize 합, quota 50GB 상수, percent 소수1 |
| ADM-03 | `GET /api/admin/users/export` | 구현 | CSV(봉투 아님, `text/csv;charset=UTF-8`, `attachment; filename="members.csv"`). 계약 컬럼 순서 그대로. CSV 필드 이스케이프 처리 |
| ADM-04 | `GET /api/admin/cs/tickets` | 구현 | status·urgency 필터 + 페이지네이션. CsTicket 데모 시드 5건(조회 전용) |
| ADM-05 | `GET /api/admin/classification/quality` | 구현 | range 30D/90D. `avgAccuracy`=aiClassified 비율 근사. trend/clusters/suggestion 데모 데이터 |
| ADM-06 | `POST /api/admin/classification/validation-pack` | 구현 | 202 접수 stub, `runId`(uuid)/`status=QUEUED` |

### 신규 파일
- entity: `CsTicket`, `CsTicketType`, `CsUrgency`, `CsStatus`
- repository: `admin/repository/CsTicketRepository`
- dto: `AdminDashboardResponse`, `MemberDto`, `CsTicketDto`, `ClassificationQualityResponse`, `ValidationPackResponse`
- service: `AdminService`, `AdminGuard`
- controller: `AdminController`
- bootstrap: `AdminDemoDataInitializer`(@Order 3: admin 계정 + 데모 회원 6명 + CS 티켓 5건)
- 리포지토리 확장(재사용 우선):
  - `UserRepository`: `findTop4ByOrderByCreatedAtDesc`, `searchMembers(q,status,plan,pageable)`, (기존 `count()`)
  - `ItemRepository`: `countBySavedAtGreaterThanEqual`, `countByAiClassifiedTrue`, `sumFileSizeByOwnerId`
- 재사용: `item/dto/PageResponse`(공통 페이지 봉투) 그대로 사용, 공통 `ApiResponse`/`BusinessException`/`GlobalExceptionHandler`

---

## `[가정]` 목록 (계약 명시분 이행)
- AI 지표(성공률/정확도)는 `aiClassified=true` 비율 근사, 데이터 없으면 데모 상수. 응답속도·세션·서버상태·uptime·delta는 데모 상수.
- CS 티켓/오분류 클러스터/제안은 데모 데이터. Validation Pack은 no-op stub.
- storageQuota 50GB 상수(53687091200), storageUsedBytes는 Item.fileSize 합 파생.
- CSV 전체 내보내기 행수 상한 100,000 (`ponytail:` 대용량이면 스트리밍으로 승급).
- `storageUsedBytes`는 페이지 내 사용자별 개별 합계 쿼리(size ≤100). 비용 커지면 캐싱/집계 테이블로 승급(현 규모 불필요).

## 실행 방법
```
cd backend
gradlew.bat build          # 컴파일 + 테스트
gradlew.bat bootRun        # http://localhost:8080, seed-demo-data=true 기본
```
로그인: `POST /api/auth/login` body `{"email":"admin@sortmate.app","password":"GreenPine!Harbor42"}` → accessToken → `Authorization: Bearer` 로 `/api/admin/*` 호출.

## 미구현/미정의 (화면 근거 없음, YAGNI)
- 회원 조치(more_vert), CS 티켓 생성/응답/상태변경, Validation Pack 진행 폴링, ADMIN 승격 API — 모두 화면 미설계로 계약에서도 미정의. 요청 시 spec-analyst 계약 확장 필요.
