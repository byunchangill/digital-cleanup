/**
 * 볼트 세션 단기 토큰 저장소 (메모리 보관).
 * 계약: VAULT-03 성공 시 vaultToken(기본 TTL 300초) 발급 → 이후 vault/공유 요청에 X-Vault-Token 동봉.
 * [가정] 메모리 보관 채택: TTL이 짧고 민감하므로 새로고침 시 자연 소멸(보안 유리). sessionStorage 미사용.
 * client.js 요청 인터셉터와 vaultApi가 공유. (import 무의존 → 순환 참조 방지)
 */
let token = null;
let expiresAt = 0;

export function setVaultToken(t, expiresInSec = 300) {
  token = t;
  expiresAt = Date.now() + (Number(expiresInSec) || 300) * 1000;
}

export function getVaultToken() {
  if (token && Date.now() < expiresAt) return token;
  token = null;
  expiresAt = 0;
  return null;
}

export function clearVaultToken() {
  token = null;
  expiresAt = 0;
}

export function vaultUnlocked() {
  return getVaultToken() !== null;
}
