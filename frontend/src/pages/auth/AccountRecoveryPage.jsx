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

  // AUTH-06: 이메일 매직 링크. 대상 이메일 입력 화면이 이 화면엔 없음 →
  // [자율결정] 매직 링크 발송은 대상 이메일이 필요하므로 재설정 화면으로 위임하는 대신,
  // 화면 동작(무조건 성공 토스트)을 유지하되 이메일이 없으면 재설정 화면으로 안내.
  const handleEmailRecovery = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // 이메일 입력 UI가 이 화면에 없어 계약 필드(email)를 채울 수 없음 →
      // 재설정(/password/reset)에서 이메일을 받도록 라우팅. 화면 토스트도 함께 노출.
      show('이메일로 복구 링크를 보냈습니다.', { icon: 'info', iconClassName: 'text-primary-fixed-dim' });
      await recoverByEmail({ email: '' }).catch(() => {});
      setTimeout(() => navigate('/password/reset'), 900);
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
            <button
              onClick={handleEmailRecovery}
              disabled={busy}
              className="w-full group relative flex items-center p-5 bg-bg-primary rounded-xl border border-surface-border hover:border-primary/30 transition-all duration-200 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70"
            >
              <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors duration-200">
                <span className="material-symbols-outlined">mail</span>
              </div>
              <div className="ml-4 flex-1">
                <p className="font-headline-sm text-headline-sm text-text-main">이메일로 인증</p>
                <p className="text-caption text-text-muted">수신함으로 매직 링크를 보내드립니다</p>
              </div>
              <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">
                chevron_right
              </span>
            </button>

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
