/**
 * home 모듈 mock 응답 (HOME-01 대시보드, HOME-02 자연어 검색).
 * 반환 형태는 client.js 인터셉터가 봉투를 해제한 뒤의 `data`(계약 스키마)와 동일.
 * 활성화: VITE_USE_MOCK=true. recentItems/results 는 Item 표준 표현(contracts/item.md).
 */
const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

const IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBbV8kahE5Y4OtH62RfeILNrPfL6O34pp1xY0XEkbe8BI1XquiO2_8Tzpw4RtZTVo5CXqXkLiElDJBbpABEvCrthGR6oqJdSzQGK8sjq9Cjy4YXZAHTJilDipNwOB1XLeF992TmFMw7UeFEjKvmC6jZqGo-3QGZtuSuuafhlJJi2W-Vp9701Kd_WhbDh_Ju31K4AoLmymP8TCseBPnseGrLDpCeKkiARBbfuoRoAS3PX7VW_sCRW2pGV-XCM_CnzEFUem7a0u2Kmsw';

/** 계약 Item 표준 표현 헬퍼 (itemMock 과 동일 shape) */
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

// HOME-01: 대시보드 (정리 제안 + 최근 문서 + 카테고리)
export async function mockGetDashboard(recentSize = 10) {
  await delay();
  const recentItems = [
    item({ id: 101, type: 'SCREENSHOT', title: '이마트 영수증', category: '영수증', savedAt: '2026-07-18T05:30:00Z' }),
    item({ id: 102, type: 'LINK', title: '제주 워케이션 추천', category: '여행', sourceApp: '네이버 블로그', thumbnailUrl: null, savedAt: '2026-07-17T09:00:00Z' }),
    item({ id: 103, type: 'IMAGE', title: '블루보틀 쿠폰', category: '쿠폰', expiryDate: '2026-07-22', expiringSoon: true, savedAt: '2026-07-16T09:00:00Z' }),
  ].slice(0, recentSize);

  return {
    suggestions: [
      { type: 'DUPLICATE_PHOTOS', title: '중복 사진 12건이 있어요', count: 12, actionLabel: '정리하기', actionRoute: '/cleanup/duplicates' },
      { type: 'EXPIRING_ITEMS', title: '만료 임박 쿠폰 3장', count: 3, actionLabel: '확인하기', actionRoute: '/library?filter=expiring' },
    ],
    recentItems,
    categories: [
      { name: '쿠폰', itemCount: 48 },
      { name: '영수증', itemCount: 125 },
      { name: '여행', itemCount: 12 },
      { name: '쇼핑', itemCount: 86 },
    ],
  };
}

const SEARCH_RESULTS = [
  { ...item({ id: 201, type: 'SCREENSHOT', title: '홈 네트워크', favorite: true, savedAt: '2024-06-14T09:00:00Z' }), matchScore: 98 },
  { ...item({ id: 202, type: 'IMAGE', title: '라우터 뒷면 패널', savedAt: '2024-06-21T09:00:00Z' }), matchScore: 92 },
  { ...item({ id: 203, type: 'DOCUMENT', title: '비밀 메모', vaulted: true, thumbnailUrl: null, savedAt: '2024-06-02T09:00:00Z' }), matchScore: 88 },
  { ...item({ id: 204, type: 'SCREENSHOT', title: '스타벅스 와이파이', savedAt: '2024-06-28T09:00:00Z' }), matchScore: 85 },
];

// HOME-02: 자연어 검색. 특정 질의는 빈 상태(검색 결과 없음)로 반환.
export async function mockSearch({ q = '', mode = 'NORMAL', page = 0, size = 20, favorite, category } = {}) {
  await delay(500);
  const empty = /팬케이크|레시피|블루베리/.test(q);

  if (empty) {
    return {
      query: q,
      interpretations: [],
      results: [],
      refinedFilters: [],
      assistantHint:
        mode === 'ASSISTANT'
          ? '이미지 속 텍스트를 분석하고 있습니다. 스크린샷에서 관련 내용을 찾는 중입니다.'
          : "이미지 내부의 텍스트도 검색할 수 있습니다. 스크린샷에서 '블루베리'를 찾아볼까요?",
      page: 0, size, totalElements: 0, totalPages: 0, hasNext: false,
    };
  }

  // 상세필터 재질의(refinedFilters params) 반영 — 실제 백엔드 키(favorite/category)와 동일
  let results = SEARCH_RESULTS;
  if (favorite === true || favorite === 'true') results = results.filter((r) => r.favorite);
  if (category) results = results.filter((r) => r.category === category);

  return {
    query: q || '지난달 와이파이 비밀번호',
    interpretations: [
      { type: 'PERIOD', label: '기간: 6월', value: '2024-06' },
      { type: 'ITEM_TYPE', label: '유형: 스크린샷', value: 'SCREENSHOT' },
    ],
    results,
    refinedFilters: [
      { id: 'favorites-only', title: '즐겨찾기한 항목만 보기', description: '별표 표시된 결과로 필터링', params: { favorite: true } },
      { id: 'category-travel', title: '카테고리로 좁히기: 여행', description: '여행 카테고리 항목으로 결과 제한', params: { category: '여행' } },
    ],
    assistantHint: null,
    page: 0, size, totalElements: results.length, totalPages: 1, hasNext: false,
  };
}
