/**
 * auth 모듈 mock 응답.
 * 백엔드 병렬 개발 중이라 미완성 엔드포인트를 로컬에서 시연하기 위한 용도.
 * 반환 형태는 client.js 인터셉터가 봉투를 해제한 뒤의 `data` 와 동일하게 맞춘다.
 * 활성화: 환경변수 VITE_USE_MOCK=true  (기본 false → 실제 /api 호출)
 */
const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

export async function mockSocialLogin(provider) {
  await delay();
  return {
    auth: {
      accessToken: 'mock.jwt.access',
      refreshToken: 'mock.refresh',
      tokenType: 'Bearer',
      expiresIn: 1800,
    },
    user: {
      id: 1,
      email: 'demo@sortmate.app',
      displayName: 'Sortmate 사용자',
      provider: provider.toUpperCase(),
      isNewUser: false,
    },
  };
}

export async function mockEmailLogin({ email }) {
  await delay();
  return {
    auth: {
      accessToken: 'mock.jwt.access',
      refreshToken: 'mock.refresh',
      tokenType: 'Bearer',
      expiresIn: 1800,
    },
    user: { id: 1, email, displayName: 'Sortmate 사용자', provider: 'EMAIL' },
  };
}

export async function mockSignup({ email }) {
  await delay();
  return {
    auth: {
      accessToken: 'mock.jwt.access',
      refreshToken: 'mock.refresh',
      tokenType: 'Bearer',
      expiresIn: 1800,
    },
    user: { id: 1, email, displayName: email.split('@')[0], provider: 'EMAIL', isNewUser: true },
  };
}

export async function mockRefreshToken() {
  await delay(300);
  return {
    accessToken: 'mock.jwt.access.renewed',
    refreshToken: 'mock.refresh.renewed',
    tokenType: 'Bearer',
    expiresIn: 1800,
  };
}

export async function mockPasswordResetRequest() {
  await delay();
  return { message: '재설정 링크가 발송되었습니다. 편지함을 확인해 주세요.' };
}

export async function mockPasswordReset() {
  await delay();
  return { message: '비밀번호가 성공적으로 업데이트되었습니다.', nextRoute: '/login' };
}

export async function mockRecoveryEmail() {
  await delay();
  return { message: '이메일로 복구 링크를 보냈습니다.' };
}

export async function mockRecoveryCode() {
  await delay();
  return { recoveryToken: 'mock.recovery.token', expiresIn: 600, nextRoute: '/password/new' };
}
