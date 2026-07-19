import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { resetPassword } from '../../api/authApi';
import PasswordField from '../../components/PasswordField';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

const COMMON_PATTERNS = ['123', 'password', 'qwerty', 'abc'];

/** 클라이언트 표시용 강도 계산(서버 검증과 무관, 계약 AUTH-05 비고). 0~4 */
function scorePassword(pw) {
  if (!pw) return { score: 0, label: '' };
  let score = 0;
  if (pw.length >= 12) score += 2;
  else if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  if (COMMON_PATTERNS.some((p) => pw.toLowerCase().includes(p))) score = Math.max(0, score - 2);
  score = Math.min(4, score);
  const labels = ['매우 약함', '약함', '보통', '강함', '강함'];
  return { score, label: labels[score] };
}

export default function SetNewPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast, show } = useToast();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  // 진입 토큰: 재설정 링크(?token=) 또는 복구코드 검증(state.recoveryToken)
  const token = searchParams.get('token') || location.state?.recoveryToken || '';

  const strength = useMemo(() => scorePassword(password), [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (password !== confirm) {
      show('비밀번호가 일치하지 않습니다.', { icon: 'error' });
      return;
    }
    setBusy(true);
    try {
      const data = await resetPassword({
        token,
        newPassword: password,
        confirmPassword: confirm,
      });
      show(data?.message || '비밀번호가 성공적으로 업데이트되었습니다.');
      setTimeout(() => navigate(data?.nextRoute || '/login'), 1200);
    } catch (err) {
      show(err.message || '비밀번호를 변경하지 못했습니다.', { icon: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md">
      <main className="relative flex flex-col items-center justify-center min-h-screen px-container-padding py-stack-gap-lg overflow-hidden">
        {/* Atmospheric */}
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-5%] left-[-5%] w-80 h-80 bg-secondary-container/10 rounded-full blur-3xl" />

        <div className="w-full max-w-md z-10">
          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="mb-stack-gap-lg group flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span className="font-body-md text-body-md">뒤로</span>
          </button>

          {/* Brand */}
          <div className="mb-stack-gap-lg text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/20 mb-stack-gap-md">
              <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                lock_reset
              </span>
            </div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight mb-2">
              새 비밀번호 설정
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant px-4">
              큐레이션된 에셋과 Sortmate 라이브러리를 보호하기 위해 강력하고 안전한 비밀번호를 만드세요.
            </p>
          </div>

          {/* Progress Tracker (3단계 중 3번째 활성) */}
          <div className="flex justify-center items-center gap-2 mb-stack-gap-lg">
            <div className="h-2 w-2 rounded-full bg-primary/20" />
            <div className="h-2 w-2 rounded-full bg-primary/20" />
            <div className="h-2 w-8 rounded-full bg-primary" />
          </div>

          {/* Form Card */}
          <div className="glass-card p-stack-gap-lg rounded-[24px] shadow-[0px_20px_40px_rgba(0,0,0,0.04)]">
            <form className="space-y-stack-gap-lg" onSubmit={handleSubmit}>
              <div className="space-y-stack-gap-sm">
                <PasswordField
                  id="password"
                  label="새 비밀번호"
                  placeholder="최소 12자"
                  value={password}
                  onChange={setPassword}
                />
                {/* Strength Meter */}
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-caption font-caption text-on-surface-variant">보안 강도</span>
                    <span className="text-caption font-caption text-secondary font-bold">
                      {strength.label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-full flex-1 rounded-full ${
                          i < strength.score ? 'bg-secondary' : 'bg-outline-variant'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <PasswordField
                id="confirm-password"
                label="비밀번호 확인"
                placeholder="비밀번호를 다시 입력하세요"
                value={confirm}
                onChange={setConfirm}
              />

              {/* Guidelines */}
              <div className="bg-surface-container p-4 rounded-xl space-y-2">
                <div className="flex items-start gap-3">
                  <span
                    className="material-symbols-outlined text-secondary text-[18px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  <p className="font-caption text-caption text-on-surface-variant">
                    최소 하나의 대문자와 하나의 특수 문자를 포함해야 합니다.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span
                    className="material-symbols-outlined text-secondary text-[18px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  <p className="font-caption text-caption text-on-surface-variant">
                    "123"이나 "password"와 같은 흔한 패턴은 피하세요.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full bg-primary hover:bg-primary-container text-on-primary font-body-lg text-body-lg py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
              >
                비밀번호 변경
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </form>
          </div>

          <p className="mt-stack-gap-lg text-center font-body-md text-body-md text-on-surface-variant">
            도움이 더 필요하신가요?{' '}
            <a className="text-primary font-bold hover:underline decoration-2 underline-offset-4" href="#">
              고객 센터
            </a>
          </p>
        </div>
      </main>

      <Toast {...toast} shape="rounded" />
    </div>
  );
}
