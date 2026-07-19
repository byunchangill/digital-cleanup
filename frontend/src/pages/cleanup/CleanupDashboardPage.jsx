import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard, runCleanup } from '../../api/cleanupApi';
import BottomNav from '../../components/BottomNav';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';
import formatBytes from '../../lib/formatBytes';

/**
 * cleanup_dashboard_clean_001_2 — 정리 대시보드/허브 (/cleanup)
 * CLEAN-01 조회 + CLEAN-07 FAB "한꺼번에 정리하기". 카드 탭 시 category.actionRoute 로 이동.
 * BottomNav "정리" 탭 활성.
 */
const CIRC = 2 * Math.PI * 58; // 364.4

export default function CleanupDashboardPage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [data, setData] = useState(null);
  const [running, setRunning] = useState(false);

  const load = () =>
    getDashboard()
      .then(setData)
      .catch((e) => show(e.message || '불러오지 못했습니다.', { icon: 'error' }));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRunAll = async () => {
    if (running) return;
    if (!window.confirm('추천 항목을 한꺼번에 휴지통으로 정리할까요? (휴지통에서 되돌릴 수 있어요)')) return;
    setRunning(true);
    try {
      const r = await runCleanup();
      const failed = r.failedIds?.length || 0;
      show(
        failed
          ? `${r.deletedCount}개 정리, ${failed}건 실패 · ${formatBytes(r.savedBytes)} 확보`
          : `${r.deletedCount}개 정리 완료 · ${formatBytes(r.savedBytes)} 확보`,
        { icon: failed ? 'error' : 'check_circle' }
      );
      load();
    } catch (e) {
      show(e.message || '정리 실패', { icon: 'error' });
    } finally {
      setRunning(false);
    }
  };

  const storage = data?.storage;
  const categories = data?.categories || [];
  const byType = (t) => categories.find((c) => c.type === t);
  const dup = byType('DUPLICATE');
  const coupon = byType('EXPIRING_COUPON');
  const shot = byType('UNNECESSARY_SCREENSHOT');
  const insight = data?.optimizationInsight;
  const gaugeOffset = storage ? CIRC * (1 - storage.usedPercent / 100) : CIRC;

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen pb-32">
      {/* Top App Bar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-surface/80 backdrop-blur-md h-16 flex justify-between items-center px-container-padding">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/10 bg-surface-container" />
          <h1 className="font-display-lg text-headline-md font-bold text-primary">Sortmate</h1>
        </div>
        <button onClick={() => navigate('/search')} className="p-2 text-primary hover:opacity-80 transition-opacity active:scale-95 duration-100">
          <span className="material-symbols-outlined">search</span>
        </button>
      </header>

      <main className="pt-24 px-container-padding space-y-stack-gap-lg">
        {/* Storage Usage Summary */}
        <section className="relative overflow-hidden rounded-[32px] p-8 bg-primary-container text-on-primary-container shadow-lg">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-primary/20 rounded-full blur-2xl" />
          <div className="relative z-10 flex flex-col items-center text-center">
            <span className="font-label-caps text-label-caps opacity-80 mb-2 uppercase tracking-widest">저장 공간 분석 완료</span>
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile mb-4">
              {storage ? `${formatBytes(storage.reclaimableBytes)} 절약할 수 있어요` : '분석 중...'}
            </h2>
            <div className="relative w-32 h-32 flex items-center justify-center mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle className="opacity-20" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeWidth="8" />
                <circle cx="64" cy="64" fill="transparent" r="58" stroke="white" strokeDasharray={CIRC} strokeDashoffset={gaugeOffset} strokeLinecap="round" strokeWidth="8" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-headline-md text-headline-md text-white">{storage ? `${storage.usedPercent}%` : '—'}</span>
              </div>
            </div>
            <p className="font-body-md text-white/90">
              {storage ? `사용하지 않는 파일이 전체의 ${storage.unusedPercent}%를 차지합니다.` : ''}
            </p>
          </div>
        </section>

        {/* Cleanup Types Grid (Bento) */}
        <section className="grid grid-cols-2 gap-grid-gutter">
          {/* Large Card: Duplicates */}
          {dup && (
            <button
              onClick={() => navigate(dup.actionRoute)}
              className="text-left col-span-2 bento-card bg-white rounded-[24px] p-6 shadow-[0px_2px_4px_rgba(0,0,0,0.05),0px_10px_20px_rgba(0,0,0,0.02)] border border-surface-border flex flex-col justify-between overflow-hidden relative active:scale-[0.98] transition-transform"
            >
              <div className="relative z-10 w-full">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary-container/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[28px]">grid_view</span>
                  </div>
                  <span className="bg-primary text-white font-label-caps text-label-caps px-3 py-1 rounded-full">{dup.count}건</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-text-main mb-1">{dup.title}</h3>
                <p className="font-body-md text-text-muted">{dup.description}</p>
              </div>
            </button>
          )}

          {/* Medium Card: Coupons */}
          {coupon && (
            <button
              onClick={() => navigate(coupon.actionRoute)}
              className="text-left col-span-1 bento-card bg-white rounded-[24px] p-5 shadow-[0px_2px_4px_rgba(0,0,0,0.05),0px_10px_20px_rgba(0,0,0,0.02)] border border-surface-border flex flex-col h-full active:scale-[0.98] transition-transform"
            >
              <div className="w-10 h-10 rounded-xl bg-tertiary-fixed/30 flex items-center justify-center text-tertiary mb-4">
                <span className="material-symbols-outlined">confirmation_number</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-headline-sm text-[18px] text-text-main">{coupon.title}</h3>
                <span className="text-tertiary font-bold">{coupon.count}건</span>
              </div>
              <p className="font-caption text-text-muted leading-tight">{coupon.description}</p>
              <div className="mt-auto pt-4">
                <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-tertiary w-4/5" />
                </div>
              </div>
            </button>
          )}

          {/* Medium Card: Screenshots */}
          {shot && (
            <button
              onClick={() => navigate(shot.actionRoute)}
              className="text-left col-span-1 bento-card bg-white rounded-[24px] p-5 shadow-[0px_2px_4px_rgba(0,0,0,0.05),0px_10px_20px_rgba(0,0,0,0.02)] border border-surface-border flex flex-col h-full active:scale-[0.98] transition-transform"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary-container/30 flex items-center justify-center text-secondary mb-4">
                <span className="material-symbols-outlined">screenshot</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-headline-sm text-[18px] text-text-main">{shot.title}</h3>
                <span className="text-secondary font-bold">{shot.count}건</span>
              </div>
              <p className="font-caption text-text-muted leading-tight">{shot.description}</p>
              <div className="mt-auto pt-4">
                {shot.scanStatus === 'SCANNING' ? (
                  <div className="flex justify-between items-center text-[10px] text-text-muted font-label-caps">
                    <span>스캔 중...</span>
                    <span className="animate-pulse">●</span>
                  </div>
                ) : (
                  <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-secondary w-full" />
                  </div>
                )}
              </div>
            </button>
          )}

          {/* Bottom Insight Card */}
          {insight && (
            <div className="col-span-2 bento-card bg-surface-container-low rounded-[24px] p-6 border border-white/50 flex items-center gap-4">
              <div className="w-12 h-12 flex-shrink-0 rounded-full bg-white flex items-center justify-center text-primary shadow-sm">
                <span className="material-symbols-outlined">auto_awesome</span>
              </div>
              <div>
                <h4 className="font-body-lg font-bold text-text-main">{insight.title}</h4>
                <p className="font-body-md text-text-muted">{insight.message}</p>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-40 w-full px-container-padding max-w-md">
        <button
          onClick={onRunAll}
          disabled={running}
          className="w-full h-16 bg-primary text-white rounded-full font-headline-sm flex items-center justify-center gap-3 shadow-[0px_8px_24px_rgba(53,37,205,0.3)] active:scale-95 transition-transform disabled:opacity-70"
        >
          <span className={`material-symbols-outlined ${running ? 'animate-spin' : ''}`}>{running ? 'sync' : 'auto_delete'}</span>
          {running ? '정리 중...' : '한꺼번에 정리하기'}
        </button>
      </div>

      <BottomNav active="cleanup" />
      <Toast {...toast} shape="rounded" />
    </div>
  );
}
