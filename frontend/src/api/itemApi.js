import client from './client';
import * as mock from './mock/itemMock';

/**
 * item 모듈 API 함수. 경로/필드는 _workspace/contracts/item.md와 글자 단위로 일치.
 * VITE_USE_MOCK=true 이면 api/mock/itemMock.js 로 분기(백엔드 미완성 구간 시연용).
 * 인터셉터가 공통 봉투를 해제하므로 반환값은 계약의 `data` 오브젝트다.
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// ITEM-01: POST /api/items/import  (multipart, files[] + sourceType)
export async function importPhotos(files, sourceType = 'PHOTO') {
  if (USE_MOCK) return mock.mockImportPhotos(files, sourceType);
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  form.append('sourceType', sourceType);
  return client.post('/items/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// ITEM-02: POST /api/items/memo
export async function createMemo({ title, body, tags, category, vaulted, attachmentIds } = {}) {
  return USE_MOCK
    ? mock.mockCreateMemo({ title, body, tags, category, vaulted, attachmentIds })
    : client.post('/items/memo', { title, body, tags, category, vaulted, attachmentIds });
}

// ITEM-03: GET /api/items  (type/category/favorite/vaulted/q/page/size/sort)
export async function listItems(params = {}) {
  return USE_MOCK ? mock.mockListItems(params) : client.get('/items', { params });
}

// ITEM-04: GET /api/items/{id}
export async function getItem(id) {
  return USE_MOCK ? mock.mockGetItem(id) : client.get(`/items/${id}`);
}

// ITEM-05: GET /api/items/{id}/related
export async function getRelated(id, limit = 4) {
  return USE_MOCK ? mock.mockGetRelated(id, limit) : client.get(`/items/${id}/related`, { params: { limit } });
}

// ITEM-06: PATCH /api/items/{id}
export async function updateItem(id, patch) {
  return USE_MOCK ? mock.mockUpdateItem(id, patch) : client.patch(`/items/${id}`, patch);
}

// ITEM-07: GET /api/items/favorites  (type/q/page/size)
export async function listFavorites(params = {}) {
  return USE_MOCK ? mock.mockListFavorites(params) : client.get('/items/favorites', { params });
}

// ITEM-08: PUT /api/items/{id}/favorite
export async function toggleFavorite(id, favorite) {
  return USE_MOCK ? mock.mockToggleFavorite(id, favorite) : client.put(`/items/${id}/favorite`, { favorite });
}

// ITEM-09: POST /api/items/delete  ({ ids: [] })
export async function deleteItems(ids) {
  return USE_MOCK ? mock.mockDeleteItems(ids) : client.post('/items/delete', { ids });
}

// ITEM-10: POST /api/items/bulk/category
export async function bulkCategory(ids, category) {
  return USE_MOCK ? mock.mockBulkCategory(ids, category) : client.post('/items/bulk/category', { ids, category });
}

// ITEM-11: POST /api/items/bulk/tags
export async function bulkTags(ids, tags) {
  return USE_MOCK ? mock.mockBulkTags(ids, tags) : client.post('/items/bulk/tags', { ids, tags });
}

// ITEM-12: PUT /api/items/{id}/vault
export async function toggleVault(id, vaulted) {
  return USE_MOCK ? mock.mockToggleVault(id, vaulted) : client.put(`/items/${id}/vault`, { vaulted });
}

// ITEM-15: POST /api/items/{id}/reanalyze  (AI 재분석 stub, 202 QUEUED)
export async function reanalyzeItem(id) {
  return USE_MOCK ? mock.mockReanalyze(id) : client.post(`/items/${id}/reanalyze`);
}

// ITEM-13: POST /api/items/share  ({ ids: [] })
export async function shareItems(ids) {
  return USE_MOCK ? mock.mockShareItems(ids) : client.post('/items/share', { ids });
}

// ITEM-14: GET /api/categories
export async function listCategories() {
  return USE_MOCK ? mock.mockListCategories() : client.get('/categories');
}
