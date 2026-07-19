import { useEffect, useMemo, useState } from 'react';
import { getClassificationQuality, runValidationPack } from '../../api/adminApi';
import BottomNav from '../../components/BottomNav';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

/**
 * classification_quality_adm_002_2 — 분류 품질 (/admin/quality)
 * ADM-05 정확도 추이(차트) + 오분류 클러스터 + AI 제안. ADM-06 Run Validation Pack(stub 202).
 * 하단 일반 앱 네비게이션(BottomNav) 재사용 — 설계상 정리(Cleanup) 탭 강조.
 */
const BIAS = {
  HIGH: { label: 'High Bias', icon: 'compare_arrows', text: 'text-error', bar: 'bg-error', badge: 'bg-error-container text-on-error-container', iconBg: 'bg-error-container/10' },
  MEDIUM: { label: 'Med Bias', icon: 'image', text: 'text-tertiary', bar: 'bg-tertiary', badge: 'bg-tertiary-fixed text-on-tertiary-fixed-variant', iconBg: 'bg-tertiary-container/10' },
  LOW: { label: 'Low Bias', icon: 'work', text: 'text-secondary', bar: 'bg-secondary', badge: 'bg-secondary-container text-on-secondary-container', iconBg: 'bg-secondary-container/10' },
};

/** trend[{date,accuracy}] → SVG line/area path (viewBox 0 0 400 100, y축 반전). */
function buildPaths(trend) {
  if (!trend || trend.length < 2) return null;
  const acc = trend.map((t) => t.accuracy);
  const min = Math.min(...acc) - 2;
  const max = Math.max(...acc) + 2;
  const span = max - min || 1;
  const pts = trend.map((t, i) => {
    const x = (i / (trend.length - 1)) * 400;
    const y = 90 - ((t.accuracy - min) / span) * 80; // 10..90
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  });
  const line = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = `${line} L400,100 L0,100 Z`;
  const last = pts[pts.length - 1];
  return { line, area, last };
}

