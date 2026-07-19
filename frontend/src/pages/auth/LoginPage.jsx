import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socialLogin } from '../../api/authApi';
import { beginOAuth, hasOAuthConfig } from '../../api/oauth';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

const GOOGLE_LOGO =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBvyH3C2RGkJUNSQY6N-0_BSsUxUxyekCpIwFPjPYWto5x1iUVcV-6fQMHZKMdQKOWt8xJLMOhwbwbqs7IhsRT7POQ24JO7egrREhtaZHExDCImRpyHhlheM0remOd7ZYTLdO9acZ0KiJQttE-sQzKMgsXexaG0kCggAlquLclBzZGEOSq5PL0BhkTdoxSWaMMoHVk0Gw8BgVOY1P-MNQyEGXLO9QTfn2sBkj2jJW0ogkWmJ6jRF5iRwRLKNfyqcVdSr-rOBtxYH80';

export default function LoginPage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [busy, setBusy] = useState('');

  // AUTH-01: 소셜 로그인.
  // 카카오/구글은 client_id 환경변수가 있으면 실제 인가 코드 플로우(provider 리다이렉트 → /auth/callback).
  // 키 없음 / mock 모드 / 애플은 기존 stub(빈 코드) 유지 — 키 없이도 데모가 굴러가야 함.
  const useMock = import.meta.env.VITE_USE_MOCK === 'true';
  const handleSocial = async (provider) => {
    if ((provider === 'kakao' || provider === 'google') && hasOAuthConfig(provider) && !useMock) {
      beginOAuth(provider); // provider 인가 URL로 이탈
      return;
    }
    setBusy(provider);
    try {
      await socialLogin(provider, {});
      navigate('/home');
    } catch (e) {
      show(e.message || '로그인에 실패했습니다.', { icon: 'error' });
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md text-body-md min-h-screen flex flex-col items-center justify-between glass-background">
      {/* Header / Branding */}
      <header className="w-full pt-20 px-container-padding flex flex-col items-center text-center">
        <div className="mb-stack-gap-lg">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse">
            <span
              className="material-symbols-outlined text-on-primary text-5xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              auto_fix_high
            </span>
          </div>
        </div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary tracking-tight mb-2">
          Sortmate
        </h1>
        <p className="font-body-lg text-body-lg text-text-muted max-w-[280px]">
          지능적인 큐레이션과 안전한 정리로 완성되는 당신의 디지털 세상.
        </p>
      </header>

      {/* Main Login Content */}
      <main className="w-full max-w-md px-container-padding pb-16 flex flex-col gap-4">
        <div className="flex flex-col gap-stack-gap-md w-full">
          {/* Kakao */}
          <button
            onClick={() => handleSocial('kakao')}
            disabled={!!busy}
            className="btn-interact w-full h-[56px] bg-[#FEE500] text-[#191919] rounded-xl flex items-center justify-center relative font-semibold shadow-sm overflow-hidden disabled:opacity-70"
          >
            <div className="absolute left-6 flex items-center">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                chat_bubble
              </span>
            </div>
            카카오로 계속하기
          </button>
          {/* Google */}
          <button
            onClick={() => handleSocial('google')}
            disabled={!!busy}
            className="btn-interact w-full h-[56px] bg-white text-on-surface border border-surface-border rounded-xl flex items-center justify-center relative font-semibold shadow-sm disabled:opacity-70"
          >
            <div className="absolute left-6 w-6 h-6 flex items-center justify-center overflow-hidden">
              <img className="w-5 h-5" alt="Google" src={GOOGLE_LOGO} />
            </div>
            구글로 계속하기
          </button>
          {/* Apple */}
          <button
            onClick={() => handleSocial('apple')}
            disabled={!!busy}
            className="btn-interact w-full h-[56px] bg-black text-white rounded-xl flex items-center justify-center relative font-semibold shadow-sm disabled:opacity-70"
          >
            <div className="absolute left-6 flex items-center">
              <span
                className="material-symbols-outlined text-white text-2xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                apps
              </span>
            </div>
            애플로 계속하기
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-stack-gap-sm px-4">
          <div className="h-[1px] flex-1 bg-surface-border" />
          <span className="font-label-caps text-label-caps text-outline">또는</span>
          <div className="h-[1px] flex-1 bg-surface-border" />
        </div>

        {/* Email Sign In — 이메일 로그인 폼 화면이 설계에 미제공([가정]).
            임의 라우트를 만들지 않고 안내 토스트만 노출(추후 폼 화면 확보 시 연결). */}
        <button
          onClick={() => navigate('/login/email')}
          className="w-full py-2 text-primary font-body-lg text-body-lg hover:underline transition-all"
        >
          이메일로 로그인
        </button>
      </main>

      {/* Footer / Legal */}
      <footer className="w-full px-container-padding pb-10 text-center">
        <p className="font-caption text-caption text-text-muted">
          계속 진행함으로써 Sortmate의 <br />
          <a className="underline hover:text-primary transition-colors" href="#">
            서비스 약관
          </a>{' '}
          및{' '}
          <a className="underline hover:text-primary transition-colors" href="#">
            개인정보 처리방침
          </a>
          에 동의하게 됩니다.
        </p>
      </footer>

      {/* Decorative glows */}
      <div className="fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/5 blur-[120px] rounded-full -z-10" />
      <div className="fixed bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-[300px] h-[300px] bg-secondary/5 blur-[100px] rounded-full -z-10" />

      <Toast {...toast} />
    </div>
  );
}
