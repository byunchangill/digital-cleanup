import client, { TOKEN_KEYS } from './client';
import * as mock from './mock/authMock';

/**
 * auth 모듈 API 함수. 경로/필드는 _workspace/contracts/auth.md와 글자 단위로 일치.
 * VITE_USE_MOCK=true 이면 api/mock/authMock.js 로 분기(백엔드 미완성 구간 시연용).
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

/** 로그인 성공 시 토큰 저장 (auth.accessToken/refreshToken) */
export function persistAuth(auth) {
  if (!auth) return;
  if (auth.accessToken) localStorage.setItem(TOKEN_KEYS.access, auth.accessToken);
  if (auth.refreshToken) localStorage.setItem(TOKEN_KEYS.refresh, auth.refreshToken);
}

// AUTH-01: POST /api/auth/social/{provider}  provider = kakao | google | apple
export async function socialLogin(provider, { authorizationCode, redirectUri } = {}) {
  const data = USE_MOCK
    ? await mock.mockSocialLogin(provider)
    : await client.post(`/auth/social/${provider}`, { authorizationCode, redirectUri });
  persistAuth(data.auth);
  return data;
}

// AUTH-02: POST /api/auth/login
export async function login({ email, password }) {
  const data = USE_MOCK
    ? await mock.mockEmailLogin({ email, password })
    : await client.post('/auth/login', { email, password });
  persistAuth(data.auth);
  return data;
}

// AUTH-08: POST /api/auth/signup  (성공 시 자동 로그인 — AUTH-02와 동일 토큰 봉투)
export async function signup({ email, password, agreedToTerms }) {
  const data = USE_MOCK
    ? await mock.mockSignup({ email })
    : await client.post('/auth/signup', { email, password, agreedToTerms });
  persistAuth(data.auth);
  return data;
}

// AUTH-03: POST /api/auth/token/refresh
export async function refreshToken(refresh) {
  const data = USE_MOCK
    ? await mock.mockRefreshToken()
    : await client.post('/auth/token/refresh', { refreshToken: refresh });
  if (data.accessToken) localStorage.setItem(TOKEN_KEYS.access, data.accessToken);
  if (data.refreshToken) localStorage.setItem(TOKEN_KEYS.refresh, data.refreshToken);
  return data;
}

// AUTH-04: POST /api/auth/password/reset-request
export async function requestPasswordReset({ email }) {
  return USE_MOCK
    ? mock.mockPasswordResetRequest()
    : client.post('/auth/password/reset-request', { email });
}

// AUTH-05: POST /api/auth/password/reset
export async function resetPassword({ token, newPassword, confirmPassword }) {
  return USE_MOCK
    ? mock.mockPasswordReset()
    : client.post('/auth/password/reset', { token, newPassword, confirmPassword });
}

// AUTH-06: POST /api/auth/recovery/email
export async function recoverByEmail({ email }) {
  return USE_MOCK ? mock.mockRecoveryEmail() : client.post('/auth/recovery/email', { email });
}

// AUTH-07: POST /api/auth/recovery/code
export async function verifyRecoveryCode({ email, recoveryCode }) {
  return USE_MOCK
    ? mock.mockRecoveryCode()
    : client.post('/auth/recovery/code', { email, recoveryCode });
}
