import { useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { socialLogin } from '../../api/authApi';
import { consumeState, redirectUriFor } from '../../api/oauth';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

/**
 * /auth/callback/:provider — provider 리다이렉트 복귀 지점.
 * code/state 파싱 → state 검증 → socialLogin(provider, {authorizationCode, redirectUri}) → /home.
 * 사용자 취소/에러/검증 실패는 토스트 후 /login.
 */
export default function OAuthCallbackPage() {
  const { provider } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const ran = useRef(false); // StrictMode 이중 실행/코드 재사용 방지

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const bail = (msg) => {
      show(msg, { icon: 'error' });
      setTimeout(() => navigate('/login', { replace: true }), 1200);
    };

    const error = sp.get('error');
    const code = sp.get('code');
    const state = sp.get('state');

    if (error || !code) return bail('로그인이 취소되었습니다.');
    if (!consumeState(provider, state)) return bail('보안 검증에 실패했습니다. 다시 시도해 주세요.');

    socialLogin(provider, { authorizationCode: code, redirectUri: redirectUriFor(provider) })
      .then(() => navigate('/home', { replace: true }))
      .catch((e) => bail(e.message || '로그인에 실패했습니다.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-background min-h-screen flex flex-col items-center justify-center gap-4 glass-background">
      <span className="material-symbols-outlined text-primary text-5xl animate-spin">progress_activity</span>
      <p className="font-body-md text-body-md text-text-muted">로그인 처리 중...</p>
      <Toast {...toast} />
    </div>
  );
}
