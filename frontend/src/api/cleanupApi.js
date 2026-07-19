import client from './client';
import * as mock from './mock/cleanupMock';

/**
 * cleanup 모듈 API 함수. 경로/필드는 _workspace/contracts/cleanup.md와 글자 단위로 일치.
 * 신규 정의는 CLEAN-01,02,03,04,05,07,08,09,10. 삭제(CLEAN-06)는 itemApi.deleteItems(ITEM-09) 재사용.
 * VITE_USE_MOCK=true 이면 api/mock/cleanupMock.js 로 분기.
 * 인터셉터가 공통 봉투를 해제하므로 반환값은 계약의 `data` 오브젝트다.
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// CLEAN-01: GET /api/cleanup/dashboard
export async function getDashboard() {
  return USE_MOCK ? mock.mockGetDashboard() : client.get('/cleanup/dashboard');
}

// CLEAN-02: GET /api/cleanup/duplicates?page=&size=
export async function listDuplicates(params = {}) {
  return USE_MOCK ? mock.mockListDuplicates(params) : client.get('/cleanup/duplicates', { params });
}

// CLEAN-03: POST /api/cleanup/duplicates/{groupId}/resolve  ({ keepItemId })
export async function resolveDuplicate(groupId, keepItemId) {
  return USE_MOCK ? mock.mockResolveDuplicate(groupId, keepItemId) : client.post(`/cleanup/duplicates/${groupId}/resolve`, { keepItemId });
}

// CLEAN-04: POST /api/cleanup/duplicates/{groupId}/dismiss
export async function dismissDuplicate(groupId) {
  return USE_MOCK ? mock.mockDismissDuplicate(groupId) : client.post(`/cleanup/duplicates/${groupId}/dismiss`);
}

// CLEAN-05: GET /api/cleanup/screenshots?reason=&page=&size=
export async function listScreenshots(params = {}) {
  return USE_MOCK ? mock.mockListScreenshots(params) : client.get('/cleanup/screenshots', { params });
}

// CLEAN-07: POST /api/cleanup/run  ({ types? })
export async function runCleanup(types) {
  return USE_MOCK ? mock.mockRunCleanup(types) : client.post('/cleanup/run', types ? { types } : {});
}

// CLEAN-08: GET /api/cleanup/report
export async function getReport() {
  return USE_MOCK ? mock.mockGetReport() : client.get('/cleanup/report');
}

// CLEAN-09: GET /api/cleanup/settings
export async function getSettings() {
  return USE_MOCK ? mock.mockGetSettings() : client.get('/cleanup/settings');
}

// CLEAN-10: PUT /api/cleanup/settings  (부분 수정)
export async function updateSettings(patch) {
  return USE_MOCK ? mock.mockUpdateSettings(patch) : client.put('/cleanup/settings', patch);
}
