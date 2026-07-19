import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReport } from '../../api/cleanupApi';
import BottomNav from '../../components/BottomNav';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';
import formatBytes from '../../lib/formatBytes';

/**
 * cleanup_report_clean_008_2 — 정리 리포트/요약 (/cleanup/report)
 * CLEAN-08 읽기 전용. 주간 성과 + 누적 통계 + 디지털 위생 점수 + 정리 제안.
 */
const SCORE_CIRC = 2 * Math.PI * 40; // 251.2
const BAR_COLORS = ['bg-primary', 'bg-secondary', 'bg-tertiary-fixed-dim'];
const SUGGESTION_ICON = { OLD_SCREENSHOTS: 'history', LARGE_MEDIA: 'video_library' };

export default function CleanupReportPage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [data, setData] = useState(null);

  useEffect(() => {
    getReport()
      .then(setData)
      .catch((e) => show(e.message || '불러오지 못했습니다.', { icon: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weekly = data?.weekly;
  const cumulative = data?.cumulative;
  const hygiene = data?.hygiene;
  const suggestions = data?.suggestions || [];
  const scoreOffset = hygiene ? SCORE_CIRC * (1 - hygiene.score / 100) : SCORE_CIRC;

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex flex-col pb-32">
      {/* Top App Bar */}
      <header className="w-full top-0 sticky z-50 bg-surface/80 backdrop-blur-md flex justify-between items-center px-container-padding h-16">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-container overflow-hidden" />
          <span className="font-display-lg text-display-lg font-bold text-primary">Sortmate</span>
        </div>
        <button onClick={() => navigate('/search')} className="w-10 h-10 flex items-center justify-center hover:bg-surface-container-low rounded-full transition-colors active:scale-95 duration-150 text-on-surface-variant">
          <span className="material-symbols-outlined">search</span>
        </button>
      </header>

      <main className="flex-1 px-container-padding py-stack-gap-md pb-32 max-w-2xl mx-auto w-full">
        {/* Weekly Banner */}
        {weekly && (
          <section className="relative overflow-hidden rounded-xl bg-primary-container text-white p-6 mb-stack-gap-lg shadow-lg">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                <span className="font-label-caps text-label-caps uppercase">주간 성과</span>
              </div>
              <h2 className="font-headline-lg-mobile text-headline-lg-mobile mb-1">{weekly.message}</h2>
              <p className="font-body-lg text-body-lg opacity-90">이번 주에 {formatBytes(weekly.savedBytes)}를 확보했습니다! 디지털 공간이 그 어느 때보다 가벼워졌어요.</p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-20 animate-float">
              <span className="material-symbols-outlined text-[120px]">delete_sweep</span>
            </div>
          </section>
        )}

        {/* Bento Grid */}
        {cumulative && (
          <div className="grid grid-cols-2 gap-grid-gutter mb-stack-gap-lg">
            {/* Storage Saved */}
            <div className="col-span-2 md:col-span-1 bg-white p-5 rounded-xl shadow-[0px_2px_10px_rgba(0,0,0,0.05)] border border-surface-border flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary mb-4">
                  <span className="material-symbols-outlined">cloud_done</span>
                </div>
                <span className="font-caption text-caption text-on-surface-variant">누적 절약 용량</span>
                <h3 className="font-display-lg text-display-lg text-primary mt-1">{formatBytes(cumulative.savedBytes)}</h3>
              </div>
              <div className="mt-4 flex items-center text-secondary font-label-caps text-[10px]">
                <span className="material-symbols-outlined text-sm mr-1">trending_up</span>
                <span>지난달 대비 {cumulative.savedBytesChangePercent}% 증가</span>
              </div>
            </div>

            {/* Duplicates Removed */}
            <div className="col-span-2 md:col-span-1 bg-white p-5 rounded-xl shadow-[0px_2px_10px_rgba(0,0,0,0.05)] border border-surface-border">
              <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary mb-4">
                <span className="material-symbols-outlined">content_copy</span>
              </div>
              <span className="font-caption text-caption text-on-surface-variant">제거된 중복 자료</span>
              <h3 className="font-display-lg text-display-lg text-primary mt-1">{cumulative.duplicatesRemoved.toLocaleString()}</h3>
            </div>

            {/* Hygiene Score */}
            {hygiene && (
              <div className="col-span-2 bg-white p-6 rounded-xl shadow-[0px_2px_10px_rgba(0,0,0,0.05)] border border-surface-border">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">디지털 위생 점수</h3>
                    <p className="font-caption text-caption text-on-surface-variant">파일 정리 습관에 따른 점수</p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-caps text-label-caps">{hygiene.grade}</div>
                </div>
                <div className="flex flex-col md:flex-row items-center justify-around gap-8">
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle className="text-surface-container stroke-current" cx="50" cy="50" fill="transparent" r="40" strokeWidth="10" />
                      <circle className="text-primary stroke-current" cx="50" cy="50" fill="transparent" r="40" strokeDasharray={SCORE_CIRC} strokeDashoffset={scoreOffset} strokeLinecap="round" strokeWidth="10" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.35s' }} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-display-lg text-display-lg text-on-surface">{hygiene.score}</span>
                      <span className="font-label-caps text-label-caps text-on-surface-variant">위생 지수</span>
                    </div>
                  </div>
                  <div className="flex-1 w-full space-y-4">
                    {hygiene.breakdown.map((b, i) => (
                      <div key={b.key}>
                        <div className="flex justify-between text-caption font-label-caps mb-1">
                          <span>{b.label}</span>
                          <span>{b.percent}%</span>
                        </div>
                        <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                          <div className={`h-full ${BAR_COLORS[i % BAR_COLORS.length]} rounded-full`} style={{ width: `${b.percent}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <section className="space-y-4">
            <h3 className="font-headline-sm text-headline-sm text-on-surface px-1">정리 제안</h3>
            <div className="bg-white rounded-xl shadow-sm border border-surface-border overflow-hidden">
              {suggestions.map((s, i) => (
                <div
                  key={s.type}
                  onClick={() => s.actionRoute && navigate(s.actionRoute)}
                  className={`p-4 flex items-center gap-4 hover:bg-surface-container-low transition-colors ${s.actionRoute ? 'cursor-pointer' : ''} ${i < suggestions.length - 1 ? 'border-b border-surface-border' : ''}`}
                >
                  <div className="w-12 h-12 rounded-lg bg-tertiary-container/10 flex items-center justify-center text-tertiary">
                    <span className="material-symbols-outlined">{SUGGESTION_ICON[s.type] || 'lightbulb'}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-body-lg font-bold text-on-surface">{s.title}</h4>
                    <p className="font-caption text-caption text-on-surface-variant">{s.description}</p>
                  </div>
                  <span className="material-symbols-outlined text-outline">chevron_right</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNav active="cleanup" />
      <Toast {...toast} shape="rounded" />
    </div>
  );
}
