# vault (시크릿 볼트) 기능 명세

> 모듈: vault · 작성일: 2026-07-19 · 작성자: spec-analyst
> 범위: 앱/볼트 잠금 PIN, 시크릿 아이템 마스킹 해제 열람, 프라이버시(개인정보) 설정, 계정 데이터 삭제 요청
> 경계: Item의 `vaulted` 플래그 변경은 **item 모듈 소관**(ITEM-12). vault는 **PIN 설정/검증/세션**과 **마스킹 해제 열람**, **프라이버시 설정**을 소유한다.

## 화면 목록
| 화면 ID (폴더명) | 화면 이름 | 라우트(제안) |
|---|---|---|
| app_lock_pin_entry_com_006 | 앱/볼트 잠금 PIN 입력 | `/vault/lock` |
| secret_item_detail_my_003 | 시크릿 아이템 상세 (이미지형) | `/vault/items/:id` |
| secret_item_detail_my_003_2 | 시크릿 아이템 상세 (문서형) | `/vault/items/:id` (동일 화면의 다른 아이템 타입 렌더링) |
| privacy_controls_my_002 | 개인정보 제어 (프라이버시 설정) | `/my/privacy` |

> `secret_item_detail_my_003`와 `_2`는 **같은 화면**의 두 변형(이미지 아이템 vs 문서 아이템)이다. 하나의 라우트/컴포넌트로 통합하고 `item.type`에 따라 렌더링한다. 상세는 아래 [상충] 참조.

## 사용자 흐름

```
(라이브러리/즐겨찾기에서 vaulted 아이템 카드 탭)
        │
        ▼
   /vault/items/:id  ── 잠긴 상태(블러+마스킹) ──▶ [탭하여 잠금 해제] 
        │                                              │
        │                                              ▼
        │                                   볼트 세션 없음 → /vault/lock 또는 인라인 생체/PIN
        │                                              │
        │                              PIN 6자리 입력 / Face ID
        │                                              │
        │                                     검증 성공(볼트 세션 발급)
        │                                              ▼
        └──────────────── 마스킹 해제 열람(원본 이미지/파일·AI요약·태그·메타) ◀──┘
                                   │
             ┌─────────────────────┼──────────────────────┐
             ▼                     ▼                      ▼
      [일반 보관함으로 이동]   [안전하게 공유]        [삭제 / 저장 / 인쇄]
      = item.ITEM-12         = item.ITEM-13         = item.ITEM-09 등
      (vaulted=false,        (vaulted 공유 정책)    (item 모듈)
       볼트 세션 선행)

(내 정보 탭)
        ▼
   /my/privacy  ── 3개 토글(AI학습/통계공유/맞춤제안) 즉시 저장
        │
        └──▶ [계정 탈퇴 요청] ──▶ 데이터 삭제 요청 접수(비동기, 즉시 삭제 아님)
```

- **잠금 화면(app_lock_pin_entry)** 진입 경로: (1) 앱 콜드 스타트 시 앱 잠금이 켜져 있으면 최초 게이트, (2) vaulted 아이템 열람 시 볼트 세션이 없을 때. 두 경우 모두 동일한 PIN/생체 검증을 사용한다. `[가정]`
- 잠금 화면 하단 "비밀번호를 잊으셨나요? 고객 지원팀에 문의하세요"는 외부 지원 링크(딥링크/이메일)로, 서버 API 없음. `[가정]`

