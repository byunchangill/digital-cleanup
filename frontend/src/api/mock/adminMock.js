/**
 * admin 모듈 mock 응답. 백엔드(ADM-01~06) 병렬 개발 구간 시연용.
 * 반환 형태는 client.js 인터셉터가 봉투를 해제한 뒤의 `data` 와 동일.
 * 활성화: VITE_USE_MOCK=true. 계약: _workspace/contracts/admin.md.
 */
const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

const GB = 1073741824;
const QUOTA = 50 * GB; // 53687091200 (계약 storageQuotaBytes 상수)
const now = Date.now();
const iso = (msAgo) => new Date(now - msAgo).toISOString();

// ADM-01
export async function mockDashboard() {
  await delay();
  return {
    totalUsers: 24892,
    totalUsersDeltaPercent: 12.5,
    savedToday: 842,
    totalItems: 1452091,
    aiSuccessRate: 99.4,
    aiAvgResponseMs: 1200,
    aiStatus: 'STABLE',
    activeSessions: 1204,
    unresolvedCs: 42,
    urgentCs: 5,
    serverStatus: 'NORMAL',
    uptimePercent: 99.98,
    recentSubscribers: [
      { id: 101, displayName: '정다은', email: 'daeun.j@email.com', plan: 'PREMIUM', status: 'ACTIVE', joinedAt: iso(2 * 60000) },
      { id: 102, displayName: 'Min-su Kim', email: 'minsu.kim@email.com', plan: 'FREE', status: 'ACTIVE', joinedAt: iso(15 * 60000) },
      { id: 103, displayName: 'Lee Chae-won', email: 'chaewon.lee@email.com', plan: 'BASIC', status: 'PENDING', joinedAt: iso(60 * 60000) },
      { id: 104, displayName: 'Kevin Wong', email: 'kevin.wong@email.com', plan: 'PREMIUM', status: 'ACTIVE', joinedAt: iso(3 * 3600000) },
    ],
    recentInquiries: [
      { id: 29384, subject: '결제 오류 신고', type: 'PAYMENT_ERROR', urgency: 'URGENT' },
      { id: 29381, subject: '기능 제안: 폴더 공유', type: 'FEATURE_REQUEST', urgency: 'NORMAL' },
    ],
  };
}

const ALL_USERS = [
  { id: 1, displayName: '김철수', email: 'chulsoo.kim@email.com', joinedAt: '2023-11-15T00:00:00Z', used: 42.5 * GB, plan: 'PREMIUM', status: 'ACTIVE' },
  { id: 2, displayName: '이영희', email: 'younghee.lee@provider.net', joinedAt: '2023-12-02T00:00:00Z', used: 12.8 * GB, plan: 'BASIC', status: 'ACTIVE' },
  { id: 3, displayName: '박지민', email: 'jimin.park@works.com', joinedAt: '2024-01-10T00:00:00Z', used: 48.9 * GB, plan: 'FREE', status: 'DORMANT' },
  { id: 4, displayName: '최서연', email: 'seoyeon.choi@campus.edu', joinedAt: '2024-02-22T00:00:00Z', used: 5.2 * GB, plan: 'FREE', status: 'ACTIVE' },
];

function toUserRow(u) {
  const storagePercent = Math.round((u.used / QUOTA) * 1000) / 10;
  return {
    id: u.id,
    displayName: u.displayName,
    email: u.email,
    joinedAt: u.joinedAt,
    storageUsedBytes: Math.round(u.used),
    storageQuotaBytes: QUOTA,
    storagePercent,
    plan: u.plan,
    status: u.status,
  };
}

function filterUsers({ q, status, plan }) {
  return ALL_USERS.filter((u) => {
    if (q && !(`${u.displayName}${u.email}`.toLowerCase().includes(q.toLowerCase()))) return false;
    if (status && u.status !== status) return false;
    if (plan && u.plan !== plan) return false;
    return true;
  });
}

// ADM-02
export async function mockUsers({ q, status, plan, page = 0, size = 10 } = {}) {
  await delay();
  const filtered = filterUsers({ q, status, plan });
  const start = page * size;
  const items = filtered.slice(start, start + size).map(toUserRow);
  // 화면 재현: 전체 건수는 데모 상수(24,592)로 표기하되 필터 시 실제 건수 반영
  const totalElements = q || status || plan ? filtered.length : 24592;
  return {
    items,
    page,
    size,
    totalElements,
    totalPages: Math.max(1, Math.ceil(totalElements / size)),
    hasNext: start + size < totalElements,
  };
}

// ADM-03 (CSV 문자열 — adminApi가 Blob 다운로드 처리)
export async function mockUsersCsv(params = {}) {
  await delay();
  const header = 'id,displayName,email,joinedAt,storageUsedBytes,storageQuotaBytes,storagePercent,plan,status';
  const rows = filterUsers(params).map(toUserRow)
    .map((u) => [u.id, u.displayName, u.email, u.joinedAt, u.storageUsedBytes, u.storageQuotaBytes, u.storagePercent, u.plan, u.status].join(','));
  return [header, ...rows].join('\n');
}

// ADM-04
export async function mockCsTickets({ page = 0, size = 20 } = {}) {
  await delay();
  const items = [
    { id: 29384, subject: '결제 오류 신고', type: 'PAYMENT_ERROR', urgency: 'URGENT', status: 'OPEN', createdAt: iso(30 * 60000) },
    { id: 29381, subject: '기능 제안: 폴더 공유', type: 'FEATURE_REQUEST', urgency: 'NORMAL', status: 'OPEN', createdAt: iso(3 * 3600000) },
  ];
  return { items, page, size, totalElements: 42, totalPages: 3, hasNext: page < 2 };
}

// ADM-05
export async function mockQuality({ range = '30D' } = {}) {
  await delay();
  const points = range === '90D' ? 12 : 6;
  const trend = Array.from({ length: points }, (_, i) => ({
    date: new Date(now - (points - 1 - i) * 5 * 86400000).toISOString().slice(0, 10),
    accuracy: Math.round((88 + Math.sin(i) * 4 + i * 0.8) * 10) / 10,
  }));
  return {
    avgAccuracy: 94.2,
    deltaPercent: 2.4,
    trend,
    clusters: [
      { categoryA: 'Shopping', categoryB: 'Receipts', biasLevel: 'HIGH', correctionRate: 42, eventCount: 1200 },
      { categoryA: 'Memes', categoryB: 'Screenshots', biasLevel: 'MEDIUM', correctionRate: 28, eventCount: 840 },
      { categoryA: 'Travel', categoryB: 'Business', biasLevel: 'LOW', correctionRate: 12, eventCount: 310 },
    ],
    suggestion: {
      title: 'Increase sampling rate for OCR-heavy documents.',
      detail: 'Most "Receipts" are failing because of low-confidence text detection in vertical layouts.',
    },
  };
}

// ADM-06
export async function mockValidationPack() {
  await delay(700);
  return { runId: `mock-${Date.now()}`, status: 'QUEUED', message: '검증 팩 실행이 접수되었습니다.' };
}
