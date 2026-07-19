# item 모듈 백엔드 구현 완료 보고

> 구현일: 2026-07-19 · 기준: `_workspace/contracts/item.md`(14 엔드포인트) · 스택: Spring Boot 3.3.4 / Java 17 / JPA / H2

## 빌드/테스트 결과
- `gradlew.bat build` → **BUILD SUCCESSFUL** (27s)
- 단위 테스트: `ItemServiceTest` 15케이스 통과 (기존 auth 테스트 포함 전체 green)
- 경고: 테스트 내 `Specification` mock 캐스팅에 unchecked 경고 1건(무해)

## 구현 엔드포인트 (14/14)
| ID | Method | Path | 상태 |
|---|---|---|---|
| ITEM-01 | POST | `/api/items/import` (multipart) | 구현 |
| ITEM-02 | POST | `/api/items/memo` | 구현 |
| ITEM-03 | GET | `/api/items` | 구현 |
| ITEM-04 | GET | `/api/items/{id}` | 구현 |
| ITEM-05 | GET | `/api/items/{id}/related` | 구현 |
| ITEM-06 | PATCH | `/api/items/{id}` | 구현 |
| ITEM-07 | GET | `/api/items/favorites` | 구현 |
| ITEM-08 | PUT | `/api/items/{id}/favorite` | 구현 |
| ITEM-09 | POST | `/api/items/delete` | 구현 |
| ITEM-10 | POST | `/api/items/bulk/category` | 구현 |
| ITEM-11 | POST | `/api/items/bulk/tags` | 구현 |
| ITEM-12 | PUT | `/api/items/{id}/vault` | 구현 |
| ITEM-13 | POST | `/api/items/share` | 구현 |
| ITEM-14 | GET | `/api/categories` | 구현 |

## 생성 파일
```
com.sortmate.item
├── entity/        Item, ItemType, SourceType
├── repository/    ItemRepository (JpaSpecificationExecutor + 파생 쿼리)
├── dto/           ItemDto, ItemDetailDto, PageResponse, ItemWrapper,
│                  ImportResponse, RelatedItemsResponse, CategoryListResponse,
│                  ToggleRequests, ToggleResponses, MemoCreateRequest, ItemUpdateRequest
├── service/       ItemService
├── controller/    ItemController, CategoryController, PageableFactory
└── bootstrap/     ItemDemoDataInitializer (샘플 8건)
```
공통 변경(재사용 원칙 내 최소 확장):
- `common/ErrorCode.java`: 계약 코드 5종 추가 — `ITEM_NOT_FOUND(404)`, `ITEM_FORBIDDEN(403)`, `FILE_TOO_LARGE(413)`, `UNSUPPORTED_MEDIA_TYPE(415)`, `BULK_PARTIAL_FAILURE(422)`.
- `common/GlobalExceptionHandler.java`: `MaxUploadSizeExceededException → 413 FILE_TOO_LARGE` 핸들러 추가.
- `auth/bootstrap/AuthDemoDataInitializer.java`: `@Order(1)` 부여(item 시딩 @Order(2)보다 사용자 생성이 먼저 실행되도록). 로직 변경 없음.
- `application.yml`: multipart 상한(`max-file-size 20MB`, `max-request-size 210MB`) 추가.

**SecurityConfig**: 경로 인가는 기존 `.anyRequest().authenticated()`가 이미 `/api/items/**`·`/api/categories`를 커버(추가 등록 불필요). 단 QA-02 수정으로 `authenticationEntryPoint`를 추가함(아래 "QA 수정 내역" 참조). 인증 주체는 JwtAuthenticationFilter가 세팅한 principal(`sub=userId`)을 컨트롤러에서 `Authentication.getName()`으로 사용.

## 계약과 달라진 점 (반드시 확인)
1. **[중요] 일괄 작업의 `422 BULK_PARTIAL_FAILURE` 미사용.** ITEM-09/10/11의 부분 실패는 **200 성공 봉투 + `data.failedIds`** 로 반환한다. 근거: 공통 응답 봉투(`ApiResponse`)는 실패 시 `data=null`이라 계약이 요구하는 `data.failedIds`를 에러 응답에 실을 수 없다. 각 엔드포인트의 성공 스키마가 이미 `failedIds`를 포함하므로, 부분 실패를 200 본문으로 전달하는 것이 봉투 규약과 일관된 유일한 해석이다. → 프론트는 `failedIds` 비어있지 않음으로 부분 실패를 판단해야 함. (계약 수정 필요 시 spec-analyst 협의 권장)

## 구현상의 `[가정]` (계약의 `[가정]` 준수 + 재량 결정)
- **바이너리 저장 미연동**: ITEM-01 import는 파일 메타(fileSize/mimeType)만 저장하고 `thumbnailUrl`/`fileUrl`은 UUID 기반 플레이스홀더 경로(`/media/{uuid}/...`). 실제 스토리지 연동은 후속.
- **import type 매핑**: `sourceType=SCREENSHOT → type=SCREENSHOT`, `PHOTO → type=IMAGE`. sourceType 기본값 `PHOTO`.
- **메모 `attachmentIds`**: 계약이 첨부 연결 스키마를 정의하지 않아 수신은 하되 무시(no-op).
- **vaulted 마스킹**: 목록/상세/관련 응답에서 `vaulted=true`면 `thumbnailUrl`(+상세의 `fileUrl`·`aiSummary`)를 null로 마스킹. title/category/type 등 잠금 메타는 반환.
- **관련 아이템(ITEM-05)**: 같은 소유자·같은 `category`, 자기 자신 제외, `savedAt` 최신순 상위 N(기본 4, 최대 20). category가 null이면 빈 배열.
- **카테고리(ITEM-14)**: `Item.category` distinct 집계(non-null) + 개수, 개수 내림차순.
- **공유(ITEM-13)**: `https://sortmate.app/s/{token}` + 7일 만료 발급(토큰 해석 인프라는 후속). vaulted 포함 시 `400 VALIDATION_ERROR`.
- **정렬 화이트리스트**: sort 필드는 `savedAt|title|expiryDate|createdAt`만 허용, 그 외 `400 VALIDATION_ERROR`. size는 1~100 캡.
- **만료 임박**: `expiryDate`가 오늘+30일 이내(과거 포함)면 `expiringSoon=true`.
- **삭제 정책**: 소프트 삭제 아닌 hard delete(휴지통은 별도 cleanup 모듈 소관).

