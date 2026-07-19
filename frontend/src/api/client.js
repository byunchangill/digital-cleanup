import axios from 'axios';

/**
 * 단일 axios 인스턴스.
 * - baseURL '/api' (Vite proxy → 백엔드)
 * - 요청 인터셉터: localStorage의 accessToken을 Bearer로 첨부
 * - 응답 인터셉터: 공통 봉투 { success, data, error } 해제
 *     성공 → data 만 반환 (페이지 코드는 data 만 다룬다)
 *     실패 → { code, message } 형태의 에러로 reject
 */
export const TOKEN_KEYS = {
  access: 'sortmate.accessToken',
  refresh: 'sortmate.refreshToken',
};

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEYS.access);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** 봉투/네트워크 에러를 일관된 형태로 정규화 */
export class ApiError extends Error {
  constructor(code, message, status) {
    super(message || code || '요청을 처리하지 못했습니다.');
    this.name = 'ApiError';
    this.code = code || 'UNKNOWN';
    this.status = status;
  }
}

client.interceptors.response.use(
  (response) => {
    const body = response.data;
    // 공통 봉투 해제
    if (body && typeof body === 'object' && 'success' in body) {
      if (body.success) return body.data;
      const err = body.error || {};
      return Promise.reject(new ApiError(err.code, err.message, response.status));
    }
    // 봉투가 아닌 응답은 그대로 반환
    return body;
  },
  (error) => {
    const res = error.response;
    if (res && res.data && res.data.error) {
      const err = res.data.error;
      return Promise.reject(new ApiError(err.code, err.message, res.status));
    }
    return Promise.reject(new ApiError('NETWORK_ERROR', '서버에 연결할 수 없습니다.', res?.status));
  }
);

export default client;
