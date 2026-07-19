/**
 * my 모듈 mock 응답 (MY-01~10). 백엔드 병렬 개발 중 로컬 시연용.
 * 반환 형태는 client.js 인터셉터가 봉투를 해제한 뒤의 `data`(contracts/my.md 스키마)와 동일.
 * 활성화: VITE_USE_MOCK=true.
 * 용량은 계약대로 bytes(number). 계정 삭제(VAULT-07)/대용량 삭제(ITEM-09)는 각 모듈 mock 재사용.
 */
import { ApiError } from '../client';

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));
const GB = 1073741824;
const MB = 1048576;
const now = () => Date.now();
const iso = (ms) => new Date(ms).toISOString();

// ── MY-01/02: 알림 인박스 ──────────────────────────────
let NOTIFICATIONS = [
  {
    id: 1, category: 'AI_ANALYSIS', type: 'AI_COMPLETE',
    title: '5개 항목에 대한 AI 분석 완료',
    body: '최근 동기화된 자료에서 주요 영수증과 스크린샷을 식별했습니다. 정리할 준비가 되었습니다.',
    actionRoute: null, actionLabel: null, read: false,
    createdAt: iso(now() - 2 * 3600 * 1000),
  },
  {
    id: 2, category: 'AI_ANALYSIS', type: 'DUPLICATE_FOUND',
    title: '12개의 중복 자료 발견 - 지금 정리하기',
    body: '"업무" 폴더에서 여러 개의 유사한 스크린샷을 찾았습니다. 12.4 MB의 공간을 확보하세요.',
    actionRoute: '/cleanup/duplicates', actionLabel: '중복 자료 검토', read: false,
    createdAt: iso(now() - 5 * 3600 * 1000),
  },
  {
    id: 3, category: 'BENEFIT', type: 'COUPON_EXPIRING',
    title: '쿠폰 "스타벅스" 만료 3일 전',
    body: '혜택을 놓치지 마세요. 탭하여 바코드와 상세 내용을 확인하세요.',
    actionRoute: '/library?expiringSoon=true', actionLabel: null, read: false,
    createdAt: iso(now() - 3 * 24 * 3600 * 1000),
  },
  {
    id: 4, category: 'SYSTEM', type: 'VAULT_BACKUP',
    title: '비밀 금고 백업 완료',
    body: '암호화된 항목들이 보안 클라우드에 성공적으로 백업되었습니다.',
    actionRoute: null, actionLabel: null, read: true,
    createdAt: iso(now() - 6 * 24 * 3600 * 1000),
  },
];

const unread = () => NOTIFICATIONS.filter((n) => !n.read).length;

export async function mockListNotifications({ category, page = 0, size = 20 } = {}) {
  await delay();
  const filtered = category ? NOTIFICATIONS.filter((n) => n.category === category) : NOTIFICATIONS;
  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return {
    notifications: sorted,
    unreadCount: unread(),
    page, size, totalElements: sorted.length, totalPages: 1, hasNext: false,
  };
}

export async function mockReadNotifications({ ids, all } = {}) {
  await delay(200);
  let updated = 0;
  NOTIFICATIONS = NOTIFICATIONS.map((n) => {
    const hit = all ? !n.read : ids?.includes(n.id) && !n.read;
    if (hit) updated += 1;
    return hit ? { ...n, read: true } : n;
  });
  return { updatedCount: updated, unreadCount: unread() };
}

// ── MY-03: 내보내기 옵션 ──────────────────────────────
export async function mockGetExportOptions() {
  await delay();
  return {
    itemCount: 2482,
    estimatedBytes: Math.round(1.4 * GB),
    splitThresholdBytes: 2 * GB,
    dataTypes: [
      { type: 'JSON_METADATA', label: 'JSON 메타데이터', description: 'AI 태그, 소스 URL 및 타임스탬프', defaultSelected: true },
      { type: 'ORIGINAL_FILES', label: '원본 파일', description: '고해상도 스크린샷 및 미디어', defaultSelected: true },
    ],
    destinations: [
      { type: 'DOWNLOAD', label: '직접 다운로드 (.zip)', available: true, defaultSelected: true },
      { type: 'GOOGLE_DRIVE', label: '구글 드라이브', available: false },
      { type: 'EMAIL', label: '이메일로 전송', available: false },
    ],
  };
}

// ── MY-04/05/06: 내보내기 잡 (경과 시간 기반 진행) ────────
let EXPORT_JOB = null;
const EXPORT_TASKS = [
  '메타데이터 수집 중...',
  '보안 금고 키 추출 중...',
  '고화질 미디어 압축 중',
  'JSON 아카이브 구성 중...',
  '보안 패키지 마무리 중...',
];