## QA 수정 내역
### QA-02 (2026-07-19): 인증 실패 시 403 빈 본문 → 401 ApiResponse 봉투
- **원인**: SecurityConfig에 `authenticationEntryPoint` 미지정 → 미인증 요청이 Spring Security 기본 거부(403, 봉투 미경유).
- **수정**:
  - `common/config/SecurityConfig.java`: `.exceptionHandling(ex -> ex.authenticationEntryPoint(...))` 추가.
  - `auth/security/JwtAuthenticationEntryPoint.java` (신규): 미인증 요청을 `401 + ApiResponse.failure(code, ...)` 봉투로 응답. ObjectMapper로 직렬화.
  - `auth/security/JwtAuthenticationFilter.java`: 토큰 파싱 실패 시 `BusinessException`의 코드(`TOKEN_EXPIRED`/`TOKEN_INVALID`)를 요청 속성(`AUTH_ERROR_ATTRIBUTE`)에 스탬핑 → EntryPoint가 만료/무효를 구분해 내려줌. 토큰 누락(속성 없음)은 `TOKEN_INVALID` 기본값.
- **accessDeniedHandler 미추가**: 소유권 인가(403 ITEM_FORBIDDEN)는 서비스 계층 `BusinessException` → `GlobalExceptionHandler`로 이미 봉투 처리됨. 메서드 레벨 권한(authority) 검사가 없어 Spring `AccessDeniedException` 경로가 발생하지 않으므로 불필요.
- **검증**: `gradlew.bat build` BUILD SUCCESSFUL. 동적 확인(런타임 curl):
  - 헤더 없음 → `401 {"code":"TOKEN_INVALID"}` ✅
  - garbage bearer → `401 {"code":"TOKEN_INVALID"}` ✅
  - (만료 토큰은 동일 경로로 `TOKEN_EXPIRED` 반환 — 코드 경로 확인, 별도 curl 미실시)
- **범위 주의**: SecurityConfig/JwtAuthenticationFilter는 auth 모듈 공통 인프라. 이번 수정은 전 모듈(인증 필요 경로 전체)의 401 UX를 개선한다.

## 계약 갱신 반영 (2026-07-19, item_edit_lib_004)
### ITEM-15 신규: AI 재분석 요청 (stub)
- `POST /api/items/{id}/reanalyze` — 요청 바디 없음, **202 ACCEPTED** + `{id, status:"QUEUED", message}`.
- AI 미연동 → `getOwned`(404/403)만 검사하는 no-op 접수 stub. 실제 큐잉/비동기 갱신은 AI 연동 후.
- `429 RATE_LIMITED`(재분석 남용 방지)는 계약상 `[가정]`이라 미구현. 레이트리밋 인프라 확보 시 추가.
- 컨트롤러: `@ResponseStatus(HttpStatus.ACCEPTED)`로 202 지정, `ApiResponse` 봉투 유지.

### ITEM-06 갱신: thumbnailFileId
- `ItemUpdateRequest`에 `thumbnailFileId(Long, 선택)` 추가. `isEmpty()`에도 반영.
- 서비스: 값이 있으면 해당 id의 미디어 Item을 소유·존재 검증(`findByIdAndOwnerId`) 후 그 `thumbnailUrl`로 교체. 유효하지 않으면 `400 VALIDATION_ERROR`.
- `aiSummary`는 요청 DTO에 애초에 없어 자동 무시(계약 비고 준수 확인). `category`는 문자열 그대로 저장 — enum 강제 안 함(계약 재량 허용).

### 테스트 보강 (`ItemServiceTest`)
- `updateThumbnailFromMedia`(썸네일 교체 반영), `updateBadThumbnail`(유효하지 않은 id → VALIDATION_ERROR)
- `reanalyzeQueued`(QUEUED 접수), `reanalyzeNotFound`(404)
- `gradlew.bat build` BUILD SUCCESSFUL.

> 참고: 이 시점 `ItemController.share`/`ItemService.share`는 vault 모듈 통합으로 `X-Vault-Token` 기반 3-인자 시그니처로 변경돼 있었음(vault 소관). 본 작업은 해당 변경 위에 ITEM-15/thumbnailFileId만 추가.

## 실행 방법
```bash
cd backend
./gradlew.bat bootRun        # 8080, H2 in-memory, 데모 데이터 자동 시딩
```
- 데모 계정: `demo@sortmate.app` / `GreenPine!Harbor42` (auth 로그인으로 accessToken 발급 후 `Authorization: Bearer {token}`)
- 데모 라이브러리: 위 계정에 샘플 Item 8건(쿠폰/영수증/링크/문서/사진/메모 2/vault 1) 자동 시딩
- 시딩 비활성화: `app.seed-demo-data=false`
- H2 콘솔: `/h2-console` (jdbc:h2:mem:sortmate)
```bash
./gradlew.bat test           # 단위 테스트만
```
