# Sortmate 개발 진행 상태

갱신: 2026-07-19 (cleanup 모듈 완료)

| 모듈 | 명세 | 백엔드 | 프론트 | QA | 실패 횟수 |
|------|------|--------|--------|-----|-----------|
| auth | ✅ 완료 | ✅ 완료 | ✅ 완료 | ✅ 통과 | 0 |
| item | ✅ 완료 | ✅ 완료 | ✅ 완료 | ✅ 통과 | 0 |
| home | ✅ 완료 | ✅ 완료 | ✅ 완료 | ✅ 통과 | 0 |
| cleanup | ✅ 완료 | ✅ 완료 | ✅ 완료 | ✅ 통과 | 0 |
| vault | ⬜ | ⬜ | ⬜ | ⬜ | 0 |
| my | ⬜ | ⬜ | ⬜ | ⬜ | 0 |

- admin: 2차 범위 (루프 대상 아님)
- 스캐폴딩: backend/(Spring Boot 3.3.4, gradlew build 통과)·frontend/(React18+Vite, npm run build 통과) — 회전 1에서 생성 완료
- item QA 보류 1건: ITEM-06 수정(편집) 화면이 설계에 없어 updateItem 미연결 — 편집 화면 확보 시 연결·재검증
- auth QA 보류·관찰 3건 (계약 위반 아님, `_workspace/qa/auth_report.md`): QA-01 소셜 OAuth 화면 밖, QA-02 recovery 이메일 입력 UI 미제공, QA-03 보호 경로 403 봉투 미통일(vault 착수 시 처리)
- 상태 기호: ⬜ 미착수 / 🔄 진행 중 / ✅ 완료 / ❌ 실패
