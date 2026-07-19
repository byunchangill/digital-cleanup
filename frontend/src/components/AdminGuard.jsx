import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { isAdmin } from '../lib/role';
import Toast from './Toast';
import useToast from '../hooks/useToast';

/**
 * /admin/* 라우트 가드. role=ADMIN 이 아니면 안내 토스트 후 홈으로 리다이렉트.
 * role 은 로그인 시 authApi 가 localStorage(sortmate.role)에 저장.
 * 백엔드 UserResponse.role 미노출 시에도 미저장 → 비관리자 취급(기본 차단).
 */
export default function AdminGuard({ children }) {
  const admin = isAdmin();
  const navigate = useNavigate();
  const { toast, show } = useToast();

  useEffect(() => {
    if (!admin) {
      show('관리자 권한이 필요합니다.', { icon: 'lock' });
      const t = setTimeout(() => navigate('/home', { replace: true }), 1200);
      return () => clearTimeout(t);
    }
  }, [admin]); // eslint-disable-line react-hooks/exhaustive-deps

  if (admin) return children;
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Toast {...toast} />
    </div>
  );
}
