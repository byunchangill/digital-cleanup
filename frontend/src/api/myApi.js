import client from './client';
import * as mock from './mock/myMock';

/**
 * my(마이/설정) 모듈 API 함수. 경로/필드는 _workspace/contracts/my.md와 글자 단위로 일치.
 * VITE_USE_MOCK=true 이면 api/mock/myMock.js 로 분기.
 * 인터셉터가 공통 봉투를 해제하므로 반환값은 계약의 `data` 오브젝트다.
 * 계정 삭제(VAULT-07), 대용량 삭제(ITEM-09)는 각 소유 모듈 API 재사용 — 여기 없음.
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// MY-01: GET /api/my/notifications?category&page&size
export async function listNotifications(params = {}) {
  return USE_MOCK ? mock.mockListNotifications(params) : client.get('/my/notifications', { params });
}

// MY-02: POST /api/my/notifications/read  ({ ids?, all? })
export async function readNotifications({ ids, all } = {}) {
  return USE_MOCK ? mock.mockReadNotifications({ ids, all }) : client.post('/my/notifications/read', { ids, all });
}

// MY-03: GET /api/my/export/options
export async function getExportOptions() {
  return USE_MOCK ? mock.mockGetExportOptions() : client.get('/my/export/options');
}

// MY-04: POST /api/my/export  ({ dataTypes: [], destination })  → 202
export async function startExport({ dataTypes, destination } = {}) {
  return USE_MOCK ? mock.mockStartExport({ dataTypes, destination }) : client.post('/my/export', { dataTypes, destination });
}

// MY-05: GET /api/my/export/{jobId}  (폴링)
export async function getExportJob(jobId) {
  return USE_MOCK ? mock.mockGetExportJob(jobId) : client.get(`/my/export/${jobId}`);
}

// MY-06: POST /api/my/export/{jobId}/cancel
export async function cancelExport(jobId) {
  return USE_MOCK ? mock.mockCancelExport(jobId) : client.post(`/my/export/${jobId}/cancel`);
}

// MY-07: GET /api/my/storage  (limitReached 플래그로 변형)
export async function getStorage() {
  return USE_MOCK ? mock.mockGetStorage() : client.get('/my/storage');
}

// MY-08: GET /api/my/plans
export async function getPlans() {
  return USE_MOCK ? mock.mockGetPlans() : client.get('/my/plans');
}

// MY-09: POST /api/my/plans/upgrade  ({ planId })  — stub
export async function upgradePlan(planId) {
  return USE_MOCK ? mock.mockUpgradePlan(planId) : client.post('/my/plans/upgrade', { planId });
}

// MY-10: POST /api/my/plans/restore  — stub
export async function restorePurchase() {
  return USE_MOCK ? mock.mockRestorePurchase() : client.post('/my/plans/restore');
}
