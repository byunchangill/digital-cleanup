import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../../api/authApi';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

export default function ResetPasswordPage() {
  const { toast, show } = useToast();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | done

  // AUTH-04: 계정 열거 방지 위해 서버가 항상 200 성공 반환. 화면도 무조건 성공 토스트.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === 'loading') return;
    setStatus('loading');
    try {
      await requestPasswordReset({ email });
      show('링크가 발송되었습니다! 편지함을 확인해 주세요.');
      setStatus('done');
    } catch (err) {
      // 형식 오류/과다요청 등은 에러 토스트
      show(err.message || '요청을 처리하지 못했습니다.', { icon: 'error' });
      setStatus('idle');
    }
  };

  const loading = status === 'loading';
  const done = status === 'done';

  return (
    <div className="bg-background text-on-surface font-body-lg min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-primary-container/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-secondary-container/10 blur-[120px]" />
      </div>

      <main className="w-full max-w-[420px] px-container-padding z-10">
        <header className="mb-10 text-center">
          <div className="mb-8 flex justify-center">
            <div className="w-16 h-16 bg-primary-container rounded-2xl shadow-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary-container !text-[32px]">
                lock_reset
              </span>
            </div>
          </div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-2">
            비밀번호 재설정
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-[320px] mx-auto">
            이메일 주소를 입력하시면 비밀번호 재설정을 위한 링크를 보내드립니다.
          </p>
        </header>

        <form className="space-y-stack-gap-lg" onSubmit={handleSubmit}>
          <div className="space-y-stack-gap-sm">
            <label className="font-label-caps text-label-caps text-on-surface-variant px-1" htmlFor="email">
              이메일 주소
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-on-surface-variant group-focus-within:text-primary transition-colors">
                <span className="material-symbols-outlined !text-[20px]">mail</span>
              </div>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="예: name@company.com"
                className="w-full h-14 pl-12 pr-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-md text-on-surface"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full h-14 text-on-primary font-headline-sm text-headline-sm rounded-xl shadow-[0_4px_12px_rgba(53,37,205,0.25)] hover:shadow-[0_6px_16px_rgba(53,37,205,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
              done ? 'bg-secondary' : 'bg-primary'
            }`}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                전송 중...
              </>
            ) : done ? (
              '성공적으로 발송됨'
            ) : (
              <>
                재설정 링크 발송
                <span className="material-symbols-outlined !text-[20px]">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <footer className="mt-8 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 font-body-md text-body-md text-primary hover:text-on-primary-fixed-variant transition-colors group"
          >
            <span className="material-symbols-outlined !text-[18px] group-hover:-translate-x-1 transition-transform">
              arrow_back
            </span>
            로그인으로 돌아가기
          </Link>
        </footer>
      </main>

      <div className="fixed bottom-10 left-0 w-full text-center px-container-padding">
        <p className="font-caption text-caption text-text-muted">
          도움이 필요하신가요?{' '}
          <a className="text-primary hover:underline underline-offset-4" href="#">
            고객 지원팀
          </a>
          에 문의하세요
        </p>
      </div>

      <Toast {...toast} />
    </div>
  );
}
