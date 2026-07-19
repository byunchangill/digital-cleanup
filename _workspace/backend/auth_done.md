# auth 모듈 백엔드 구현 완료 보고

> 모듈: auth · 구현일: 2026-07-19 · 스택: Spring Boot 3.3.4 / Java 17 타깃(JDK 21 빌드) / Gradle / JPA / H2
> 입력 계약: `_workspace/contracts/auth.md` · 명세: `_workspace/specs/auth.md`

## 1. 빌드 결과

- 명령: `backend/gradlew build` (Windows: `gradlew.bat build`)
- 결과: **BUILD SUCCESSFUL** (7 tasks)
- 테스트: **21건 전부 통과** (failures 0 / errors 0)
  - `AuthServiceTest` 14건, `PasswordPolicyValidatorTest` 6건, `SortmateApplicationTests`(컨텍스트 로드) 1건
- 산출물: `backend/build/libs/sortmate-backend-0.0.1-SNAPSHOT.jar` (실행 가능 boot jar)
- 환경: JDK 21(Temurin)에서 빌드, `sourceCompatibility/targetCompatibility = 17`로 Java 17 바이트코드 타깃(툴체인 자동 다운로드 회피). 시스템 gradle 부재로 캐시된 gradle 8.10.2로 wrapper 생성.

## 2. 프로젝트 스캐폴딩 (신규 생성)

- 패키지 루트 `com.sortmate`, **도메인 우선** 패키지 구조.
- 공통 인프라: `common/ApiResponse`(봉투), `common/ErrorCode`(enum), `common/BusinessException`, `common/GlobalExceptionHandler`, `common/config/SecurityConfig`.
- 응답 봉투 `{ success, data, error }`, 필드 camelCase, 날짜 `Instant`+ISO 8601 직렬화.
- 보안: Spring Security stateless + BCryptPasswordEncoder + JWT(jjwt 0.12.6). `/api/auth/**`, `/h2-console/**` permitAll, 그 외 인증 필요. `JwtAuthenticationFilter`는 이후 보호 API 대비 선반영.
- DB: H2 in-memory(`ddl-auto: create-drop`). 운영 전환 시 JPA 추상화 유지.

## 3. 구현 엔드포인트 (계약 7종 전부 구현)

| ID | Method | Path | 상태 | 핵심 규칙 |
|---|---|---|---|---|
| AUTH-01 | POST | `/api/auth/social/{provider}` | 완료 | provider ∈ {kakao,google,apple} 검증(미지원→`VALIDATION_ERROR`), 검증 실패→`SOCIAL_AUTH_FAILED`. `data.auth`+`data.user`(`isNewUser` 포함) |
| AUTH-02 | POST | `/api/auth/login` | 완료 | BCrypt 비교, 실패→`INVALID_CREDENTIALS`(계정 미존재도 동일 코드). `data.user`에 `isNewUser` 미포함 |
| AUTH-03 | POST | `/api/auth/token/refresh` | 완료 | DB 저장 리프레시 토큰 검증·회전(revoke). 미존재/폐기→`TOKEN_INVALID`, 만료→`TOKEN_EXPIRED` |
| AUTH-04 | POST | `/api/auth/password/reset-request` | 완료 | **항상 200 성공 봉투**(계정 열거 방지). 존재 시 내부적으로 resetToken 발급 |
| AUTH-05 | POST | `/api/auth/password/reset` | 완료 | token(reset/recovery) 검증→불일치→정책 순 검사. `RESET_TOKEN_INVALID`/`PASSWORD_MISMATCH`/`PASSWORD_POLICY_VIOLATION`. 성공 시 `nextRoute:/login` |
| AUTH-06 | POST | `/api/auth/recovery/email` | 완료 | **항상 200 성공**. AUTH-04와 내부 로직 공유(별도 엔드포인트 유지) |
| AUTH-07 | POST | `/api/auth/recovery/code` | 완료 | 24자 영숫자(하이픈/공백 무시) 정규화·형식검증(`VALIDATION_ERROR`), BCrypt 코드 대조, 실패→`RECOVERY_CODE_INVALID`. 성공 시 단기 `recoveryToken`(600s)+`nextRoute:/password/new` |

- 응답 페이로드 필드명/타입은 계약과 글자 단위 일치(`accessToken/refreshToken/tokenType/expiresIn`, `tokenType="Bearer"`, `expiresIn=1800` 등).
- `ErrorCode` enum에 계약의 공통 에러 코드 9종 + 내부용 `INTERNAL_ERROR` 포함. HTTP 상태도 계약표(400/401/422/429/502)와 매핑.

## 4. 데이터 모델

