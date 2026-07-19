/**
 * 소셜 로그인 OAuth 인가 코드 플로우 (카카오/구글).
 * - client_id는 환경변수(VITE_KAKAO_CLIENT_ID / VITE_GOOGLE_CLIENT_ID). 비어있으면 stub 유지(hasOAuthConfig=false).
 * - CSRF 방지 state는 sessionStorage에 저장 후 콜백에서 검증(consumeState).
 * 백엔드 계약(AUTH-01)은 그대로: POST /api/auth/social/{provider} { authorizationCode, redirectUri }.
 */
const CONFIG = {
  kakao: {
    clientId: import.meta.env.VITE_KAKAO_CLIENT_ID,
    authorizeUrl: 'https://kauth.kakao.com/oauth/authorize',
    extra: {},
  },
  google: {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    extra: { scope: 'openid email profile' },
  },
};

const stateKey = (provider) => `sortmate.oauth.state.${provider}`;

export function redirectUriFor(provider) {
  return `${window.location.origin}/auth/callback/${provider}`;
}

export function hasOAuthConfig(provider) {
  return !!CONFIG[provider]?.clientId;
}

/** provider 인가 URL로 리다이렉트(현재 페이지 이탈). */
export function beginOAuth(provider) {
  const cfg = CONFIG[provider];
  const state = crypto.randomUUID();
  sessionStorage.setItem(stateKey(provider), state);
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUriFor(provider),
    response_type: 'code',
    state,
    ...cfg.extra,
  });
  window.location.assign(`${cfg.authorizeUrl}?${params.toString()}`);
}

/** 콜백에서 받은 state 검증(1회성). 저장값과 일치해야 true. */
export function consumeState(provider, received) {
  const saved = sessionStorage.getItem(stateKey(provider));
  sessionStorage.removeItem(stateKey(provider));
  return !!saved && saved === received;
}
