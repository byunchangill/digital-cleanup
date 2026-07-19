import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, socialLogin } from '../../api/authApi';
import { beginOAuth, hasOAuthConfig } from '../../api/oauth';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

/**
 * email_login_com_004_1 — 한글 이메일 로그인 (/login/email)
 * AUTH-02 login. 비밀번호 찾기 → /password/reset. 회원가입 → /signup. 소셜은 LoginPage와 동일.
 */
const useMock = import.meta.env.VITE_USE_MOCK === 'true';

export default function EmailLoginPage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSocial = (provider) => {
    if ((provider === 'kakao' || provider === 'google') && hasOAuthConfig(provider) && !useMock) {
      beginOAuth(provider);
      return;
    }
    socialLogin(provider, {})
      .then(() => navigate('/home'))
      .catch((e) => show(e.message || '로그인에 실패했습니다.', { icon: 'error' }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login({ email, password });
      navigate('/home');
    } catch (err) {
      show(err.message || '로그인에 실패했습니다.', { icon: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen flex flex-col items-center">
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-container-padding h-16 bg-surface-container-lowest border-b border-surface-border">
        <button onClick={() => navigate(-1)} aria-label="뒤로 가기" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors">
          <span className="material-symbols-outlined text-on-surface">arrow_back</span>
        </button>
        <h1 className="font-headline-sm text-headline-sm text-on-surface font-semibold">이메일 로그인</h1>
        <div className="w-10" />
      </header>

      <main className="w-full max-w-md px-container-padding pt-24 pb-12 flex flex-col flex-grow">
        <section className="mb-10">
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-2">반가워요!</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">다시 만나서 기뻐요. 계정 정보를 입력해주세요.</p>
        </section>

        <form className="flex flex-col gap-y-6 flex-grow" onSubmit={submit}>
          <div className="flex flex-col gap-y-2">
            <label className="font-body-md text-body-md text-on-surface-variant px-1" htmlFor="email">이메일 주소</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="이메일 주소 입력"
              className="w-full h-14 px-4 rounded-xl bg-surface border border-surface-border font-body-lg text-body-lg text-on-surface placeholder:text-text-muted memo-shadow focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
            />
          </div>

          <div className="flex flex-col gap-y-2">
            <label className="font-body-md text-body-md text-on-surface-variant px-1" htmlFor="password">비밀번호</label>
            <div className="relative">
              <input
                id="password"
                type={visible ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="비밀번호 입력"
                className="w-full h-14 px-4 pr-12 rounded-xl bg-surface border border-surface-border font-body-lg text-body-lg text-on-surface placeholder:text-text-muted memo-shadow focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
              />
              <button type="button" onClick={() => setVisible((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center" aria-label={visible ? '비밀번호 숨기기' : '비밀번호 표시'}>
                <span className="material-symbols-outlined text-text-muted">{visible ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={() => navigate('/password/reset')} className="font-body-md text-body-md text-primary font-medium hover:underline py-1">비밀번호 찾기</button>
            </div>
          </div>

          <div className="mt-4">
            <button type="submit" disabled={busy} className="w-full h-14 bg-primary text-on-primary rounded-xl font-headline-sm text-headline-sm font-semibold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all duration-150 disabled:opacity-60">
              {busy ? '처리 중...' : '로그인'}
            </button>
          </div>
        </form>

        <footer className="mt-auto pt-8 flex flex-col items-center gap-y-6">
          <div className="flex items-center gap-x-2 text-on-surface-variant font-body-md text-body-md">
            <span>계정이 없으신가요?</span>
            <button onClick={() => navigate('/signup')} className="text-primary font-bold hover:underline">회원가입</button>
          </div>
          <div className="flex flex-col items-center gap-y-4 w-full">
            <div className="flex items-center w-full gap-x-4">
              <div className="h-px bg-surface-border flex-grow" />
              <span className="text-caption font-caption text-text-muted uppercase tracking-widest">or</span>
              <div className="h-px bg-surface-border flex-grow" />
            </div>
            <div className="flex gap-x-4">
              <button onClick={() => handleSocial('kakao')} className="w-11 h-11 rounded-full border border-surface-border flex items-center justify-center hover:bg-surface-container-low transition-colors shadow-sm bg-[#FEE500] text-[#191919]" aria-label="카카오로 계속하기">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>chat_bubble</span>
              </button>
              <button onClick={() => handleSocial('google')} className="w-11 h-11 rounded-full border border-surface-border flex items-center justify-center hover:bg-surface-container-low transition-colors shadow-sm font-bold text-on-surface" aria-label="구글로 계속하기">
                G
              </button>
            </div>
          </div>
        </footer>
      </main>

      <Toast {...toast} />
    </div>
  );
}