- `User`(email unique, provider enum EMAIL|KAKAO|GOOGLE|APPLE, providerId, passwordHash, timestamps)
- `PasswordResetToken`(tokenType RESET|RECOVERY, expiresAt, usedAt) — AUTH-04/05/07 공용 단기 토큰
- `RecoveryCode`(codeHash=BCrypt, usedAt) — 1회용 24자 백업 키
- `RefreshToken`(token, expiresAt, revokedAt) — AUTH-03 회전/폐기 관리

## 5. 계약 대비 변경/미구현 사항

- **미구현 없음.** 계약의 7개 엔드포인트 전부 구현.
- 계약 스키마(필드/타입/경로) 변경 없음.
- 이메일 실제 발송(AUTH-04/06)과 소셜 provider 실제 OAuth 토큰 교환(AUTH-01)은 외부 인프라 연동 대상 → 인터페이스(`SocialAuthClient`) + 스텁 구현으로 처리. 계약의 요청/응답 계약면은 그대로 충족.

## 6. 자율결정 / 가정 기록

- `[자율결정]` **JWT 클레임 구성**: `sub`(userId), `email`, `provider`, `iat`, `exp` (HS256). 명세 "인증 토큰 체계" 절 준수.
- `[자율결정]` **TTL**: accessToken 1800s(계약 명시), refreshToken 14일, resetToken 30분, recoveryToken 600s(계약 AUTH-07 `expiresIn:600` 준수). 명세 `[가정]` 값 채택. `application.yml`에서 조정 가능.
- `[자율결정]` **refreshToken 형식**: 계약이 `string`(비-JWT 허용)으로 명시 → 회전/폐기가 용이한 DB 저장 불투명 토큰(UUID 결합)으로 구현.
- `[자율결정]` **resetToken/recoveryToken 저장 통합**: AUTH-05의 `token`이 reset 또는 recovery 둘 다 받으므로 `PasswordResetToken` 단일 엔티티에 `tokenType`으로 구분. AUTH-05는 토큰 문자열 단일 조회로 처리.
- `[자율결정]` **AUTH-05 검사 순서**: 토큰 유효성 → 비밀번호 확인 일치 → 정책 순. 소유권(토큰) 우선 검증으로 정보 노출 최소화.
- `[자율결정]` **소셜 로그인 스텁**(`StubSocialAuthClient`): 실제 OAuth 부재로 `authorizationCode`를 provider 사용자 ID로 간주(동일 코드 재요청 시 `isNewUser=false`). `invalid`/`fail` 접두 코드는 `SOCIAL_AUTH_FAILED` 유발(실패 경로 테스트용). 운영 구현체로 교체 예정.
- `[자율결정]` **비밀번호 정책**(`PasswordPolicyValidator`): 최소 12자 / 대문자 1+ / 특수문자 1+ / 흔한 패턴(123·password·qwerty 등) 금지. 화면 근거 정책 반영. 위반 항목을 `error.message`에 명시(계약 권장사항).
- `[자율결정]` **데모 시딩**(`AuthDemoDataInitializer`, `app.seed-demo-data=true` 기본): auth 계약에 회원가입 엔드포인트가 없어 이메일 로그인/복구 코드 수동검증용 계정 시딩.
  - email `demo@sortmate.app` / password `GreenPine!Harbor42`
  - recoveryCode `ABCD1234EFGH5678IJKL9012` (24자)
  - 기동 로그 `[DEMO SEED]`에 출력. 비활성화: `app.seed-demo-data=false`.
- PIN 관련 필드는 계약대로 auth에 **미포함**(vault 모듈 소관).

## 7. 실행 방법

```bash
cd backend
# 빌드 + 테스트
./gradlew build            # Windows: gradlew.bat build
# 서버 기동 (기본 포트 8080, H2 in-memory)
./gradlew bootRun          # Windows: gradlew.bat bootRun
```

- H2 콘솔: `http://localhost:8080/h2-console` (JDBC URL `jdbc:h2:mem:sortmate`, user `sa`, 빈 비밀번호)
- 스모크 예시:
  ```bash
  # 이메일 로그인 (데모 계정)
  curl -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"demo@sortmate.app","password":"GreenPine!Harbor42"}'

  # 복구 코드 검증 → recoveryToken 획득
  curl -X POST http://localhost:8080/api/auth/recovery/code \
    -H "Content-Type: application/json" \
    -d '{"email":"demo@sortmate.app","recoveryCode":"ABCD-1234-EFGH-5678-IJKL-9012"}'
  ```

## 8. 리팩터링 제안 (후속)

- 실제 이메일 발송 어댑터(SMTP/SES) 및 provider별 OAuth 클라이언트 구현 필요(현재 스텁).
- RATE_LIMITED(429): 코드/상태는 정의되어 있으나 실제 횟수 제한 로직 미구현 → Bucket4j 등으로 발송/시도 제한 추가 권장.
- 만료 토큰 정리 스케줄러(PasswordResetToken/RefreshToken) 추가 권장.
