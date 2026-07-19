/**
 * item 모듈 mock 응답.
 * 백엔드 병렬 개발 중이라 미완성 엔드포인트를 로컬에서 시연하기 위한 용도.
 * 반환 형태는 client.js 인터셉터가 봉투를 해제한 뒤의 `data`(계약 스키마)와 동일하게 맞춘다.
 * 활성화: 환경변수 VITE_USE_MOCK=true  (기본 false → 실제 /api 호출)
 */
const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

const IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBbV8kahE5Y4OtH62RfeILNrPfL6O34pp1xY0XEkbe8BI1XquiO2_8Tzpw4RtZTVo5CXqXkLiElDJBbpABEvCrthGR6oqJdSzQGK8sjq9Cjy4YXZAHTJilDipNwOB1XLeF992TmFMw7UeFEjKvmC6jZqGo-3QGZtuSuuafhlJJi2W-Vp9701Kd_WhbDh_Ju31K4AoLmymP8TCseBPnseGrLDpCeKkiARBbfuoRoAS3PX7VW_sCRW2pGV-XCM_CnzEFUem7a0u2Kmsw';

/** 계약 Item 표준 표현을 채우는 헬퍼 */
function item(over = {}) {
  return {
    id: 0,
    type: 'IMAGE',
    title: '제목 없음',
    category: null,
    thumbnailUrl: IMG,
    sourceApp: null,
    fileSize: null,
    mimeType: null,
    tags: [],
    aiClassified: false,
    expiryDate: null,
    expiringSoon: false,
    favorite: false,
    vaulted: false,
    savedAt: '2026-07-19T09:00:00Z',
    ...over,
  };
}

const DB = [
  item({ id: 1, type: 'SCREENSHOT', title: '스타벅스 아메리카노 쿠폰', category: '쿠폰', sourceApp: '카카오톡', tags: ['쿠폰', '스타벅스', '음료', '선물'], aiClassified: true, expiryDate: '2026-08-31', expiringSoon: true, favorite: true, savedAt: '2024-05-12T09:00:00Z' }),
  item({ id: 2, type: 'IMAGE', title: '사무실 셋업 영감', category: '디자인', tags: ['디자인'], aiClassified: true, favorite: true, savedAt: '2026-07-19T07:00:00Z' }),
  item({ id: 3, type: 'LINK', title: 'AI 큐레이션의 미래: 2024년 통찰', category: '읽을거리', sourceApp: 'medium.com', tags: ['읽을거리', '테크'], favorite: true, thumbnailUrl: null, savedAt: '2026-07-18T09:00:00Z' }),
  item({ id: 4, type: 'DOCUMENT', title: '계약서_최종_v2.pdf', category: '업무', mimeType: 'application/pdf', fileSize: 2516582, tags: ['업무'], favorite: true, thumbnailUrl: null, savedAt: '2026-07-16T09:00:00Z' }),
  item({ id: 5, type: 'DOCUMENT', title: '2023년 세무 기록', category: '금고', favorite: true, vaulted: true, thumbnailUrl: null, savedAt: '2026-07-10T09:00:00Z' }),
  item({ id: 6, type: 'SCREENSHOT', title: '은행_거래내역_Q3.PNG', category: '금융', tags: ['금융'], savedAt: '2026-07-15T09:00:00Z' }),
  item({ id: 7, type: 'SCREENSHOT', title: '퀴노아_샐러드_레시피.JPG', category: '건강', tags: ['건강'], savedAt: '2026-07-14T09:00:00Z' }),
  item({ id: 8, type: 'SCREENSHOT', title: '주문_확인_0912.JPG', category: '영수증', tags: ['영수증'], savedAt: '2026-07-13T09:00:00Z' }),
  item({ id: 9, type: 'DOCUMENT', title: '여권_스캔.PDF', category: '금고', vaulted: true, thumbnailUrl: null, savedAt: '2026-07-11T09:00:00Z' }),
];

function paginate(rows, { page = 0, size = 20 } = {}) {
  const p = Number(page) || 0;
  const s = Number(size) || 20;
  const start = p * s;
  const slice = rows.slice(start, start + s);
  return {
    items: slice,
    page: p,
    size: s,
    totalElements: rows.length,
    totalPages: Math.max(1, Math.ceil(rows.length / s)),
    hasNext: start + s < rows.length,
  };
}

