/**
 * vault 모듈 mock 응답. 백엔드 병렬 개발 중 로컬 시연용.
 * 반환 형태는 client.js 인터셉터가 봉투를 해제한 뒤의 `data`(계약 스키마)와 동일.
 * 활성화: VITE_USE_MOCK=true (기본 false → 실제 /api 호출)
 * 볼트 세션(vaultToken)은 실제 저장소(vaultToken.js)를 그대로 사용하므로,
 * mock에서도 잠금/해제 흐름을 그대로 재현한다.
 */
import { ApiError } from '../client';
import { vaultUnlocked } from '../vaultToken';

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

const DEMO_PIN = '123456'; // mock 정답 PIN

// mock 상태 (모듈 수명 동안 유지)
let state = {
  pinSet: true,
  appLockEnabled: true,
  biometricEnabled: false,
  lockedOut: false,
};
let privacy = {
  aiTrainingConsent: true,
  usageStatsSharing: false,
  personalizedSuggestions: true,
};

const IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDLbHIB-_dPwyHYTdLkJunQJ5_ydVqyOf3kEWo8Dt3XshJsCyFG_-C3h_aFxqGOxd7z5UmlYnTNNs1GJAAHRJxYpMLa9L15pyYjt7fbU8l-weUZMted4mfkdE_7hSHRLlA807WyjroHn5fQoDR0iK9mezI8OTe9A-Zjnly8GgM3V_18k7WdgFH8gYnFWhUGt02Z3DiFY1sF-bLtgUTYJnXrmEbELRgftFoJkHULEJU_3oNwFOVc1ZTonJjbrnJeaECgAF35c89h3iU';

const VAULT_ITEMS = {
  5: {
    id: 5,
    type: 'DOCUMENT',
    title: '2023년 세무 기록',
    subtitle: null,
    category: '금고',
    vaulted: true,
    thumbnailUrl: IMG,
    fileUrl: IMG,
    aiSummary: '이 문서는 2023년 세무 신고 기록으로 분류되었습니다. 민감한 금융 정보가 포함되어 비밀 보관함에 저장되어 있습니다.',
    tags: ['금융', '2023', '명세서', '중요도높음'],
    sourceApp: '스캐너 앱',
    mimeType: 'application/pdf',
    fileSize: 2516582,
    resolution: null,
    verified: true,
    expiryDate: '2026-10-17',
    savedAt: '2026-07-10T09:00:00Z',
  },
  9: {
    id: 9,
    type: 'DOCUMENT',
    title: '여권 스캔',
    subtitle: null,
    category: '금고',
    vaulted: true,
    thumbnailUrl: IMG,
    fileUrl: IMG,
    aiSummary: '이 문서는 신분 확인용 여권 스캔본입니다. 개인 식별 정보가 포함되어 비밀 보관함으로 분류되었습니다.',
    tags: ['신분증', '여행', '중요도높음'],
    sourceApp: '스캐너 앱',
    mimeType: 'application/pdf',
    fileSize: 4404019,
    resolution: null,
    verified: true,
    expiryDate: null,
    savedAt: '2026-07-11T09:00:00Z',
  },
  100: {
    id: 100,
    type: 'IMAGE',
    title: '사원증',
    subtitle: '높은 중요도의 신분 확인 증명서',
    category: '금고',
    vaulted: true,
    thumbnailUrl: IMG,
    fileUrl: IMG,
    aiSummary:
      '이 문서는 기업용 신분증으로 보입니다. Sortmate가 사번(8832-X)과 만료일(2026년 12월)을 추출했습니다. 민감한 개인 정보가 포함되어 현재 비밀 보관함으로 분류되어 있습니다.',
    tags: ['신분증', '회사', '중요도높음'],
    sourceApp: '스캐너 앱',
    mimeType: 'image/jpeg',
    fileSize: 4404019,
    resolution: '3264 × 2448',
    verified: false,
    expiryDate: null,
    savedAt: '2026-07-19T07:00:00Z',
  },
};

export async function mockSetPin({ newPin }) {
  await delay();
  state.pinSet = true;
  return { pinSet: true, biometricEnabled: state.biometricEnabled, pinSetAt: new Date().toISOString() };
}

export async function mockGetStatus() {
  await delay(150);
  return {
    pinSet: state.pinSet,
    appLockEnabled: state.appLockEnabled,
    biometricEnabled: state.biometricEnabled,
    unlocked: vaultUnlocked(),
    lockedOut: state.lockedOut,
    retryAfter: null,
  };
}

export async function mockUnlock(pin) {
  await delay();
  if (!/^\d{6}$/.test(String(pin || ''))) {
    throw new ApiError('VALIDATION_ERROR', 'PIN은 6자리 숫자여야 합니다.', 400);
  }
  if (pin !== DEMO_PIN) {
    throw new ApiError('PIN_INVALID', 'PIN이 일치하지 않습니다. (데모 PIN: 123456)', 401);
  }
  return { vaultToken: `mock-vault-${Date.now()}`, tokenType: 'Vault', expiresIn: 300 };
}

export async function mockGetVaultItem(id) {
  await delay();
  if (!vaultUnlocked()) {
    throw new ApiError('VAULT_LOCKED', '볼트가 잠겨 있습니다. 먼저 잠금을 해제하세요.', 403);
  }
  const item = VAULT_ITEMS[Number(id)];
  if (!item) throw new ApiError('ITEM_NOT_FOUND', '아이템을 찾을 수 없습니다.', 404);
  return { item };
}

export async function mockGetPrivacy() {
  await delay(150);
  return { ...privacy };
}

export async function mockUpdatePrivacy(patch = {}) {
  await delay(150);
  privacy = { ...privacy, ...patch };
  return { ...privacy };
}

export async function mockRequestAccountDeletion() {
  await delay();
  return {
    status: 'PENDING',
    requestedAt: new Date().toISOString(),
    scheduledPurgeAt: null,
  };
}
