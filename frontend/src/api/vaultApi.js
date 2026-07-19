import client from './client';
import { setVaultToken } from './vaultToken';
import * as mock from './mock/vaultMock';

/**
 * vault 모듈 API 함수. 경로/필드는 _workspace/contracts/vault.md와 글자 단위로 일치.
 * VITE_USE_MOCK=true 이면 api/mock/vaultMock.js 로 분기.
 * 인터셉터가 공통 봉투를 해제하므로 반환값은 계약의 `data` 오브젝트다.
 * X-Vault-Token 헤더는 client.js 인터셉터가 vaultToken 저장소에서 자동 동봉한다.
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// VAULT-01: POST /api/vault/pin  (최초 설정 시 currentPin 생략)
export async function setPin({ newPin, currentPin, biometricEnabled } = {}) {
  return USE_MOCK
    ? mock.mockSetPin({ newPin, currentPin, biometricEnabled })
    : client.post('/vault/pin', { newPin, currentPin, biometricEnabled });
}

// VAULT-02: GET /api/vault/status
export async function getStatus() {
  return USE_MOCK ? mock.mockGetStatus() : client.get('/vault/status');
}

// VAULT-03: POST /api/vault/unlock  → 성공 시 vaultToken 저장(TTL)
export async function unlock(pin) {
  const data = USE_MOCK ? await mock.mockUnlock(pin) : await client.post('/vault/unlock', { pin });
  if (data?.vaultToken) setVaultToken(data.vaultToken, data.expiresIn);
  return data;
}

// VAULT-04: GET /api/vault/items/{id}  (X-Vault-Token 필수 — 인터셉터가 동봉)
export async function getVaultItem(id) {
  return USE_MOCK ? mock.mockGetVaultItem(id) : client.get(`/vault/items/${id}`);
}

// VAULT-05: GET /api/vault/privacy
export async function getPrivacy() {
  return USE_MOCK ? mock.mockGetPrivacy() : client.get('/vault/privacy');
}

// VAULT-06: PATCH /api/vault/privacy  (전달된 필드만 변경)
export async function updatePrivacy(patch) {
  return USE_MOCK ? mock.mockUpdatePrivacy(patch) : client.patch('/vault/privacy', patch);
}

// VAULT-07: POST /api/vault/account/deletion-request
export async function requestAccountDeletion() {
  return USE_MOCK
    ? mock.mockRequestAccountDeletion()
    : client.post('/vault/account/deletion-request', { confirm: true });
}
