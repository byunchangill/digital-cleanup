---
name: springboot-conventions
description: Sortmate 백엔드(Spring Boot) 구현 컨벤션. 백엔드 코드 작성/수정, API 구현, 엔티티/DTO 설계, 예외 처리, "백엔드 만들어줘", "API 구현해줘", "서버 코드 수정" 요청 시 반드시 사용할 것. backend-dev 에이전트의 기본 작업 스킬.
---

# Spring Boot 백엔드 컨벤션

## 기술 스택 (고정)

- Java 17, Spring Boot 3.x, Gradle(Groovy DSL), Spring Data JPA
- DB: 개발/테스트는 H2(in-memory), 운영 전환 시 MySQL — JPA로 추상화하므로 코드 변경 최소화
- 인증: Spring Security + JWT (Access Token, `Authorization: Bearer` 헤더)
- 프로젝트 루트: `backend/`

## 프로젝트가 아직 없다면

`backend/`가 비어 있으면 Spring Initializr 구조로 생성한다. 의존성: web, data-jpa, security, validation, h2, lombok. 메인 패키지는 `com.sortmate`. 생성 후 `gradlew build`가 통과하는 상태를 만든 뒤 기능 구현을 시작한다.

## 패키지 구조 — 도메인 우선

```
com.sortmate
├── common/          # 공통 응답 봉투, 전역 예외 처리, 공통 설정
│   ├── ApiResponse.java
│   ├── ErrorCode.java
│   ├── GlobalExceptionHandler.java
│   └── config/ (SecurityConfig 등)
└── {domain}/        # auth, item, cleanup, vault, member 등 도메인별
    ├── controller/
    ├── service/
    ├── repository/
    ├── entity/
    └── dto/
```

계층별 패키지(`controllers/`, `services/`에 전 도메인 혼합)가 아니라 도메인별 패키지를 쓴다. 모듈 단위 개발·QA와 경계가 일치해야 서로 밟지 않는다.

## 공통 응답 봉투

모든 컨트롤러는 아래 형태로 응답한다 (API 계약의 규격과 동일):

```json
{ "success": true,  "data": { ... },  "error": null }
{ "success": false, "data": null,     "error": { "code": "ITEM_NOT_FOUND", "message": "..." } }
```

- 에러 코드는 `ErrorCode` enum에 모은다. 계약 문서에 등장하는 코드는 빠짐없이 enum에 있어야 한다.
- 예외는 서비스에서 `BusinessException(ErrorCode)`으로 던지고 `GlobalExceptionHandler`가 봉투로 변환한다. 컨트롤러에서 try-catch 하지 않는다.

## 구현 규칙

- **계약이 우선**: 경로, 필드명, 타입은 `_workspace/contracts/{모듈}.md`와 글자 단위로 일치시킨다. JSON 필드는 camelCase.
- **엔티티를 직접 응답하지 않는다**: 반드시 응답 DTO로 변환. 엔티티 직렬화는 지연 로딩 예외와 스키마 누출을 부른다.
- **검증**: 요청 DTO에 `@Valid` + Bean Validation 어노테이션. 계약의 제약(최대 길이 등)을 여기에 반영한다.
- **날짜**: 엔티티는 `Instant`, JSON 직렬화는 ISO 8601.
- **시크릿 볼트**: PIN은 평문 저장 금지 — BCrypt 해시. 볼트 잠금 해제 상태는 짧은 만료의 별도 토큰/클레임으로 다룬다.
- **테스트**: 비즈니스 규칙이 있는 서비스 메서드에 JUnit 단위 테스트. `@SpringBootTest` 남발 대신 Mockito 단위 테스트 우선.

## 완료 기준

1. `gradlew build` 통과 (Windows에서는 `gradlew.bat build`)
2. 계약의 모든 엔드포인트가 구현되었거나, 미구현 건이 완료 보고서에 사유와 함께 기록됨
3. `_workspace/backend/{모듈}_done.md` 작성 — 구현 엔드포인트 목록, `[가정]` 목록, 실행 방법
