import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signup, socialLogin } from '../../api/authApi';
import { beginOAuth, hasOAuthConfig } from '../../api/oauth';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

/**
 * email_login_sign_up_com_004 (한글 회원가입) — /signup
 * AUTH-08 signup(약관 동의 필수). 비밀번호 확인은 클라이언트 검증(password===confirm), 서버 미전송.
 * 약관/개인정보 링크 → /legal. 소셜은 LoginPage와 동일. 성공 시 자동 로그인 → /home.
 * [상충 해소] placeholder는 기존 정책(12자+대문자+특수문자)에 맞춘 안내로 표기.
 */
const useMock = import.meta.env.VITE_USE_MOCK === 'true';

export default function SignupPage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
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
    if (password !== confirm) {
      show('비밀번호가 일치하지 않습니다.', { icon: 'error' });
      return;
    }
    if (!agreed) {
      show('약관에 동의해 주세요.', { icon: 'error' });
      return;
    }
    setBusy(true);
    try {
      await signup({ email, password, agreedToTerms: agreed }); // confirm은 서버 미전송
      navigate('/home');
    } catch (err) {
      show(err.message || '회원가입에 실패했습니다.', { icon: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const inputWrap = 'relative flex items-center rounded-lg bg-surface-container-low border border-transparent focus-within:border-primary transition-all';
  const inputCls = 'w-full bg-transparent border-none py-3.5 pl-11 rounded-lg focus:ring-0 font-body-md text-body-md text-on-surface placeholder:text-outline-variant';

  return (
    <div className="flex flex-col min-h-screen text-on-surface font-body-md text-body-md">
      <header className="fixed top-0 w-full z-50 flex justify-center items-center px-container-padding h-16 bg-white">
        <h1 className="font-headline-md text-headline-md font-bold text-primary tracking-tight">Sortmate</h1>
      </header>

      <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-container-padding">
        <div className="w-full max-w-md space-y-stack-gap-lg">
          <div className="text-center space-y-2">
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-background">새로운 시작</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">디지털 클러터를 정리하고 스마트한 라이브러리를 만드세요.</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-surface-border">
            <form className="space-y-stack-gap-md" onSubmit={submit}>
              {/* Email */}
              <div className="space-y-base-unit">
                <label htmlFor="email" className="block font-body-md text-body-md font-semibold text-on-surface ml-1">이메일 주소</label>
                <div className={inputWrap}>
                  <span className="material-symbols-outlined absolute left-4 text-outline">mail</span>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="example@sortmate.com" className={`${inputCls} pr-4`} />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-base-unit">
                <label htmlFor="password" className="block font-body-md text-body-md font-semibold text-on-surface ml-1">비밀번호</label>
                <div className={inputWrap}>
                  <span className="material-symbols-outlined absolute left-4 text-outline">lock</span>
                  <input id="password" type={visible ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="12자 이상, 대문자·특수문자 포함" className={`${inputCls} pr-12`} />
                  <button type="button" onClick={() => setVisible((v) => !v)} className="absolute right-4 text-outline hover:text-primary transition-colors" aria-label={visible ? '비밀번호 숨기기' : '비밀번호 표시'}>
                    <span className="material-symbols-outlined">{visible ? 'visibility' : 'visibility_off'}</span>
                  </button>
                </div>
              </div>

              {/* Password confirm */}
              <div className="space-y-base-unit">
                <label htmlFor="password_confirm" className="block font-body-md text-body-md font-semibold text-on-surface ml-1">비밀번호 확인</label>
                <div className={inputWrap}>
                  <span className="material-symbols-outlined absolute left-4 text-outline">verified_user</span>
                  <input id="password_confirm" type={visible ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="비밀번호를 한번 더 입력하세요" className={`${inputCls} pr-4`} />
                </div>
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3 py-2 px-1">
                <input id="terms" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-5 w-5 accent-primary border-outline-variant rounded-md focus:ring-primary cursor-pointer" />
                <div className="text-caption font-caption text-on-surface-variant">
                  <label htmlFor="terms" className="cursor-pointer">
                    <button type="button" onClick={() => navigate('/legal')} className="text-primary font-semibold hover:underline">이용 약관</button> 및{' '}
                    <button type="button" onClick={() => navigate('/legal')} className="text-primary font-semibold hover:underline">개인정보 처리방침</button>에 동의합니다.
                  </label>
                </div>
              </div>

              <button type="submit" disabled={busy} className="w-full py-4 bg-primary text-on-primary font-body-lg text-body-lg font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-70">
                {busy ? '처리 중...' : '회원가입 하기'}
              </button>
            </form>

            {/* Social divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-surface-border" /></div>
              <div className="relative flex justify-center text-caption font-caption"><span className="px-4 bg-white text-outline">또는 다음으로 시작하기</span></div>
            </div>

            <div className="grid grid-cols-2 gap-grid-gutter">
              <button onClick={() => handleSocial('google')} className="flex items-center justify-center gap-2 py-3 px-4 border border-surface-border rounded-xl font-body-md text-body-md text-on-surface-variant hover:bg-surface-container-lowest transition-colors">
                <span className="font-bold">G</span> Google
              </button>
              <button onClick={() => handleSocial('kakao')} className="flex items-center justify-center gap-2 py-3 px-4 border border-surface-border rounded-xl font-body-md text-body-md text-on-surface-variant hover:bg-surface-container-lowest transition-colors">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat_bubble</span> 카카오
              </button>
            </div>
          </div>

          <div className="text-center pt-4">
            <p className="font-body-md text-body-md text-on-surface-variant">
              이미 계정이 있으신가요?
              <button onClick={() => navigate('/login/email')} className="text-primary font-bold hover:underline ml-1">로그인</button>
            </p>
          </div>
        </div>
      </main>

      <Toast {...toast} />
    </div>
  );
}
