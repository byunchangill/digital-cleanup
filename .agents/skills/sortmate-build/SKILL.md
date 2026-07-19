---
name: sortmate-build
description: Sortmate(디지털 정리 비서) 앱 개발 오케스트레이터. 화면 구현, 기능 개발, 모듈 개발, 백엔드/프론트 구현, "앱 만들어줘", "개발 시작해줘", "{모듈/화면} 구현해줘", 그리고 후속 작업 — "다시 실행", "재실행", "업데이트", "수정해줘", "보완해줘", "{부분}만 다시", "이전 결과 개선" 요청 시 반드시 이 스킬을 사용할 것. 에이전트 팀(spec-analyst, backend-dev, frontend-dev, qa-validator)을 구성하여 설계 분석 → 병렬 구현 → QA 파이프라인을 실행한다.
---

# Sortmate 개발 오케스트레이터

## 개요

Stitch 화면 설계(`docs/spec/stitch_system_design_specifications/`)를 기반으로 Spring Boot 백엔드 + React 프론트엔드를 모듈 단위로 개발한다.

**실행 모드: 에이전트 팀 (기본)** — 팀원 간 계약 조율·버그 리포트 전달이 품질의 핵심이므로 팀 통신이 필요하다. 팀 도구(TeamCreate/SendMessage/TaskCreate)를 사용할 수 없는 환경이면 **서브 에이전트 모드로 폴백**한다: `Agent` 도구로 순차/병렬 호출하고, 팀원 간 통신을 오케스트레이터가 파일 경로 전달로 중계한다. 모든 Agent 호출에 `model: "opus"`를 명시한다.

## 모듈 분할과 화면 매핑

| 순서 | 모듈 | 화면 폴더 |
|------|------|----------|
| 1 | auth (인증) | login_com_003_2, reset_password, set_new_password_com_007, account_recovery_com_008 |
| 2 | item (라이브러리 핵심) | gallery_import_add_002, item_detail_lib_003_2, favorites_lib_005, bulk_selection_lib_001, memo_writing_add_004 |
| 3 | home (홈/검색) | home_home_001_2, search_results_home_002_2, search_no_results_home_002 |
| 4 | cleanup (정리) | cleanup_dashboard_clean_001_2, duplicate_review_clean_002, unnecessary_screenshots_clean_005, cleanup_report_clean_008_2, cleanup_settings_my_004_2 |
| 5 | vault (시크릿 볼트) | app_lock_pin_entry_com_006, secret_item_detail_my_003, secret_item_detail_my_003_2, privacy_controls_my_002 |
| 6 | my (마이/설정) | notifications_my_004, export_options_my_005, data_export_progress_my_005, storage_detail_my_006, storage_limit_reached_my_006, plan_comparison_upgrade_my_008_2, account_deletion_confirmation_my_009_2 |
| 2차 범위 | admin (보류) | admin_member_cs_management_adm_003_2, classification_quality_adm_002_2 |

의존 관계: auth와 item이 기반이다(다른 모듈이 인증과 아이템 데이터에 의존). home~my는 item 완료 후 순서 조정 가능. **admin은 사용자 지시가 있을 때만 착수한다.**

## Phase 0: 컨텍스트 확인 (매 실행 시 최초 수행)

`_workspace/`와 `backend/`, `frontend/`의 존재를 확인하여 실행 모드를 결정한다:

- `_workspace/` 없음 → **초기 실행**: Phase 1부터 전체 파이프라인
- `_workspace/` 있음 + 부분 수정/개선 요청 → **부분 재실행**: 해당 모듈·해당 에이전트만 재호출 (예: "볼트 화면만 다시" → frontend-dev에 vault 모듈만, 이후 QA 재검증)
- `_workspace/` 있음 + 새로운 대규모 입력(설계 교체 등) → 기존 `_workspace/`를 `_workspace_prev/`로 이동 후 **새 실행**

진행 상태는 `_workspace/PROGRESS.md`에 모듈×단계(명세/백엔드/프론트/QA) 표로 기록하고, 매 단계 완료 시 갱신한다. 재실행 시 이 파일이 어디부터 이어할지 알려준다.

## 파이프라인 (모듈 단위 반복)

한 번에 1~2개 모듈만 진행한다. 전 모듈 동시 착수는 계약 변경이 전파되지 않아 품질이 무너진다.

```
[Phase 1] spec-analyst: 모듈 화면 분석
    → _workspace/specs/{모듈}.md + _workspace/contracts/{모듈}.md
[Phase 2] backend-dev ∥ frontend-dev (병렬, 계약 확정 후 착수)
    → backend/src/... + _workspace/backend/{모듈}_done.md
    → frontend/src/... + _workspace/frontend/{모듈}_done.md
[Phase 3] qa-validator: 경계면 교차 비교 (모듈 완료 직후 즉시 — 몰아서 하지 않음)
    → _workspace/qa/{모듈}_report.md
[Phase 4] 실패 항목 담당자 수정 → QA 재검증 (통과까지, 최대 2회 반복)
[Phase 5] PROGRESS.md 갱신 → 다음 모듈
```

