/**
 * 로그인 사용자의 role 저장/조회. admin 라우트 가드(AdminGuard)와 authApi가 공용.
 * 토큰 저장(client.js TOKEN_KEYS)과 동일하게 localStorage 사용.
 * 백엔드 UserResponse.role이 아직 없으면 setRole(undefined) → 미저장 → isAdmin()=false(기본 차단).
 */
export const ROLE_KEY = 'sortmate.role';

export const getRole = () => localStorage.getItem(ROLE_KEY);
export const setRole = (role) => {
  if (role) localStorage.setItem(ROLE_KEY, role);
};
export const clearRole = () => localStorage.removeItem(ROLE_KEY);
export const isAdmin = () => getRole() === 'ADMIN';
