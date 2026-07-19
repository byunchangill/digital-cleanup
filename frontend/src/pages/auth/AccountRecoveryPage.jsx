import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { recoverByEmail } from '../../api/authApi';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

const RECOVERY_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBxrK4Wjt6i5xudCtfZ-9AaAsU2-7uUivTJLDT0-BXFRImKKSNscehiJ0YXMRHk_Z9OpkcdwHgyxCHyv-vedyrdqHZNKn8mwKP2SpPTWsnpw4-x_wUCcdWytIsnuZbGAjpta9QqN9aoHgD73SaJRD5izV9xRGxyE-QYc_CSfklPsi2ZxAUaWpg7J2BTNlLq6fGCjaEvjQnbn9g7IDp7n44v-c-HQ5ZFmZmAiWZxIirAEpWimnip4Qli-HonQ3Dv2L0uNrydXQFRums';

export default function AccountRecoveryPage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [busy, setBusy] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');

  // AUTH-06: 이메일 매직 링크. QA-02 해소 — 인라인 이메일 입력 폼으로 대상 이메일을 받아 전송.
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await recoverByEmail({ email });
      show('이메일로 복구 링크를 보냈습니다.', { icon: 'info', iconClassName: 'text-primary-fixed-dim' });
      setShowEmailForm(false);
      setEmail('');
    } catch (err) {
      show(err.message || '요청을 처리하지 못했습니다.', { icon: 'error' });
    } finally {
      setBusy(false);
    }
  };

  // 복구 코드로 인증: 24자리 입력 화면이 설계에 미제공([가정], 본 스코프 밖).
  const handleCodeRecovery = () => {
    show('복구 코드 입력 화면은 준비 중입니다.', {
      icon: 'info',
      iconClassName: 'text-primary-fixed-dim',
    });
  };

  const handleSupport = () => {
    show('고객 지원 포털로 이동 중...', { icon: 'info', iconClassName: 'text-primary-fixed-dim' });
  };

  return (
    <div className="bg-surface text-on-surface font-body-md overflow-x-hidden min-h-screen">
      {/* Transactional Header */}
      <nav className="fixed top-0 left-0 w-full h-16 flex items-center px-container-padding bg-surface/80 backdrop-blur-md z-50">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-on-surface">arrow_back</span>
        </button>
        <span className="ml-4 font-headline-sm text-headline-sm text-on-surface">계정 복구</span>
      </nav>

      <main className="min-h-screen pt-24 pb-12 px-container-padding flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
          {/* Brand Anchor */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-primary-container rounded-3xl flex items-center justify-center shadow-lg shadow-primary/10 mb-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span
                className="material-symbols-outlined text-on-primary-container text-4xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                lock_reset
              </span>
            </div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-text-main text-center">
              로그인에 문제가 있나요?
            </h1>
            <p className="mt-2 text-text-muted text-body-lg text-center max-w-xs">
              Sortmate 계정에 안전하게 다시 접속하려면 복구 방법을 선택하세요.
            </p>
          </div>

          {/* Recovery Options */}
          <div className="space-y-4">
            {/* Email */}
            <div className="w-full bg-bg-primary rounded-xl border border-surface-border shadow-sm overflow-hidden">
              <button
                onClick={() => setShowEmailForm((v) => !v)}
                className="w-full group relative flex items-center p-5 text-left transition-colors duration-200"
              >
                <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors duration-200">
                  <span className="material-symbols-outlined">mail</span>
                </div>
                <div className="ml-4 flex-1">
                  <p className="font-headline-sm text-headline-sm text-text-main">이메일로 인증</p>
                  <p className="text-caption text-text-muted">수신함으로 매직 링크를 보내드립니다</p>
                </div>
                <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">
                  {showEmailForm ? 'expand_less' : 'chevron_right'}
                </span>
              </button>
              {showEmailForm && (
                <form onSubmit={handleEmailSubmit} className="px-5 pb-5 space-y-3 border-t border-surface-border pt-4">
                  <label htmlFor="recovery-email" className="block font-label-caps text-label-caps text-on-surface-variant">
                    이메일 주소
                  </label>
                  <input
                    id="recovery-email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="예: name@company.com"
                    className="w-full h-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-md text-on-surface"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full h-12 bg-primary text-on-primary font-headline-sm text-headline-sm rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-70"
                  >
                    {busy ? '전송 중...' : '복구 링크 보내기'}
                  </button>
                </form>
              )}
            </div>

            {/* Recovery Code */}
            <button
              onClick={handleCodeRecovery}
              className="w-full group relative flex items-center p-5 bg-bg-primary rounded-xl border border-surface-border hover:border-primary/30 transition-all duration-200 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
            >
              <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors duration-200">
                <span className="material-symbols-outlined">key</span>
              </div>
              <div className="ml-4 flex-1">
                <p className="font-headline-sm text-headline-sm text-text-main">복구 코드로 인증</p>
                <p className="text-caption text-text-muted">24자리 백업 키를 입력하세요</p>
              </div>
              <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">
                chevron_right
              </span>
            </button>

            {/* Support */}
            <div className="pt-6 border-t border-surface-border mt-8">
              <p className="text-center text-body-md text-text-muted mb-4">
                두 방법 모두 사용할 수 없나요?
              </p>
              <button
                onClick={handleSupport}
                className="w-full py-4 text-primary font-headline-sm text-headline-sm bg-primary-fixed hover:bg-primary-fixed-dim rounded-xl transition-all duration-200 active:scale-95"
              >
                고객 센터 문의
              </button>
            </div>
          </div>

          {/* Contextual Branding Image */}
          <div className="mt-16 relative w-full h-40 rounded-2xl overflow-hidden shadow-inner">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-surface-dim" />
            <img
              className="w-full h-full object-cover mix-blend-multiply opacity-40"
              alt=""
              src={RECOVERY_IMG}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="font-label-caps text-label-caps text-primary tracking-widest uppercase">
                  검증된 보안
                </p>
                <p className="text-caption text-text-muted mt-1">종단간 암호화된 복구 프로세스</p>
              </div>
            </div>
          </div>

          <p className="mt-12 text-center text-caption text-outline-variant">
            COM-008 • Sortmate Secure Auth v2.4
          </p>
        </div>
      </main>

      <Toast {...toast} shape="rounded" />
    </div>
  );
}
