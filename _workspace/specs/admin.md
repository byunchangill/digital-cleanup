# admin (관리자) 기능 명세

> 모듈: admin · 작성일: 2026-07-20 · 대상 화면: admin_dashboard_adm_001, admin_member_cs_management_adm_003_2, classification_quality_adm_002_2
> 2차 범위였으나 사용자 지시로 착수. **AI 미연동·CS 시스템 미연동** 상태 → AI 지표/오분류 클러스터/CS 티켓은 근사·데모 데이터 수준(YAGNI).

## 화면 목록
| 화면 ID (폴더명) | 화면 이름 | 라우트(제안) |
|---|---|---|
| admin_dashboard_adm_001 | 운영 대시보드 | `/admin` |
| admin_member_cs_management_adm_003_2 | 회원 관리 | `/admin/members` |
| classification_quality_adm_002_2 | 분류 품질 | `/admin/quality` |

> 로그인: **관리자 전용 로그인 화면 없음.** 일반 로그인(AUTH-02, `/login`) 재사용. 로그인 후 사용자 `role=ADMIN`이면 `/admin` 접근 허용, 그 외 진입 시 403.

## 사용자 흐름
```
/login (일반 로그인 재사용)
   └─(role=ADMIN)→ /admin (운영 대시보드)
         ├─ "모두 보기"(최근 가입자) ─────────→ /admin/members
         ├─ "전체 문의 대응하기"(문의 요약) ───→ /admin/members (CS FAB) 또는 CS 탭 [가정]
         └─ 사이드 네비 group 아이콘 ─────────→ /admin/members
   /admin/members (회원 관리)
         ├─ 사이드 탭: 대시보드 → /admin
         ├─ 사이드 탭: CS 관리 / 보안 로그 / 시스템 설정 → [범위 밖, 화면 미설계]
         ├─ 회원 행 more_vert → 회원 상세/조치 [범위 밖, 상세 화면 미설계]
         └─ CSV 내보내기 → 파일 다운로드
   /admin/quality (분류 품질)  ← 사이드 네비 analytics 아이콘 [가정]
         └─ "Run Validation Pack" → 검증 파이프라인 접수(stub, 202)
```
> 하단 탭바(Home/Library/Cleanup/My)는 일반 사용자 앱 셸이 admin 화면에도 렌더된 것 — admin 네비는 사이드바(대시보드/회원/CS/보안/설정)가 정본. 하단 탭바는 admin 흐름과 무관.

## 기능 목록
| ID | 기능 | 관련 화면 | 비고 |
|---|---|---|---|
| ADM-01 | 운영 대시보드 집계 조회 | adm_001, adm_003_2 | 전 플랫폼 KPI(가입자/저장자료/AI지표/서버) + 최근 가입자·문의 요약. 두 화면 KPI 카드 공용 |
| ADM-02 | 회원 목록 조회(검색/필터/페이지) | adm_003_2 | 전체 사용자 대상. 저장공간 사용량·플랜·상태 포함 |
| ADM-03 | 회원 목록 CSV 내보내기 | adm_003_2 | 파일 다운로드(봉투 아님) |
| ADM-04 | CS 문의(티켓) 목록 조회 | adm_001, adm_003_2 | **데모 데이터.** 유형/긴급도/상태 |
| ADM-05 | 분류 품질 지표 조회 | adm_002_2 | 정확도 추이 + 오분류 클러스터 + AI 제안. AI 근사/데모 |
| ADM-06 | Validation Pack 실행 | adm_002_2 | **stub(202 접수만).** 재학습/검증 파이프라인 범위 밖 |

> 권한: **ADM-01~06 전 엔드포인트 `role=ADMIN` 필요.** 미충족 시 `403 ADMIN_REQUIRED`. 상세는 contracts/admin.md "권한 규약".

## 데이터 모델 초안

### User 확장 (기존 엔티티에 필드 추가 — 상세는 contracts/admin.md "auth 계약 확장 필요")
| 필드 | 타입 | 근거 화면 | 비고 |
|---|---|---|---|
| `role` | enum USER/ADMIN | (전 화면 인가) | **[가정]** 신규. 기본 USER. admin API 인가 축 |
| `plan` | enum FREE/BASIC/PREMIUM | adm_001 최근 가입자("Premium/Free/Basic Plan") | **[가정]** 신규. 결제 모듈 미존재 → 기본 FREE |
| `status` | enum ACTIVE/DORMANT/PENDING | adm_001 배지(Active/Pending), adm_003_2 배지(활성/휴면) | **[가정]** 신규. 기본 ACTIVE. `[상충]` 항목 참조 |

