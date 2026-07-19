import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestAccountDeletion } from '../../api/vaultApi';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

/**
 * account_deletion_confirmation_my_009_2 — 계정 삭제 확인 (/my/delete-account)
 * VAULT-07 재사용(신규 엔드포인트 없음). 동의 체크박스 → "계정 탈퇴" → requestAccountDeletion({confirm:true}).
 * 30일 유예/재로그인 취소는 화면 고정 카피(gracePeriodDays 서버 미반환 → [가정] 30 하드코딩).
 */
const GRACE_DAYS = 30;

const NOTES = [
  { icon: 'delete_forever', box: 'bg-surface-container', text: 'text-primary', title: '데이터 영구 삭제', body: '저장된 모든 스크린샷, 라이브러리 및 AI 태그가 서버에서 완전히 삭제됩니다.' },
  { icon: 'calendar_today', box: 'bg-secondary-container', text: 'text-on-secondary-container', title: `${GRACE_DAYS}일 유예 기간`, body: `계정은 ${GRACE_DAYS}일 동안 비활성화됩니다. 해당 기간 내에 다시 로그인하면 언제든지 탈퇴를 취소할 수 있습니다.` },
  { icon: 'unsubscribe', box: 'bg-tertiary-fixed-dim/30', text: 'text-tertiary', title: '구독 및 결제', body: '활성화된 프리미엄 구독이 종료됩니다. 앱 스토어를 통해 수동으로 구독을 해지하는 것을 권장합니다.' },
];

export default function AccountDeletePage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  const onDelete = async () => {
    if (!agreed || busy) return;
    setBusy(true);
    try {
      await requestAccountDeletion();
      show(`계정 탈퇴가 접수되었습니다. ${GRACE_DAYS}일 내 재로그인 시 취소할 수 있습니다.`, { icon: 'check_circle' });
      setTimeout(() => navigate('/login'), 1500);
    } catch (e) {
      show(e.message || '요청에 실패했습니다.', { icon: 'error' });
      setBusy(false);
    }
  };

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col items-center font-body-md">
      <header className="w-full sticky top-0 z-50 bg-surface/80 backdrop-blur-md flex justify-between items-center px-container-padding h-16">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-surface-container-low rounded-full transition-colors active:scale-95">
          <span className="material-symbols-outlined text-on-surface">arrow_back</span>
        </button>
        <span className="font-display-lg text-headline-sm font-bold text-primary">Sortmate</span>
        <div className="w-10" />
      </header>

      <main className="max-w-md w-full px-container-padding flex-1 py-stack-gap-lg">
        <div className="flex justify-center mb-stack-gap-lg">
          <div className="w-24 h-24 rounded-full bg-error-container flex items-center justify-center animate-pulse">
            <span className="material-symbols-outlined text-error text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          </div>
        </div>

        <div className="text-center mb-stack-gap-lg">
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile mb-2">계정을 탈퇴하시겠습니까?</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">이 작업은 영구적이며 유예 기간이 지나면 되돌릴 수 없습니다.</p>
        </div>

        <div className="space-y-grid-gutter mb-stack-gap-lg">
          {NOTES.map((n) => (
            <div key={n.title} className="bg-bg-primary p-5 rounded-2xl shadow-[0px_2px_4px_rgba(0,0,0,0.05),0px_10px_20px_rgba(0,0,0,0.02)] flex gap-4 border border-surface-border">
              <div className={`w-10 h-10 rounded-xl ${n.box} flex items-center justify-center shrink-0`}>
                <span className={`material-symbols-outlined ${n.text}`}>{n.icon}</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm mb-1">{n.title}</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">{n.body}</p>
              </div>
            </div>
          ))}
        </div>

        <label className="flex items-start gap-3 p-4 bg-surface-container-low rounded-xl mb-stack-gap-lg cursor-pointer transition-colors hover:bg-surface-container-high">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-6 h-6 rounded border-outline text-primary focus:ring-primary mt-0.5"
          />
          <span className="font-body-md text-body-md text-on-surface-variant select-none">
            {GRACE_DAYS}일 후 계정 및 모든 관련 데이터가 <span className="font-bold text-error">영구적으로 삭제</span>되며 복구할 수 없음을 이해했습니다.
          </span>
        </label>

        <div className="flex flex-col gap-3">
          <button
            onClick={onDelete}
            disabled={!agreed || busy}
            className={`w-full py-4 rounded-xl font-headline-sm text-headline-sm transition-all duration-300 ${
              agreed && !busy ? 'bg-error text-white shadow-lg active:scale-[0.98]' : 'bg-outline text-white opacity-50 cursor-not-allowed'
            }`}
          >
            {busy ? '처리 중...' : '계정 탈퇴'}
          </button>
          <button onClick={() => navigate(-1)} className="w-full py-4 bg-bg-primary text-primary border-2 border-primary rounded-xl font-headline-sm text-headline-sm hover:bg-surface-container-low transition-all active:scale-[0.98]">
            계정 유지
          </button>
        </div>

        <div className="mt-stack-gap-lg flex items-center justify-center gap-2 opacity-60">
          <span className="material-symbols-outlined text-body-md">lock</span>
          <span className="font-label-caps text-label-caps uppercase tracking-widest">안전한 데이터 삭제 프로토콜</span>
        </div>
      </main>
      <Toast {...toast} shape="rounded" />
    </div>
  );
}