export default function ClassificationQualityPage() {
  const { toast, show } = useToast();
  const [range, setRange] = useState('30D');
  const [d, setD] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    getClassificationQuality({ range })
      .then(setD)
      .catch((e) => show(e.message || '불러오지 못했습니다.', { icon: 'error' }));
  }, [range]); // eslint-disable-line react-hooks/exhaustive-deps

  const paths = useMemo(() => buildPaths(d?.trend), [d]);

  const onRun = async () => {
    if (running) return;
    setRunning(true);
    try {
      const r = await runValidationPack();
      show(r.message || '검증 팩 실행이 접수되었습니다.', { icon: 'check_circle' });
    } catch (e) {
      show(e.message || '검증 팩 실행 실패', { icon: 'error' });
    } finally {
      setRunning(false);
    }
  };

  const clusters = d?.clusters || [];
  const suggestion = d?.suggestion;

  return (
    <div className="min-h-screen bg-background text-on-surface pb-32">
      <header className="w-full top-0 sticky z-50 bg-surface/80 backdrop-blur-md flex justify-between items-center px-container-padding h-16">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold">A</div>
          <h1 className="font-headline-sm text-headline-sm text-on-surface">Admin: Quality Control</h1>
        </div>
        <button className="w-10 h-10 flex items-center justify-center hover:bg-surface-container-low rounded-full transition-colors active:scale-95 duration-150">
          <span className="material-symbols-outlined text-on-surface-variant">search</span>
        </button>
      </header>

      <main className="px-container-padding pt-6 space-y-stack-gap-lg">
        {/* Summary */}
        <section className="space-y-stack-gap-sm">
          <div className="flex items-end justify-between">
            <div>
              <span className="font-label-caps text-label-caps text-text-muted uppercase tracking-wider">Metric ID: ADM-002</span>
              <h2 className="font-headline-md text-headline-md text-on-surface">Classification Quality</h2>
            </div>
            <div className="flex items-center gap-1 bg-secondary-container/20 text-on-secondary-container px-3 py-1 rounded-full border border-secondary/10">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
              <span className="font-body-md text-body-md font-bold">+{d?.deltaPercent ?? 0}%</span>
            </div>
          </div>
        </section>

        {/* Chart */}
        <section className="bg-surface-container-lowest rounded-xl p-stack-gap-md card-shadow border border-surface-border">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-body-lg text-body-lg font-bold text-on-surface">AI Categorization Accuracy</h3>
              <p className="font-caption text-caption text-text-muted">Last {range === '90D' ? '90' : '30'} Days (Avg: {d?.avgAccuracy ?? 0}%)</p>
            </div>
            <div className="flex gap-2">
              {['30D', '90D'].map((r) => (
                <button key={r} onClick={() => setRange(r)} className={`px-2 py-1 rounded-lg text-[10px] font-bold ${range === r ? 'bg-surface-container-low text-primary' : 'text-text-muted'}`}>{r}</button>
              ))}
            </div>
          </div>
          <div className="relative h-40 w-full mb-2">
            <svg className="w-full h-full drop-shadow-sm" viewBox="0 0 400 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#3525cd" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#3525cd" stopOpacity="0" />
                </linearGradient>
              </defs>
              {paths && <path d={paths.area} fill="url(#chartFill)" />}
              {paths && <path d={paths.line} fill="none" stroke="#3525cd" strokeLinecap="round" strokeWidth="2.5" />}
              {paths && <circle cx={paths.last[0]} cy={paths.last[1]} fill="#3525cd" r="4" stroke="white" strokeWidth="2" />}
            </svg>
          </div>
          <div className="flex justify-between px-1">
            <span className="font-caption text-[10px] text-text-muted">{d?.trend?.[0]?.date || ''}</span>
            <span className="font-caption text-[10px] text-text-muted">{d?.trend?.[Math.floor((d?.trend?.length || 1) / 2)]?.date || ''}</span>
            <span className="font-caption text-[10px] text-text-muted">Today</span>
          </div>
        </section>

        {/* Misclassified Clusters */}
        <section className="space-y-stack-gap-md">
          <div className="flex justify-between items-center">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Misclassified Clusters</h3>
            <span className="font-caption text-caption text-primary font-bold">View All</span>
          </div>
          <div className="space-y-3">
            {clusters.map((c, i) => {
              const b = BIAS[c.biasLevel] || BIAS.LOW;
              return (
                <div key={i} className="bg-surface-container-lowest p-4 rounded-xl border border-surface-border flex items-center gap-4 transition-transform active:scale-[0.98]">
                  <div className={`w-12 h-12 ${b.iconBg} ${b.text} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <span className="material-symbols-outlined text-[28px]">{b.icon}</span>
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start">
                      <span className="font-body-md text-body-md font-bold text-on-surface">{c.categoryA} <span className="text-text-muted font-normal mx-1">vs</span> {c.categoryB}</span>
                      <span className={`font-label-caps text-[10px] px-2 py-0.5 rounded-full ${b.badge}`}>{b.label}</span>
                    </div>
                    <div className="mt-2 w-full bg-surface-container-low h-1.5 rounded-full overflow-hidden">
                      <div className={`${b.bar} h-full rounded-full`} style={{ width: `${Math.min(c.correctionRate, 100)}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="font-caption text-caption text-text-muted">Correction Rate: <span className="text-on-surface font-semibold">{c.correctionRate}%</span></span>
                      <span className={`font-caption text-caption ${b.text} font-bold`}>{c.eventCount >= 1000 ? `${(c.eventCount / 1000).toFixed(1)}k` : c.eventCount} events</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* AI Suggestion */}
        {suggestion && (
          <section className="bg-primary p-container-padding rounded-2xl text-on-primary relative overflow-hidden shadow-lg shadow-primary/20">
            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">lightbulb</span>
                <span className="font-label-caps text-[10px] uppercase tracking-widest opacity-80">AI Suggestion</span>
              </div>
              <h4 className="font-headline-sm text-headline-sm leading-tight">{suggestion.title}</h4>
              <p className="font-body-md text-body-md opacity-90">{suggestion.detail}</p>
              <button onClick={onRun} disabled={running} className="mt-4 bg-on-primary text-primary font-bold py-3 rounded-xl active:scale-[0.97] transition-transform disabled:opacity-70">
                {running ? '실행 접수 중…' : 'Run Validation Pack'}
              </button>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-on-primary-container rounded-full opacity-10"></div>
          </section>
        )}
      </main>

      <BottomNav active="cleanup" />
      <Toast {...toast} />
    </div>
  );
}