## 기능 목록
| ID | 기능 | 관련 화면 | 비고 |
|---|---|---|---|
| VAULT-01 | PIN 설정/변경 | app_lock_pin_entry | 최초 설정 또는 기존 PIN 변경 |
| VAULT-02 | 볼트 상태 조회 | app_lock_pin_entry, secret_item_detail | PIN 설정 여부·잠금 여부·생체 사용 여부·잠금해제 유무 |
| VAULT-03 | PIN 검증 → 볼트 잠금 해제(세션 발급) | app_lock_pin_entry, secret_item_detail | 6자리 PIN. 실패 시 shake·재입력. 생체인증도 이 경로로 귀결 |
| VAULT-04 | 시크릿 아이템 마스킹 해제 열람 | secret_item_detail (2종) | 볼트 세션 필요. 원본 이미지/파일·AI요약·태그·메타 반환 |
| VAULT-05 | 프라이버시 설정 조회 | privacy_controls | 3개 토글 현재값 |
| VAULT-06 | 프라이버시 설정 변경 | privacy_controls | 토글 부분 수정 |
| VAULT-07 | 계정 데이터 삭제 요청 | privacy_controls | "계정 탈퇴 요청". 즉시 삭제 아님(요청 접수) |

> **생체인증(Face ID)에 별도 서버 API 없음**: 화면 스크립트가 보여주듯 생체인증은 기기 로컬에서 수행되고, 성공 시 보안 저장소의 PIN을 자동 제출하여 VAULT-03으로 귀결된다. 서버는 생체 결과를 검증하지 않는다. → 별도 엔드포인트 미생성(YAGNI). `[가정]`
> **볼트 수동 잠금(lock) API 없음**: 화면에 명시적 잠금 버튼이 없다. 세션은 TTL 만료 또는 앱 백그라운드 전환으로 자연 종료된다(클라이언트가 토큰 폐기). 필요 시 후속 추가. (YAGNI)

## 데이터 모델 초안

### VaultConfig (사용자당 1개)
| 필드 | 타입 | 설명 |
|---|---|---|
| userId | FK(User) | 소유자 |
| pinHash | string\|null | 6자리 PIN의 해시(BCrypt 등). null이면 미설정 |
| pinSetAt | timestamp\|null | PIN 설정/변경 시각 |
| appLockEnabled | boolean | 앱 콜드 스타트 잠금 게이트 사용 여부. 기본 true(PIN 설정 시) `[가정]` |
| biometricEnabled | boolean | 생체인증 사용 동의. 기본 false |
| failedAttempts | int | 연속 실패 횟수. 성공 시 0으로 리셋 |
| lockedUntil | timestamp\|null | 시도 초과 잠금 해제 예정 시각 |

### PrivacySettings (사용자당 1개)
| 필드 | 타입 | 화면 기본값 | 설명 |
|---|---|---|---|
| userId | FK(User) | - | 소유자 |
| aiTrainingConsent | boolean | true(checked) | 익명 데이터 AI 학습 허용 |
| usageStatsSharing | boolean | false(unchecked) | 사용 통계 공유 |
| personalizedSuggestions | boolean | true(checked) | 맞춤형 정리 제안 |

### AccountDeletionRequest
| 필드 | 타입 | 설명 |
|---|---|---|
| userId | FK(User) | 요청자 |
| requestedAt | timestamp | 요청 시각 |
| status | enum(PENDING\|CANCELLED\|COMPLETED) | 처리 상태. 접수 시 PENDING |
| scheduledPurgeAt | timestamp\|null | 실제 파기 예정 시각(유예 기간 후) `[가정]` |

> 볼트 세션(잠금 해제 상태)은 **서버 저장 상태가 아닌 단기 토큰**으로 표현한다(아래 [가정] 참조). VaultConfig에 unlocked 플래그를 두지 않는다 — 백엔드 JWT가 stateless이므로 세션 상태를 토큰에 담는 편이 테스트/확장에 유리.

## 가정 및 상충