export async function mockImportPhotos(files, sourceType) {
  await delay();
  const count = files?.length || 0;
  return {
    importedCount: count,
    items: Array.from({ length: count }, (_, i) => ({
      id: 1000 + i,
      type: sourceType === 'SCREENSHOT' ? 'SCREENSHOT' : 'IMAGE',
      title: files[i]?.name || `사진 ${i + 1}`,
      thumbnailUrl: IMG,
      savedAt: new Date().toISOString(),
    })),
  };
}

export async function mockCreateMemo({ title, body, tags, category, vaulted }) {
  await delay();
  return { item: item({ id: 2000, type: 'MEMO', title: title || '제목 없음', body: body || '', tags: tags || [], category: category || null, vaulted: !!vaulted, thumbnailUrl: null }) };
}

export async function mockListItems(params = {}) {
  await delay();
  let rows = DB.filter((it) => (params.vaulted === true || params.vaulted === 'true' ? it.vaulted : true));
  if (params.type) rows = rows.filter((it) => it.type === params.type);
  if (params.category) rows = rows.filter((it) => it.category === params.category);
  if (params.favorite === true || params.favorite === 'true') rows = rows.filter((it) => it.favorite);
  if (params.q) rows = rows.filter((it) => it.title.toLowerCase().includes(String(params.q).toLowerCase()));
  return paginate(rows, params);
}

export async function mockGetItem(id) {
  await delay();
  const found = DB.find((it) => it.id === Number(id)) || DB[0];
  return {
    item: {
      ...found,
      body: found.type === 'MEMO' ? '메모 본문 예시입니다.' : null,
      fileUrl: found.vaulted ? null : IMG,
      aiSummary: found.vaulted ? null : '2026년 8월 31일까지 유효한 아메리카노 쿠폰입니다. 카카오톡 스크린샷에서 발견되었습니다.',
    },
  };
}

export async function mockGetRelated(id, limit = 4) {
  await delay(200);
  const items = DB.filter((it) => it.id !== Number(id))
    .slice(0, limit)
    .map((it) => ({ id: it.id, title: it.title, thumbnailUrl: it.thumbnailUrl, expiryDate: it.expiryDate }));
  return { items };
}

export async function mockUpdateItem(id, patch) {
  await delay();
  const found = DB.find((it) => it.id === Number(id)) || DB[0];
  return { item: { ...found, ...patch } };
}

export async function mockListFavorites(params = {}) {
  return mockListItems({ ...params, favorite: true });
}

export async function mockToggleFavorite(id, favorite) {
  await delay(150);
  return { id: Number(id), favorite: !!favorite };
}

/** 존재하지 않는 id(DB에 없음)는 실패로 분류 — 백엔드의 200+failedIds 동작 시뮬레이션 */
function splitByExistence(ids = []) {
  const ok = ids.filter((id) => DB.some((it) => it.id === Number(id)));
  const failedIds = ids.filter((id) => !DB.some((it) => it.id === Number(id)));
  return { okCount: ok.length, failedIds };
}

export async function mockDeleteItems(ids) {
  await delay();
  const { okCount, failedIds } = splitByExistence(ids);
  return { deletedCount: okCount, failedIds };
}

export async function mockBulkCategory(ids) {
  await delay();
  const { okCount, failedIds } = splitByExistence(ids);
  return { updatedCount: okCount, failedIds };
}

export async function mockBulkTags(ids) {
  await delay();
  const { okCount, failedIds } = splitByExistence(ids);
  return { updatedCount: okCount, failedIds };
}

export async function mockToggleVault(id, vaulted) {
  await delay(150);
  return { id: Number(id), vaulted: !!vaulted };
}

export async function mockReanalyze(id) {
  await delay(300);
  return { id: Number(id), status: 'QUEUED', message: 'AI 재분석 요청이 접수되었습니다.' };
}

export async function mockShareItems() {
  await delay();
  return { shareUrl: 'https://sortmate.app/s/mock-token', expiresAt: null };
}

export async function mockListCategories() {
  await delay(150);
  const counts = {};
  DB.forEach((it) => {
    if (it.category) counts[it.category] = (counts[it.category] || 0) + 1;
  });
  return { categories: Object.entries(counts).map(([name, itemCount]) => ({ name, itemCount })) };
}