export async function mockStartExport({ dataTypes, destination } = {}) {
  await delay(300);
  if (!dataTypes?.length) throw new ApiError('VALIDATION_ERROR', '데이터 유형을 1개 이상 선택하세요.', 400);
  if (!['DOWNLOAD', 'GOOGLE_DRIVE', 'EMAIL'].includes(destination)) throw new ApiError('VALIDATION_ERROR', '저장 위치가 올바르지 않습니다.', 400);
  if (destination !== 'DOWNLOAD') throw new ApiError('VALIDATION_ERROR', '해당 저장 위치는 아직 지원하지 않습니다.', 400);
  EXPORT_JOB = {
    exportJobId: 9001,
    dataTypes, destination,
    status: 'PREPARING', progressPercent: 0,
    itemCount: 2482, estimatedBytes: Math.round(1.4 * GB),
    createdAt: iso(now()), startMs: now(), canceled: false,
  };
  return {
    exportJobId: EXPORT_JOB.exportJobId, status: 'PREPARING', progressPercent: 0,
    itemCount: EXPORT_JOB.itemCount, estimatedBytes: EXPORT_JOB.estimatedBytes, createdAt: EXPORT_JOB.createdAt,
  };
}

export async function mockGetExportJob(jobId) {
  await delay(200);
  if (!EXPORT_JOB || EXPORT_JOB.exportJobId !== Number(jobId)) throw new ApiError('EXPORT_JOB_NOT_FOUND', '내보내기 작업을 찾을 수 없습니다.', 404);
  if (EXPORT_JOB.canceled) {
    return exportView('CANCELED', 0, null);
  }
  // 경과 시간 → 진행률(약 15초에 100%). 폴링 3초 간격이면 5~6회에 완료.
  const elapsed = now() - EXPORT_JOB.startMs;
  const pct = Math.min(100, Math.floor((elapsed / 15000) * 100));
  const status = pct >= 100 ? 'DONE' : pct >= 40 ? 'COMPRESSING' : 'PREPARING';
  const taskIdx = Math.min(EXPORT_TASKS.length - 1, Math.floor(pct / 20));
  return exportView(status, pct, EXPORT_TASKS[taskIdx]);
}

function exportView(status, pct, task) {
  const done = status === 'DONE';
  return {
    exportJobId: EXPORT_JOB.exportJobId,
    status,
    progressPercent: pct,
    currentTask: done ? '완료됨' : task,
    itemCount: EXPORT_JOB.itemCount,
    estimatedBytes: EXPORT_JOB.estimatedBytes,
    resultBytes: done ? Math.round(1.38 * GB) : null,
    downloadUrl: done && EXPORT_JOB.destination === 'DOWNLOAD' ? 'blob:mock-export-9001' : null,
    encrypted: true,
    createdAt: EXPORT_JOB.createdAt,
    completedAt: done ? iso(now()) : null,
    error: status === 'FAILED' ? '알 수 없는 오류' : null,
  };
}

export async function mockCancelExport(jobId) {
  await delay(200);
  if (!EXPORT_JOB || EXPORT_JOB.exportJobId !== Number(jobId)) throw new ApiError('EXPORT_JOB_NOT_FOUND', '내보내기 작업을 찾을 수 없습니다.', 404);
  EXPORT_JOB.canceled = true;
  return { exportJobId: EXPORT_JOB.exportJobId, status: 'CANCELED' };
}

// ── MY-07: 저장공간 상세 ──────────────────────────────
const STORAGE_IMG = {
  video: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDRBK11xRYrTmuyuEW0omqcpLNWodgs8rAKS2qe6Hp_VCRcZ9h5C-VJozQmyr7oVH7hOBYsJe0UFy3KZpVzcs7Z_NWJx3nTSKDcW15tJWi_ZIlGzpddhwc9x1NdLexwcnBS3kE9hFRvFMJgSnftAQ18ip9LP6_luM-ftylWAoKVa23zB6w8whKRjkQ0IH5_qP57dU9AwOAJDtwDJLEoIrUF0SCkBdZcF4Nk2yVvCHSr3vHU48U1-cNmrCajU_g_MtRHPu8QRJ74Ng',
  doc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6y663JCCTnKN7ZibgpDsrYxiEphFYB8lMUxtx-fXiYUcVluKP2qKmUWLKtl_kRyBmpZsz9bV7UbYUENjx3Hl1qkmzQH7_xOyq99acxLrIrsxyffu_1mVVUsLKZ7qswKGsFoWWm4aF05dEc4Q2traTFnsf8zW70XCFqiITUanki-9BgUwqkL-_-oxAPMh22HRkye3MI-Kp2rpQXnTIwU8l8BCUNHwWdVcGg7SfGq5fupHuV6wsrvTi5WY6DpDpGWcfDIdN97Glr3U',
};

