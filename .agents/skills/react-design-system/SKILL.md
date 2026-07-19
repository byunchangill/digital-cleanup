---
name: react-design-system
description: Sortmate 프론트엔드(React) 구현 컨벤션과 Stitch 화면 HTML → React 변환 방법. 프론트 코드 작성/수정, 화면 구현, 컴포넌트 제작, Tailwind 스타일링, API 연동, "화면 만들어줘", "프론트 구현해줘", "UI 수정" 요청 시 반드시 사용할 것. frontend-dev 에이전트의 기본 작업 스킬.
---

# React 프론트엔드 컨벤션 & 화면 변환

## 기술 스택 (고정)

- React 18+ + Vite + JavaScript(JSX), Tailwind CSS, react-router-dom, axios
- 프로젝트 루트: `frontend/`
- 디자인 원본: `docs/spec/stitch_system_design_specifications/{화면ID}/code.html` (+ `screen.png`)
- 디자인 토큰: `docs/spec/stitch_system_design_specifications/sortmate/DESIGN.md`

## 프로젝트가 아직 없다면

`frontend/`가 비어 있으면 Vite react 템플릿으로 생성하고 Tailwind를 설정한다. **Tailwind 설정에는 DESIGN.md frontmatter의 colors/typography/rounded/spacing 토큰을 전부 등록한다** — 화면 HTML들이 `bg-primary`, `text-text-muted` 같은 토큰 클래스를 그대로 쓰고 있으므로, 토큰이 등록되어 있어야 클래스를 복사해도 그대로 렌더링된다. 폰트(Hanken Grotesk, JetBrains Mono)와 Material Symbols는 `index.html`에서 로드한다. DESIGN.md와 화면 HTML의 값이 다르면 DESIGN.md를 우선한다.

## 디렉토리 구조

```
frontend/src/
├── api/          # axios 인스턴스(client.js) + 도메인별 API 함수 (authApi.js 등)
├── components/   # 공통 컴포넌트 (Button, Card, Chip, BottomNav, SearchBar, Toast...)
├── pages/        # 화면 단위 컴포넌트, 도메인별 하위 폴더 (pages/auth/LoginPage.jsx)
├── hooks/        # 공용 훅
└── App.jsx       # 라우터 정의
```

## Stitch HTML → React 변환 절차

1. 화면 폴더의 `code.html`을 읽는다. 스타일의 원본이므로 Tailwind 클래스를 최대한 그대로 옮긴다 (`class` → `className`, 셀프클로징 태그 수정).
2. 하드코딩된 표시 데이터(제목, 목록 아이템, 숫자)를 props/state로 치환한다. 화면의 정적 텍스트(라벨, 버튼 문구)는 그대로 둔다.
3. 반복 블록(카드 목록 등)은 `map()` 렌더링으로 바꾸고, 데이터 shape은 **API 계약의 응답 스키마와 동일하게** 맞춘다. 임의의 필드명을 지어내지 않는다 — 연동 시점에 전부 고쳐야 한다.
4. 결과가 `screen.png`와 시각적으로 일치하는지 확인한다. 임의 "개선" 금지.

## 공통 컴포넌트 규칙

- 두 화면 이상에서 반복되는 UI는 `components/`로 추출한다. 대표: 하단 5탭 네비게이션 + 중앙 '+' 버튼, 콘텐츠 카드, 상태 뱃지/칩, 검색바, 토스트, PIN 입력.
- 추출 전 `components/`에 이미 유사 컴포넌트가 있는지 확인한다. 변형이 필요하면 props로 확장하고, 복제본을 만들지 않는다.

## API 연동 규칙

- `api/client.js`의 axios 인스턴스 하나만 사용: baseURL `/api`(Vite proxy로 백엔드 연결), 요청 인터셉터에서 JWT 첨부, 응답 인터셉터에서 공통 봉투 `{ success, data, error }` 해제 — 페이지 코드는 `data`만 다룬다.
- 엔드포인트 경로/필드는 `_workspace/contracts/{모듈}.md`와 글자 단위로 일치시킨다.
- 백엔드 미완성 구간은 `api/mock/`에 mock 함수를 두고 도메인 API 함수에서 분기한다. mock 위치는 완료 보고서에 기록한다 — 기록 없는 mock은 실서비스에 남는다.

## 완료 기준

1. `npm run build` 통과
2. 모듈의 모든 화면이 라우트로 접근 가능하고 화면 간 이동 링크가 연결됨
3. `_workspace/frontend/{모듈}_done.md` 작성 — 화면/라우트 목록, mock 사용 위치, `[가정]` 목록