첫 모듈(auth) 시작 전, backend-dev와 frontend-dev에게 각각 프로젝트 스캐폴딩(`backend/`, `frontend/` 초기 생성)을 먼저 요청한다 — 각자의 컨벤션 스킬에 생성 절차가 있다.

## 팀 구성

| 팀원 | 에이전트 정의 | 사용 스킬 |
|------|--------------|----------|
| spec-analyst | `.Codex/agents/spec-analyst.md` | feature-spec |
| backend-dev | `.Codex/agents/backend-dev.md` | springboot-conventions |
| frontend-dev | `.Codex/agents/frontend-dev.md` | react-design-system |
| qa-validator | `.Codex/agents/qa-validator.md` | integration-qa |

팀 크기 4명 고정. 작업 할당 시 각 팀원에게 모듈명, 관련 화면 폴더 목록, 참조할 산출물 경로를 명시하여 전달한다.

## 데이터 전달 프로토콜

- **파일 기반 (산출물)**: 모든 중간 산출물은 `_workspace/` 아래 약속된 경로. 최종 코드는 `backend/`, `frontend/`. 중간 파일은 삭제하지 않는다(감사 추적).
- **태스크 기반 (조율)**: 모듈×단계를 TaskCreate로 등록하고 의존 관계를 걸어 진행 상황을 추적한다.
- **메시지 기반 (실시간)**: 계약 변경 알림, 계약 질문, 버그 리포트 전달은 SendMessage로 직접 통신한다.
- 서브 에이전트 폴백 시: 태스크/메시지 대신 오케스트레이터가 반환값을 수집하고, 다음 호출의 프롬프트에 관련 파일 경로를 넣어 중계한다.

## 루프 모드 (ralph-loop 무인 실행)

루트 `PROMPT.md`를 통해 ralph-loop 회전에서 호출된 경우, 아래 오버라이드 규칙을 적용한다. 그 외 규칙은 기존 파이프라인 그대로다.

- **1회전 = 정확히 모듈 1개**. "1~2개" 규칙을 1개로 고정한다. 스캐폴딩이 필요하면 스캐폴딩+auth를 같은 회전에서 진행해도 된다.
- **사용자 질문 금지** — 사용자 확인 지점을 다음과 같이 자율 처리로 전환한다:
  - 계약 상충 → 화면 근거가 강한 해석을 채택하고, 계약 문서와 `_workspace/LOOP_LOG.md`에 `[자율결정]` 태그로 채택 근거와 기각 해석을 기록한다.
  - QA 2회 반복 후에도 실패 항목 잔존 → 모듈을 `실패(2회)`로 표기하고 다음 모듈로 진행한다 (사용자 보고는 루프 종료 시 일괄).
  - 빌드 환경 문제(Java/Node/gradlew/npm 자체 불능) → 유일한 루프 중단 사유. LOOP_LOG.md에 기록 후 `PROMPT.md`의 완료 문구를 출력하여 루프를 종료한다.
- **PROGRESS.md 확장**: 모듈×단계 표에 `실패 횟수` 컬럼을 추가하여 회전 간 실패 카운트를 승계한다.
- **완료 보고 절의 "피드백 요청"은 생략**한다 — 대신 모든 보고 내용을 LOOP_LOG.md에 기록한다.

## 에러 핸들링

| 상황 | 대응 |
|------|------|
| 에이전트 작업 실패 | 1회 재시도. 재실패 시 해당 모듈을 "실패" 기록하고 다음 모듈 진행, 최종 보고에 명시 |
| QA 반복 2회 후에도 실패 항목 잔존 | 잔존 항목을 사용자에게 보고하고 판단을 요청 (무한 루프 방지) |
| 계약 상충 발견 | 삭제하지 않고 spec-analyst가 양쪽 해석 병기 후 사용자에게 확인 |
| 빌드 환경 문제 (Java/Node 미설치 등) | 즉시 사용자에게 보고 — 환경 설치는 사용자 결정 사항 |

## 완료 보고

각 실행 종료 시 사용자에게 보고한다: 완료 모듈과 단계, QA 통과/잔존 이슈, `[가정]` 목록(사용자 확인 필요 항목), 다음 권장 모듈. 보고 후 개선할 부분이 있는지 피드백을 요청한다(하네스 진화 입력).

## 테스트 시나리오

**정상 흐름**: "auth 모듈 개발해줘" → Phase 0(초기 실행 판정) → spec-analyst가 인증 화면 4종 분석, specs/contracts 생성 → backend-dev·frontend-dev 병렬 구현(스캐폴딩 포함) → qa-validator 교차 비교 통과 → PROGRESS.md 갱신, 완료 보고.

**에러 흐름**: QA에서 "프론트가 `res.data.data` 이중 접근" 발견 → frontend-dev에게 리포트 전달 → 수정 → QA가 실패 항목만 재검증 → 통과. / backend-dev 빌드 2회 실패 → 모듈 "실패" 기록, 실패 로그와 함께 사용자 보고.

**부분 재실행**: "볼트 화면 디자인 수정해줘" → Phase 0에서 `_workspace/` 감지 + 부분 수정 판정 → frontend-dev만 vault 모듈 재호출 → qa-validator가 vault 회귀 검증 → 보고.