> 저장공간 사용량(`storageUsedBytes`)은 **엔티티 필드 아님** — 사용자 소유 Item의 `fileSize` 합으로 파생. 할당량(`storageQuotaBytes`)은 `[가정]` 상수 50GB(화면 "/ 50 GB" 고정). backend 재량 캐싱.

### CsTicket (신규, 데모 전용) — **[가정]**
| 필드 | 타입 | 근거 |
|---|---|---|
| `id` | number | adm_001 "ID: 29384" |
| `subject` | string | adm_001 "결제 오류 신고", "기능 제안: 폴더 공유" |
| `type` | enum PAYMENT_ERROR/FEATURE_REQUEST/GENERAL | adm_001 아이콘 분기(priority_high vs chat_bubble) |
| `urgency` | enum URGENT/NORMAL | adm_001 "긴급"/"일반" 라벨 |
| `status` | enum OPEN/IN_PROGRESS/RESOLVED | adm_003_2 "미처리 CS 42" 집계 근거 |
| `createdAt` | ISO 8601 | 정렬용 |
> 실제 CS 시스템 연동은 범위 밖. seed 데모 데이터로 채운다. 티켓 생성/응답 API는 화면(작성/응답 폼) 미설계 → 미정의(YAGNI). 조회만.

### AI 지표 (엔티티 아님 — 근사/데모) — **[가정]**
- **AI 분석 성공률**(adm_001 99.4%), **분류 정확도**(adm_002 94.2%): AI 미연동으로 실측 불가.
  - 근사안: 전체 Item 중 `aiClassified=true` 비율을 성공률로 노출(집계 가능). 정확도 추이·클러스터 등 시계열/상관 데이터는 **데모 상수**로 제공.
- **평균 응답 속도**(1.2s), **서버 uptime**(99.98%): 실측 인프라 없음 → 데모 상수. 과도한 모니터링 연동 금지.

## 가정 및 상충
- **[가정]** `role`(USER/ADMIN) User 신규 필드 — 지금까지 관리자 개념 부재. admin 인가의 근간. auth 계약 확장 필요(하단 섹션 + contracts/admin.md).
- **[가정]** `plan`, `status` User 신규 필드 — 화면 배지/플랜 표시 근거. 결제/휴면정책 모듈 미존재 → 기본값(FREE/ACTIVE)으로 시작, 데모 시드로 다양화.
- **[가정]** 저장공간 사용량은 Item.fileSize 합 파생, 할당량 50GB 상수.
- **[가정]** CsTicket 최소 엔티티 + 데모 시드. 조회 전용.
- **[가정]** AI 성공률/정확도는 aiClassified 비율 근사 또는 데모 상수. 응답속도·uptime은 데모 상수.
- **[가정]** Validation Pack은 no-op stub(202). 재학습 파이프라인 없음.
- **[가정]** 집계는 **전 사용자 합산**(기존 item/home/cleanup는 본인 소유만) — admin은 소유자 필터 제거한 전역 집계 쿼리.
- **[가정]** 대시보드 KPI와 회원관리 상단 카드는 총 가입자 수가 동일 → 단일 ADM-01 응답을 두 화면이 공용(엔드포인트 분산 회피).
- **[상충]** 사용자 상태 값: adm_001은 `Active/Pending`, adm_003_2는 `활성/휴면(Dormant)`. → **status enum을 ACTIVE/DORMANT/PENDING 3값 합집합으로 정의**하고 화면별로 표시 라벨만 다르게 매핑(프론트). 삭제 없이 병기.

## auth 계약 확장 필요 (backend-dev가 auth.md·User 엔티티에 반영)
> **admin.md에서만 정리. auth.md 직접 수정 안 함.** backend-dev가 아래를 auth 계약/엔티티 양쪽에 반영할 것.
1. `User.role` 필드 신규: `@Enumerated(EnumType.STRING)`, `enum Role { USER, ADMIN }`, 기본 `USER`, non-null. 기존 가입 플로우(AUTH-02/08)는 항상 `USER`로 생성. ADMIN 승격은 수동(시드/DB) — 승격 API는 화면 근거 없어 미정의.
2. `User.plan` 필드 신규: `enum Plan { FREE, BASIC, PREMIUM }`, 기본 `FREE`, non-null.
3. `User.status` 필드 신규: `enum UserStatus { ACTIVE, DORMANT, PENDING }`, 기본 `ACTIVE`, non-null.
4. JWT/인가: 토큰 클레임 또는 조회 시 `role`로 admin 라우트 가드. auth 공통 에러표에 `403 ADMIN_REQUIRED` 추가 권고(발생: 인증됐으나 role≠ADMIN).
5. AUTH-02/08 응답 `user` 오브젝트에 `role` 노출 권고(프론트가 로그인 후 `/admin` 진입 여부 판단). — **선택**, 미노출 시 프론트는 admin API 403으로 판단 가능.
