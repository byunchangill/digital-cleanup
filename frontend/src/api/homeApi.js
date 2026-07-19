import client from './client';
import * as mock from './mock/homeMock';

/**
 * home 모듈 API 함수. 경로/필드는 _workspace/contracts/home.md와 글자 단위로 일치.
 * 신규 정의는 HOME-01, HOME-02 뿐. 최근문서/카테고리/즐겨찾기는 itemApi(ITEM-03/08/14) 재사용.
 * VITE_USE_MOCK=true 이면 api/mock/homeMock.js 로 분기.
 * 인터셉터가 공통 봉투를 해제하므로 반환값은 계약의 `data` 오브젝트다.
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// HOME-01: GET /api/home/dashboard?recentSize={n}
// data: { suggestions[], recentItems[], categories[] }
export async function getDashboard(recentSize = 10) {
  return USE_MOCK
    ? mock.mockGetDashboard(recentSize)
    : client.get('/home/dashboard', { params: { recentSize } });
}

// HOME-02: GET /api/home/search?q=&mode=&page=&size=
// data: { query, interpretations[], results[](+matchScore), refinedFilters[], assistantHint, page... }
export async function search({ q, mode = 'NORMAL', page = 0, size = 20, ...extra } = {}) {
  const params = { q, mode, page, size, ...extra };
  return USE_MOCK ? mock.mockSearch(params) : client.get('/home/search', { params });
}