// [가정] limitReached 변형을 시연하려면 아래 SCENARIO 를 'FULL' 로 바꾼다(무료 5GB 100%).
const SCENARIO = 'NORMAL'; // 'NORMAL' | 'FULL'

export async function mockGetStorage() {
  await delay();
  if (SCENARIO === 'FULL') {
    return {
      usedBytes: 5 * GB, totalBytes: 5 * GB, usedPercent: 100,
      planName: '무료', limitReached: true, reclaimableBytes: Math.round(1.2 * GB),
      categories: [
        { type: 'SCREENSHOT', label: '스크린샷', bytes: Math.round(2.4 * GB), itemCount: 1240, percent: 48 },
        { type: 'VIDEO', label: '저장된 동영상', bytes: Math.round(1.8 * GB), itemCount: 42, percent: 36 },
        { type: 'DOCUMENT', label: '문서', bytes: Math.round(0.6 * GB), itemCount: 312, percent: 12 },
      ],
      largestItems: [],
      insights: [{ type: 'GROWTH', label: '빠르게 증가 중 (+2GB/주)' }],
    };
  }
  return {
    usedBytes: Math.round(42.8 * GB), totalBytes: 128 * GB, usedPercent: 33,
    planName: '프리미엄', limitReached: false, reclaimableBytes: Math.round(12.4 * GB),
    categories: [
      { type: 'VIDEO', label: '동영상', bytes: Math.round(19.2 * GB), itemCount: 1240, percent: 45 },
      { type: 'SCREENSHOT', label: '스크린샷', bytes: Math.round(10.7 * GB), itemCount: 4802, percent: 25 },
      { type: 'DOCUMENT', label: '문서', bytes: Math.round(6.4 * GB), itemCount: 320, percent: 15 },
      { type: 'LINK', label: '링크', bytes: Math.round(6.4 * GB), itemCount: 890, percent: 15 },
    ],
    largestItems: [
      { itemId: 701, title: 'Iceland_Roadtrip_4K.mp4', type: 'VIDEO', thumbnailUrl: STORAGE_IMG.video, bytes: Math.round(4.2 * GB), modifiedAt: iso(now() - 2 * 24 * 3600 * 1000) },
      { itemId: 702, title: 'Annual_Strategy_2024.pdf', type: 'DOCUMENT', thumbnailUrl: STORAGE_IMG.doc, bytes: Math.round(840 * MB), modifiedAt: iso(now() - 7 * 24 * 3600 * 1000) },
      { itemId: 703, title: 'Workspace_Backup_Feb.zip', type: 'ARCHIVE', thumbnailUrl: null, bytes: Math.round(1.2 * GB), modifiedAt: iso(now() - 21 * 24 * 3600 * 1000) },
    ],
    insights: [
      { type: 'GROWTH', label: '빠르게 증가 중 (+2GB/주)' },
      { type: 'ENCRYPTED', label: '안전하게 암호화됨' },
      { type: 'VAULT_SYNCED', label: '비밀 보관함 동기화됨' },
    ],
  };
}

// ── MY-08/09/10: 플랜 ──────────────────────────────
let CURRENT_PLAN = 'FREE';

export async function mockGetPlans() {
  await delay();
  return {
    currentPlanId: CURRENT_PLAN,
    plans: [
      { id: 'FREE', name: '무료', priceMonthly: 0, currency: 'KRW', storageBytes: 5 * GB, features: ['기본 AI 분류', '5GB 클라우드 저장 공간', '표준 암호화'], badge: null, isCurrent: CURRENT_PLAN === 'FREE' },
      { id: 'PREMIUM', name: '프리미엄', priceMonthly: 9900, currency: 'KRW', storageBytes: 500 * GB, features: ['무제한 AI 분석', '500GB 저장 공간', '고급 보안 프로토콜', '24/7 우선 지원'], badge: '가장 인기 있음', isCurrent: CURRENT_PLAN === 'PREMIUM' },
    ],
  };
}

export async function mockUpgradePlan(planId) {
  await delay(600);
  if (!planId) throw new ApiError('VALIDATION_ERROR', 'planId가 필요합니다.', 400);
  if (planId !== 'PREMIUM') throw new ApiError('PLAN_NOT_FOUND', '존재하지 않는 플랜입니다.', 404);
  if (CURRENT_PLAN === 'PREMIUM') throw new ApiError('PLAN_ALREADY_ACTIVE', '이미 프리미엄 플랜을 사용 중입니다.', 409);
  CURRENT_PLAN = 'PREMIUM'; // 채택안 A: PG 미연동 → 즉시 활성
  return { planId: 'PREMIUM', status: 'ACTIVE', currentPeriodEnd: iso(now() + 30 * 24 * 3600 * 1000), stub: true };
}

export async function mockRestorePurchase() {
  await delay(500);
  return { restored: false, planId: null, stub: true };
}
