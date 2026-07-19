import client from './client';
import * as mock from './mock/adminMock';

/**
 * admin 모듈 API 함수. 경로/필드는 _workspace/contracts/admin.md와 글자 단위 일치.
 * 모든 엔드포인트 ADMIN 권한 필요(비관리자 → 403 ADMIN_REQUIRED). 라우트 가드는 AdminGuard.
 * VITE_USE_MOCK=true → api/mock/adminMock.js 로 분기.
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// ADM-01: GET /api/admin/dashboard
export function getDashboard() {
  return USE_MOCK ? mock.mockDashboard() : client.get('/admin/dashboard');
}

// ADM-02: GET /api/admin/users
export function getUsers(params = {}) {
  return USE_MOCK ? mock.mockUsers(params) : client.get('/admin/users', { params });
}

// ADM-04: GET /api/admin/cs/tickets
export function getCsTickets(params = {}) {
  return USE_MOCK ? mock.mockCsTickets(params) : client.get('/admin/cs/tickets', { params });
}

// ADM-05: GET /api/admin/classification/quality
export function getClassificationQuality(params = {}) {
  return USE_MOCK ? mock.mockQuality(params) : client.get('/admin/classification/quality', { params });
}

// ADM-06: POST /api/admin/classification/validation-pack
export function runValidationPack() {
  return USE_MOCK ? mock.mockValidationPack() : client.post('/admin/classification/validation-pack');
}

// ADM-03: GET /api/admin/users/export (CSV, 봉투 아님) → 브라우저 다운로드 트리거
export async function exportUsersCsv(params = {}) {
  let blob;
  if (USE_MOCK) {
    const csv = await mock.mockUsersCsv(params);
    blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  } else {
    // responseType blob → 인터셉터는 봉투가 아닌 응답을 그대로 통과시킴
    blob = await client.get('/admin/users/export', { params, responseType: 'blob' });
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'members.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
