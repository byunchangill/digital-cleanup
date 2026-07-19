# Sortmate

디지털 정리 비서 앱. Stitch 화면 설계(`docs/spec/stitch_system_design_specifications/`)를 기반으로 모듈 단위 개발한다.

## Stack

- Backend: Spring Boot (Java 17, Gradle, JPA)
- Frontend: React + Vite + Tailwind

## Structure

```
backend/    Spring Boot API 서버
frontend/   React 클라이언트
docs/spec/  Stitch 화면 설계 (기능 명세/API 계약의 소스)
_workspace/ 모듈별 산출물 (spec/contract/구현/QA 기록)
```

## Run

```bash
# backend
cd backend && ./gradlew bootRun

# frontend
cd frontend && npm install && npm run dev
```

## Development

Claude Code 하네스(`.claude/agents`, `.claude/skills`)로 모듈 단위 개발을 진행한다. 자세한 내용은 [CLAUDE.md](CLAUDE.md) 참고.
