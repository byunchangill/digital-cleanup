import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlans, upgradePlan, restorePurchase } from '../../api/myApi';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

/**
 * plan_comparison_upgrade_my_008_2 — 플랜 비교/업그레이드 (/my/plan)
 * MY-08 조회 + MY-09 업그레이드(결제 stub, 즉시 ACTIVE) + MY-10 구매 복원(stub).
 */
const PRICE = (p) => (p.priceMonthly === 0 ? '월 0원' : `월 ₩${p.priceMonthly.toLocaleString()}`);

export default function PlanPage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => getPlans().then(setData).catch((e) => show(e.message || '플랜을 불러오지 못했습니다.', { icon: 'error' }));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const free = data?.plans.find((p) => p.id === 'FREE');
  const premium = data?.plans.find((p) => p.id === 'PREMIUM');
  const isPremium = data?.currentPlanId === 'PREMIUM';

  const onUpgrade = async () => {
    if (isPremium) { show('이미 프리미엄 플랜을 사용 중입니다.'); return; }
    setBusy(true);
    try {
      const r = await upgradePlan('PREMIUM');
      show(r.stub ? '프리미엄으로 업그레이드되었습니다. (데모)' : '업그레이드되었습니다.', { icon: 'check_circle' });
      load();
    } catch (e) {
      show(e.message || '업그레이드에 실패했습니다.', { icon: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    try {
      const r = await restorePurchase();
      show(r.restored ? '구매를 복원했습니다.' : '복원할 구매 내역이 없습니다.');
    } catch (e) {
      show(e.message || '복원에 실패했습니다.', { icon: 'error' });
    }
  };

  return (
    <div className="bg-background text-on-surface min-h-screen pb-24 font-body-md">
      <nav className="flex justify-between items-center px-container-padding h-16 w-full sticky top-0 bg-surface/80 backdrop-blur-md z-50">
        <button onClick={() => navigate('/my')} className="w-10 h-10 flex items-center justify-center hover:bg-surface-container-low rounded-full transition-colors active:scale-95">
          <span className="material-symbols-outlined text-on-surface-variant">close</span>
        </button>
        <span className="font-headline-sm text-headline-sm text-on-surface">플랜 선택</span>
        <div className="w-10" />
      </nav>

      <main className="px-container-padding pt-6 flex flex-col gap-stack-gap-lg max-w-2xl mx-auto">
        <header className="text-center flex flex-col gap-stack-gap-sm">
          <h1 className="font-display-lg text-display-lg text-primary">더 많은 혜택을 누리세요</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">지능형 큐레이션과 선제적인 보안의 모든 기능을 경험해 보세요.</p>
        </header>

        {data && (
          <div className="flex flex-col gap-stack-gap-md lg:grid lg:grid-cols-2 lg:items-stretch">
            {/* Free */}
            <section className="bg-surface-container-lowest border border-surface-border rounded-xl p-6 flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">{free?.isCurrent ? '현재 플랜' : free?.name}</span>
                <h2 className="font-headline-md text-headline-md text-on-surface">{free?.name}</h2>
              </div>
              <ul className="flex flex-col gap-4 flex-grow">
                {free?.features.map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary text-[20px]">check_circle</span>
                    <span className="font-body-md text-body-md text-on-surface-variant">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-4 mt-auto">
                <p className="font-headline-sm text-headline-sm text-on-surface-variant opacity-50">{PRICE(free || { priceMonthly: 0 })}</p>
              </div>
            </section>

            {/* Premium */}
            <section className="relative bg-primary text-on-primary rounded-xl p-6 flex flex-col gap-6 shadow-[0px_2px_4px_rgba(53,37,205,0.1),0px_10px_24px_rgba(53,37,205,0.08)] border-2 border-primary">
              {premium?.badge && (
                <div className="absolute -top-3 right-6 bg-tertiary-fixed text-on-tertiary-fixed px-3 py-1 rounded-full font-label-caps text-[10px] font-bold shadow-sm">{premium.badge}</div>
              )}
              <div className="flex flex-col gap-1">
                <span className="font-label-caps text-label-caps text-primary-fixed-dim uppercase tracking-wider">{premium?.isCurrent ? '현재 플랜' : '모든 권한'}</span>
                <h2 className="font-headline-md text-headline-md text-white">{premium?.name}</h2>
              </div>
              <ul className="flex flex-col gap-4 flex-grow">
                {premium?.features.map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary-container text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="font-body-md text-body-md text-primary-fixed">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-4 flex items-baseline gap-1">
                <span className="font-display-lg text-display-lg text-white">{PRICE(premium || { priceMonthly: 0 })}</span>
              </div>
            </section>
          </div>
        )}

        <div className="flex flex-col gap-stack-gap-md mt-4">
          <button
            onClick={onUpgrade}
            disabled={busy || isPremium}
            className="bg-primary text-white w-full py-4 rounded-xl font-headline-sm text-headline-sm shadow-[0_4px_12px_rgba(53,37,205,0.3)] active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isPremium ? '이용 중인 플랜입니다' : busy ? '처리 중...' : '지금 업그레이드'}
            {!isPremium && <span className={`material-symbols-outlined ${busy ? 'animate-spin' : ''}`}>{busy ? 'sync' : 'arrow_forward'}</span>}
          </button>
          <button onClick={onRestore} className="text-primary font-body-md text-body-md text-center py-2 hover:underline transition-all">구매 복원</button>
        </div>

        <footer className="flex justify-center items-center gap-6 py-8 opacity-40 grayscale">
          <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">lock</span><span className="font-label-caps text-[10px]">보안 SSL</span></div>
          <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">payment</span><span className="font-label-caps text-[10px]">간편 결제</span></div>
          <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">verified</span><span className="font-label-caps text-[10px]">ISO 인증</span></div>
        </footer>
      </main>
      <Toast {...toast} shape="rounded" />
    </div>
  );
}
