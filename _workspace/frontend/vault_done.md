# vault 모듈 프론트엔드 구현 완료 보고

> 작성: frontend-dev · 2026-07-19 · 대상: app_lock_pin_entry_com_006, secret_item_detail_my_003(+_2), privacy_controls_my_002

## 빌드 결과
`cd frontend && npm run build` → 통과 (122 modules, built in 1.89s). 에러 없음.

## 구현 화면 / 라우트
| 화면 | 라우트 | 파일 |
|---|---|---|
| 앱/볼트 잠금 PIN 입력 | `/vault/unlock` | src/pages/vault/PinEntryPage.jsx |
| 시크릿 아이템 상세 (이미지형+문서형 통합) | `/vault/items/:id` | src/pages/vault/SecretItemDetailPage.jsx |
| 개인정보 제어(프라이버시) | `/my/privacy` | src/pages/vault/PrivacyControlsPage.jsx |

- 시크릿 상세는 계약대로 단일 라우트/컴포넌트로 통합. `item.type`(IMAGE/SCREENSHOT vs 그 외)에 따라 해상도/subtitle 노출 분기.
- 프라이버시 라우트는 spec의 제안값 `/my/privacy` 채택(BottomNav의 "마이" 탭과 정합). 계약에 별도 라우트 지정 없음.

## API 레이어
- `src/api/vaultApi.js` — VAULT-01~07 전부. 경로/필드 계약과 글자 단위 일치.
- `src/api/mock/vaultMock.js` — 동일 스키마 mock. 데모 PIN `123456`.
- `src/api/vaultToken.js` — vaultToken 저장소.

### vaultToken 보관/만료 (계약 [가정] 반영)
- **메모리 보관** 채택 (sessionStorage 아님). 계약 지침 "메모리 or sessionStorage" 중 메모리 선택 근거: TTL 300초로 짧고 민감 → 새로고침 시 자연 소멸이 보안상 유리.
- `setVaultToken(token, expiresIn)` 시 만료 시각 기록, `getVaultToken()`이 만료 검사 후 무효면 null 반환.
- **X-Vault-Token 동봉은 client.js 요청 인터셉터가 자동 처리** — 유효 토큰 존재 시 모든 요청에 헤더 첨부. VAULT-04 열람과 ITEM-13 vaulted 공유가 별도 코드 없이 함께 커버됨.
- 응답 인터셉터: `403 VAULT_LOCKED` 수신 시 로컬 토큰 폐기(재잠금 유도).

## vaulted 진입 흐름 연결
- **단일 초크포인트 = ItemDetailPage** (`src/pages/item/ItemDetailPage.jsx`): 모든 상세가 `/items/:id`로 진입하므로 여기서 `item.vaulted === true`이면 `/vault/items/:id`로 `replace` 리다이렉트. 라이브러리/즐겨찾기 목록의 vaulted 아이템 탭이 전부 이 경로를 탄다.
- SecretItemDetailPage: 볼트 세션 없으면 블러 잠김 오버레이 → "탭하여 잠금 해제" → `/vault/unlock?next=/vault/items/:id`. 해제 성공 시 next로 복귀하여 VAULT-04 열람.
- "일반 보관함으로 이동" = ITEM-12 `toggleVault(id,false)` (볼트 세션 활성 상태에서 호출) → 성공 후 `/items/:id` 복귀.
- "안전하게 공유" = ITEM-13 `shareItems([id])` (X-Vault-Token 자동 동봉).

## mock 사용 위치 (실서비스 전 제거 대상)
- `src/api/mock/vaultMock.js` 전체 — VAULT-01~07 mock.
- 활성 조건: `VITE_USE_MOCK=true` (기본 false → 실제 `/api` 호출). 기본값에서는 mock 미사용.
- mock의 VAULT_ITEMS는 id 5, 9, 100 세 건만 존재(itemMock의 vaulted 아이템 id 5, 9와 정합 + 이미지형 데모용 100). 그 외 id는 `ITEM_NOT_FOUND`.

## [가정] 목록
- **[가정] PIN 미설정 처리**: VAULT-02 `pinSet=false`면 최초 6자리 입력을 VAULT-01 설정으로 처리 후 곧바로 VAULT-03 해제. 화면에 별도 "확인 재입력" UI가 없어 단일 입력으로 설정. (헤더 문구는 pinSet 여부로 "보안 잠금"/"PIN 설정" 분기)
- **[가정] Face ID**: 서버 API 없음(계약 확정). 웹 데모에서 버튼은 안내 토스트만 표시, 실제 해제는 PIN 입력. UI만 유지.
- **[가정] 자동 삭제/아카이브 문구**: `expiryDate` 기반 클라이언트 계산으로 "N일 후 자동 삭제 / 아카이브 이동" 표시. expiryDate=null이면 미표시(my_003 이미지형은 경고 없음, my_003_2 문서형은 표시 — 데이터 차이로 자연 분기). 정책은 cleanup 소관.
- **[가정] 계정 탈퇴 2단계 확인**: 버튼 1탭 시 "한 번 더 탭" 확인 문구로 전환, 2탭에서 VAULT-07 `{confirm:true}` 전송. 계약의 confirm 절차 통과 표식 충족.

## 계약과 달라진 점 / 미해결
- **없음(스키마 차원)**: 모든 필드/경로는 vault.md 계약 그대로. 임의 필드 추가 없음.
- **[상충 관찰] vaulted 공유**: 화면·vault 계약은 "볼트 세션 활성 시 조건부 허용"(채택안 A). 프론트는 X-Vault-Token 동봉하여 ITEM-13 호출하도록 구현. **단, item 계약 ITEM-13 비고("vaulted 공유 불가 400")가 아직 갱신되지 않았다면 백엔드가 400/VAULT_LOCKED로 거부할 수 있음** — 이 경우 공유 버튼이 실패 토스트를 띄운다. backend-dev/spec-analyst의 item.ITEM-13 비고 갱신 필요(vault.md 계약 하단 명시). 미합의 시 기본 차단으로 자연 폴백됨(프론트 추가 조치 불필요).
- **공통 컴포넌트 재사용**: client.js/itemApi/BottomNav/Toast/useToast/formatBytes 전부 재사용. 신규 공통 컴포넌트 없음(PIN 키패드는 단일 화면 전용이라 PinEntryPage 내부 유지).
