# digital_cleanup — Sortmate

## 하네스: Sortmate 앱 개발

**목표:** Stitch 화면 설계(`docs/spec/stitch_system_design_specifications/`) 기반으로 Spring Boot + React 앱을 모듈 단위로 개발한다.

**트리거:** Sortmate 개발 관련 작업(화면/기능/모듈 구현, 수정, 재실행, QA) 요청 시 `sortmate-build` 스킬을 사용하라. 설계 내용에 대한 단순 질문은 직접 응답 가능. 전 모듈 무인 자동 빌드는 ralph-loop + 루트 `PROMPT.md`로 실행한다(sortmate-build 루프 모드).

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-07-19 | 초기 구성 (에이전트 4종, 스킬 5종) | 전체 | Stitch 설계 기반 하네스 신규 구축. 스택: Spring Boot + React. admin 모듈은 2차 범위로 보류 |
| 2026-07-19 | 루프 엔지니어링 추가 (PROMPT.md, sortmate-build 루프 모드) | sortmate-build, PROMPT.md | 전 모듈 무인 반복 빌드 (ralph-loop, 완전 자율) |
