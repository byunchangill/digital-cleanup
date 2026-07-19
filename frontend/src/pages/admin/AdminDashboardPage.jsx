import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../../api/adminApi';
import BottomNav from '../../components/BottomNav';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

/**
 * admin_dashboard_adm_001 — 운영 대시보드 (/admin/dashboard)
 * ADM-01 단일 응답으로 KPI + 최근 가입자 + 문의 요약 + 서버 상태 렌더.
 * 하단 일반 앱 네비게이션(BottomNav) 재사용 — 설계상 홈 탭 강조.
 */
const STATUS_PILL = {
  ACTIVE: { label: 'Active', cls: 'bg-emerald-100 text-emerald-700' },
  PENDING: { label: 'Pending', cls: 'bg-amber-100 text-amber-700' },
  DORMANT: { label: 'Dormant', cls: 'bg-slate-100 text-slate-500' },
};

const PLAN_LABEL = { PREMIUM: 'Premium Plan', BASIC: 'Basic Plan', FREE: 'Free Plan' };

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function initials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [d, setD] = useState(null);

  useEffect(() => {
    getDashboard()
      .then(setD)
      .catch((e) => show(e.message || '불러오지 못했습니다.', { icon: 'error' }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const nf = (n) => (n ?? 0).toLocaleString();

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="bg-surface/80 backdrop-blur-md fixed top-0 left-0 w-full z-50 flex justify-between items-center px-container-padding h-16">
        <div className="flex items-center gap-3">
          <span className="font-display-lg text-display-lg font-bold text-primary">Sortmate</span>
          <span className="font-label-caps text-label-caps text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">ADMIN</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="material-symbols-outlined text-primary hover:opacity-80 transition-opacity">search</button>
          <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold border border-primary/10">A</div>
        </div>
      </header>

      {/* Desktop Side Navigation */}
      <div className="hidden md:flex fixed left-0 top-16 bottom-0 w-20 flex-col items-center py-8 gap-8 bg-surface-container-lowest border-r border-surface-border z-40">
        <span className="material-symbols-outlined text-primary text-[28px] cursor-pointer" style={{ fontVariationSettings: "'FILL' 1" }} title="Dashboard">dashboard</span>
        <span className="material-symbols-outlined text-on-surface-variant text-[28px] cursor-pointer hover:text-primary transition-colors" title="Users" onClick={() => navigate('/admin/members')}>group</span>
        <span className="material-symbols-outlined text-on-surface-variant text-[28px] cursor-pointer hover:text-primary transition-colors" title="Data Analytics" onClick={() => navigate('/admin/quality')}>analytics</span>
        <span className="material-symbols-outlined text-on-surface-variant text-[28px] cursor-pointer hover:text-primary transition-colors" title="Support">help_center</span>
        <span className="mt-auto material-symbols-outlined text-on-surface-variant text-[28px] cursor-pointer hover:text-primary transition-colors" title="Settings">settings</span>
      </div>

      <main className="pt-24 px-container-padding pb-28 max-w-7xl mx-auto md:pl-24">
        <section className="mb-stack-gap-lg">
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-text-main">운영 대시보드</h1>
          <p className="font-body-md text-body-md text-text-muted mt-1">IA Code: ADM-001 | 실시간 플랫폼 현황</p>
        </section>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-grid-gutter mb-stack-gap-lg">
          {/* Total Users */}
          <div className="bg-surface-container-lowest p-6 rounded-xl card-shadow border border-surface-border">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <span className="material-symbols-outlined">group</span>
              </div>
              <span className="font-label-caps text-label-caps text-secondary font-bold">+{d?.totalUsersDeltaPercent ?? 0}%</span>
            </div>
            <p className="font-label-caps text-label-caps text-text-muted uppercase tracking-wider">총 가입자 수</p>
            <h2 className="font-display-lg text-display-lg text-text-main mt-1">{nf(d?.totalUsers)}</h2>
            <div className="w-full bg-surface-container-low h-1.5 rounded-full mt-4 overflow-hidden">
              <div className="bg-primary h-full w-[78%] rounded-full"></div>
            </div>
          </div>
          {/* Saved Today */}
          <div className="bg-surface-container-lowest p-6 rounded-xl card-shadow border border-surface-border">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                <span className="material-symbols-outlined">database</span>
              </div>
              <span className="font-label-caps text-label-caps text-secondary font-bold">+{nf(d?.savedToday)} today</span>
            </div>
            <p className="font-label-caps text-label-caps text-text-muted uppercase tracking-wider">오늘 저장된 자료</p>
            <h2 className="font-display-lg text-display-lg text-text-main mt-1">{nf(d?.totalItems)}</h2>
            <div className="flex gap-1 mt-4 items-end h-8">
              <div className="bg-secondary/40 w-full h-[40%] rounded-sm"></div>
              <div className="bg-secondary/40 w-full h-[60%] rounded-sm"></div>
              <div className="bg-secondary/40 w-full h-[30%] rounded-sm"></div>
              <div className="bg-secondary/40 w-full h-[80%] rounded-sm"></div>
              <div className="bg-secondary w-full h-full rounded-sm"></div>
            </div>
          </div>
          {/* AI Success Rate */}
          <div className="bg-surface-container-lowest p-6 rounded-xl card-shadow border border-surface-border">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-tertiary/10 rounded-lg text-tertiary">
                <span className="material-symbols-outlined">psychology</span>
              </div>
              <div className="flex items-center gap-1 text-tertiary">
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                <span className="font-label-caps text-label-caps font-bold">{d?.aiStatus === 'DEGRADED' ? 'Degraded' : 'Stable'}</span>
              </div>
            </div>
            <p className="font-label-caps text-label-caps text-text-muted uppercase tracking-wider">AI 분석 성공률</p>
            <h2 className="font-display-lg text-display-lg text-text-main mt-1">{d?.aiSuccessRate ?? 0}%</h2>
            <p className="font-caption text-caption text-text-muted mt-4">평균 응답 속도: <span className="text-tertiary font-bold">{((d?.aiAvgResponseMs ?? 0) / 1000).toFixed(1)}s</span></p>
          </div>
        </div>

        {/* Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-grid-gutter mb-stack-gap-lg">
          {/* Recent Subscribers */}
          <div className="lg:col-span-3 bg-surface-container-lowest rounded-xl card-shadow border border-surface-border overflow-hidden">
            <div className="p-5 border-b border-surface-border flex justify-between items-center">
              <h3 className="font-headline-sm text-headline-sm text-text-main">최근 가입자 현황</h3>
              <button onClick={() => navigate('/admin/members')} className="text-primary font-label-caps text-label-caps hover:underline">모두 보기</button>
            </div>
            <div className="divide-y divide-surface-border">
              {(d?.recentSubscribers || []).map((u) => {
                const pill = STATUS_PILL[u.status] || STATUS_PILL.ACTIVE;
                return (
                  <div key={u.id} className="p-4 flex items-center justify-between hover:bg-surface-container-lowest/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center font-bold text-primary">{initials(u.displayName)}</div>
                      <div>
                        <p className="font-body-md text-body-md text-text-main font-semibold">{u.displayName}</p>
                        <p className="font-caption text-caption text-text-muted">{PLAN_LABEL[u.plan] || u.plan} • {relativeTime(u.joinedAt)}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${pill.cls}`}>{pill.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inquiry + Server */}
          <div className="lg:col-span-2 space-y-grid-gutter">
            <div className="bg-surface-container-lowest p-5 rounded-xl card-shadow border border-surface-border">
              <h3 className="font-headline-sm text-headline-sm text-text-main mb-4">문의 내역 요약</h3>
              <div className="space-y-3">
                {(d?.recentInquiries || []).map((q) => {
                  const urgent = q.urgency === 'URGENT';
                  return (
                    <div key={q.id} className={`p-3 rounded-lg flex gap-3 ${urgent ? 'bg-error-container/20 border border-error/10' : 'bg-surface-container-low border border-surface-border'}`}>
                      <span className={`material-symbols-outlined ${urgent ? 'text-error' : 'text-text-muted'}`}>{urgent ? 'priority_high' : 'chat_bubble'}</span>
                      <div>
                        <p className="font-body-md text-body-md text-text-main font-medium">{q.subject}</p>
                        <p className="font-caption text-caption text-text-muted">ID: {q.id} • {urgent ? '긴급' : '일반'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => navigate('/admin/members')} className="w-full mt-4 py-2 bg-primary text-on-primary rounded-lg font-body-md text-body-md hover:opacity-90 transition-all">전체 문의 대응하기</button>
            </div>

            <div className="bg-on-background p-5 rounded-xl card-shadow relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-label-caps text-label-caps text-primary-fixed">서버 상태</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="font-label-caps text-label-caps text-emerald-400">{d?.serverStatus === 'CRITICAL' ? 'Critical' : d?.serverStatus === 'WARNING' ? 'Warning' : 'Normal'}</span>
                  </div>
                </div>
                <div className="text-white">
                  <p className="font-display-lg text-display-lg">{d?.uptimePercent ?? 0}%</p>
                  <p className="font-caption text-caption text-outline-variant mt-1">Uptime (Last 30 Days)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="md:hidden">
        <BottomNav active="home" />
      </div>
      <Toast {...toast} />
    </div>
  );
}