### [가정]
- **[가정] 볼트 세션 방식 = 단기 `vaultToken`**: VAULT-03 성공 시 서버가 짧은 TTL(기본 300초)의 불투명 `vaultToken`을 발급한다. 클라이언트는 이후 마스킹 해제 열람(VAULT-04) 요청 시 이 토큰을 `X-Vault-Token` 헤더로 전달한다. 토큰 부재/만료 시 `403 VAULT_LOCKED`. → auth QA-03(보호 경로 403 봉투 미통일)을 vault 착수 시 처리: vault의 403은 반드시 공통 봉투 `{success,data,error}`로 반환하도록 백엔드에 명시(AccessDeniedHandler/자체 필터). JWT 미인증은 기존 401 봉투(auth) 유지.
- **[가정] 앱 잠금과 아이템 잠금은 단일 볼트 세션 공유**: 한 번 잠금 해제하면 TTL 동안 모든 vaulted 아이템 열람 가능(화면마다 재인증 불필요). 화면상 per-item "탭하여 잠금 해제"는 세션이 없을 때만 인증 모달을 띄운다.
- **[가정] PIN = 정확히 6자리 숫자**: 화면의 PIN dot 6개·키패드 근거. 설정/검증 모두 `^\d{6}$` 제약.
- **[가정] 시도 초과 잠금**: 연속 5회 실패 시 `VAULT_LOCKED_OUT`(429)로 일정 시간 차단. 화면은 shake만 표현하나 보안상 필수. `retryAfter` 초 반환.
- **[가정] PIN 변경 시 현재 PIN 필요**: 기존 PIN이 설정된 상태에서 변경은 `currentPin` 검증 선행. 최초 설정 시 `currentPin` 생략.
- **[가정] 생체인증 서버 미검증**: 위 기능 목록 주석 참조. 별도 API 없음.
- **[가정] 계정 탈퇴 = 요청 접수(비동기)**: 안전 규칙상 즉시 영구 삭제를 API가 수행하지 않는다. 요청을 PENDING으로 기록하고 유예 후 파기하는 흐름. 화면 문구 "영구적으로 삭제…취소할 수 없습니다"는 최종 결과 안내이며, 접수 단계는 되돌릴 여지를 둔다.
- **[가정] vaulted 공유 정책**: secret_item_detail의 "안전하게 공유"는 item.ITEM-13을 호출하되, item 계약 비고("vaulted Item은 공유 불가")와 **상충**한다. 아래 [상충] 참조.

### [상충]
- **[상충] vaulted 아이템 공유 가능 여부**:
  - item 계약 ITEM-13 비고: "vaulted Item은 공유 불가(보안). 포함 시 400."
  - vault 화면 secret_item_detail_my_003_2: 하단에 "안전하게 공유"(share) 버튼이 **주요 액션(primary)**으로 존재, my_003에도 상단 share 아이콘 존재.
  - 두 해석 병기: (A) 화면 우선 → vaulted도 볼트 세션 해제 후 공유 허용(만료형 안전 링크). (B) item 계약 우선 → 공유 차단.
  - **채택**: 화면 근거가 강하므로 **(A) 조건부 허용** — 단, 볼트 세션이 활성일 때만. 이 결정은 item 계약 ITEM-13 비고와 충돌하므로 **item 계약 수정 필요**(backend-dev/frontend-dev 통지 대상). vault.md 계약 VAULT-04 비고에 링크. 미해결 시 기본 차단(B)로 폴백.
- **[상충] 자동 삭제/아카이브 기간 표기**:
  - secret_item_detail_my_003_2: "90일 후 자동 삭제 설정됨 … 1월에 아카이브로 이동".
  - secret_item_detail_my_003: 별도 만료 경고 없음.
  - 이 자동 삭제/아카이브 정책은 **cleanup 모듈 소관**(expiryDate/expiringSoon는 item 표준 표현에 이미 존재). vault는 표시만 하며 정책 API를 소유하지 않음. 상세 화면은 item.ITEM-04의 `expiryDate`를 그대로 렌더링. 모순 아님 — 아이템별 설정 차이일 뿐이나, 90일/아카이브 문구의 출처(설정 화면)가 vault 범위에 없어 `[상충 관찰]`로 기록.
