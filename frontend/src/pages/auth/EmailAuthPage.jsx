import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, signup, socialLogin } from '../../api/authApi';
import { beginOAuth, hasOAuthConfig } from '../../api/oauth';
import PasswordField from '../../components/PasswordField';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

/**
 * email_login_sign_up_com_004 — 이메일 로그인/회원가입 (/auth/email)
 * LOGIN 탭 → AUTH-02 login. SIGN UP 탭 → AUTH-08 signup(약관 동의 필수) → 자동 로그인 → /home.
 * Forgot?는 LOGIN 탭에서만, 약관 체크박스는 SIGN UP 탭에서만. 소셜 버튼은 LoginPage와 동일 로직.
 */
const useMock = import.meta.env.VITE_USE_MOCK === 'true';

export default function EmailAuthPage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [mode, setMode] = useState('login'); // login | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === 'signup';

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
    if (isSignup && !agreed) {
      show('약관에 동의해 주세요.', { icon: 'error' });
      return;
    }
    setBusy(true);
    try {
      if (isSignup) await signup({ email, password, agreedToTerms: agreed });
      else await login({ email, password });
      navigate('/home');
    } catch (err) {
      show(err.message || '요청을 처리하지 못했습니다.', { icon: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const tabClass = (active) =>
    `flex-1 py-2 font-label-caps text-label-caps rounded-lg transition-all duration-200 ${
      active ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant'
    }`;

  return (
    <main className="flex-grow flex flex-col items-center justify-center px-container-padding pb-stack-gap-lg pt-12 min-h-screen">
      {/* Logo */}
      <div className="w-full max-w-sm mb-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl mb-6 shadow-lg shadow-primary/20 transform rotate-3">
          <span className="material-symbols-outlined text-on-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
        </div>
        <h1 className="font-display-lg text-display-lg text-primary mb-2">Sortmate</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Your intelligent digital curator.</p>
      </div>

      {/* Form Container */}
      <div className="w-full max-w-sm glass-card p-8 rounded-3xl border border-white/50 shadow-xl">
        <form className="space-y-stack-gap-md" onSubmit={submit}>
          {/* Tabs */}
          <div className="flex p-1 bg-surface-container-low rounded-xl mb-4">
            <button type="button" className={tabClass(!isSignup)} onClick={() => setMode('login')}>LOGIN</button>
            <button type="button" className={tabClass(isSignup)} onClick={() => setMode('signup')}>SIGN UP</button>
          </div>

          <div className="mb-6">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">{isSignup ? 'Join Sortmate' : 'Welcome back'}</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {isSignup ? 'Start curating your digital world today.' : 'Access your curated digital assets.'}
            </p>
          </div>

          {/* Email */}
          <div className="space-y-stack-gap-sm">
            <label className="block font-label-caps text-label-caps text-on-surface-variant tracking-wider uppercase" htmlFor="email">
              EMAIL ADDRESS
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">mail</span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="curator@sortmate.com"
                required
                className="w-full pl-11 pr-4 py-4 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-md text-body-lg placeholder:text-outline"
              />
            </div>
          </div>

          {/* Password (PasswordField 재사용) */}
          <PasswordField
            id="password"
            label="PASSWORD"
            placeholder="••••••••"
            value={password}
            onChange={setPassword}
          />
          {!isSignup && (
            <div className="text-right -mt-2">
              <button type="button" onClick={() => navigate('/password/reset')} className="font-caption text-caption text-primary hover:opacity-80">
                Forgot?
              </button>
            </div>
          )}

          {/* TOS (SIGN UP 전용) */}
          {isSignup && (
            <label className="flex items-start gap-3 cursor-pointer py-2">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 w-5 h-5 border border-outline-variant rounded bg-white checked:bg-primary checked:border-primary accent-primary focus:ring-0"
              />
              <span className="font-caption text-caption text-on-surface-variant leading-tight">
                I agree to the <a className="text-primary font-medium" href="#">Terms of Service</a> and{' '}
                <a className="text-primary font-medium" href="#">Privacy Policy</a>.
              </span>
            </label>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-4 bg-primary text-on-primary font-headline-sm text-headline-sm rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all duration-200 mt-4 disabled:opacity-60"
          >
            {busy ? '처리 중...' : isSignup ? 'Create Account' : 'Login'}
          </button>

          {/* Social Divider */}
          <div className="relative py-4 flex items-center">
            <div className="flex-grow border-t border-outline-variant" />
            <span className="flex-shrink mx-4 font-label-caps text-[10px] text-outline-variant tracking-widest uppercase">OR CONTINUE WITH</span>
            <div className="flex-grow border-t border-outline-variant" />
          </div>

          {/* Social */}
          <div className="flex gap-4">
            <button type="button" onClick={() => handleSocial('google')} className="flex-1 flex items-center justify-center py-3 bg-surface-container-low rounded-xl hover:bg-surface-container-high transition-colors font-body-md text-on-surface">
              Google
            </button>
            <button type="button" onClick={() => handleSocial('apple')} className="flex-1 flex items-center justify-center py-3 bg-surface-container-low rounded-xl hover:bg-surface-container-high transition-colors font-body-md text-on-surface">
              Apple
            </button>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <button className="text-primary font-bold hover:underline" onClick={() => setMode(isSignup ? 'login' : 'signup')}>
            {isSignup ? 'Log in' : 'Sign up for free'}
          </button>
        </p>
      </div>

      {/* Decorative glows */}
      <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[40%] bg-primary/5 blur-[120px] rounded-full -z-10" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[50%] h-[40%] bg-secondary-fixed/10 blur-[120px] rounded-full -z-10" />

      <Toast {...toast} />
    </main>
  );
}
