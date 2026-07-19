import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard, getUsers, exportUsersCsv } from '../../api/adminApi';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';
import formatBytes from '../../lib/formatBytes';

/**
 * admin_member_cs_management_adm_003_2 — 회원 관리 (/admin/members)
 * 상단 KPI(ADM-01 공용) + 회원 목록(ADM-02) + CSV 내보내기(ADM-03) + 페이지네이션.
 * 관리자 전용 사이드바 탭(대시보드/회원/CS/보안/설정) — 설계에 있는 탭만. 미설계 하위화면(CS/보안/설정)은 안내 stub.
 */
const STATUS_BADGE = {
  ACTIVE: { label: '활성', cls: 'bg-secondary-container text-on-secondary-container' },
  DORMANT: { label: '휴면', cls: 'bg-tertiary-fixed text-on-tertiary-fixed' },
  PENDING: { label: '대기', cls: 'bg-amber-100 text-amber-700' },
};

const NAV = [
  { key: 'dashboard', icon: 'dashboard', label: '대시보드', to: '/admin/dashboard' },
  { key: 'members', icon: 'group', label: '회원 관리', to: '/admin/members' },
  { key: 'cs', icon: 'support_agent', label: 'CS 관리', stub: true },
  { key: 'security', icon: 'security', label: '보안 로그', stub: true },
  { key: 'settings', icon: 'settings', label: '시스템 설정', stub: true },
];

const barColor = (p) => (p < 50 ? 'bg-secondary' : p < 80 ? 'bg-primary' : 'bg-error');
const fmtDate = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10).replace(/-/g, '.') : '');

export default function AdminMembersPage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [kpi, setKpi] = useState(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getDashboard().then(setKpi).catch(() => {});
  }, []);

  useEffect(() => {
    getUsers({ q: q || undefined, page, size: 10 })
      .then(setData)
      .catch((e) => show(e.message || '회원 목록을 불러오지 못했습니다.', { icon: 'error' }));
  }, [q, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const onStub = (label) => show(`${label} 화면은 준비 중입니다.`, { icon: 'info' });

  const onExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportUsersCsv({ q: q || undefined });
      show('CSV 내보내기를 시작했습니다.', { icon: 'download' });
    } catch (e) {
      show(e.message || 'CSV 내보내기 실패', { icon: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const items = data?.items || [];
  const totalPages = data?.totalPages || 1;

  const NavLink = ({ item }) => {
    const active = item.key === 'members';
    return (
      <a
        onClick={() => (item.stub ? onStub(item.label) : navigate(item.to))}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium cursor-pointer transition-colors ${
          active ? 'sidebar-item-active shadow-lg shadow-indigo-100' : 'text-on-surface-variant hover:bg-surface-container'
        }`}
      >
        <span className="material-symbols-outlined" style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>{item.icon}</span>
        <span>{item.label}</span>
      </a>
    );
  };

  return (
    <div className="h-screen w-full flex bg-bg-secondary text-on-surface overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-surface-border flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center px-6 mb-6">
          <span className="font-headline-md text-headline-md font-extrabold text-primary tracking-tight">Sortmate Admin</span>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          {NAV.map((item) => <NavLink key={item.key} item={item} />)}
        </nav>
        <div className="p-4 border-t border-surface-border">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold">A</div>
            <div className="flex flex-col">
              <span className="text-body-md font-semibold">관리자 마스터</span>
              <span className="text-caption text-text-muted">admin@sortmate.app</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-16 flex items-center justify-between px-container-padding bg-white shadow-sm z-10 shrink-0">
          <h1 className="font-headline-sm text-headline-sm font-semibold">회원 관리</h1>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input
                value={q}
                onChange={(e) => { setPage(0); setQ(e.target.value); }}
                className="pl-10 pr-4 py-2 bg-surface-container-lowest border border-surface-border rounded-full w-64 text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="회원 이름, 이메일 검색..."
                type="text"
              />
            </div>
            <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold border border-surface-border">A</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-container-padding space-y-stack-gap-lg pb-24">
          {/* KPI cards (ADM-01 공용) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-grid-gutter">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-surface-border flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <span className="p-2 bg-primary-fixed text-primary rounded-lg"><span className="material-symbols-outlined">groups</span></span>
                <span className="text-on-secondary-container bg-secondary-container px-2 py-0.5 rounded-full text-[10px] font-bold">+{kpi?.totalUsersDeltaPercent ?? 0}%</span>
              </div>
              <div><p className="text-caption text-text-muted mb-1">총 회원 수</p><h3 className="text-headline-md font-bold tracking-tight">{(kpi?.totalUsers ?? 0).toLocaleString()}</h3></div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-surface-border flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <span className="p-2 bg-secondary-fixed text-secondary rounded-lg"><span className="material-symbols-outlined">sensors</span></span>
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-secondary rounded-full animate-pulse"></span><span className="text-caption text-secondary font-medium">실시간</span></div>
              </div>
              <div><p className="text-caption text-text-muted mb-1">활성 세션</p><h3 className="text-headline-md font-bold tracking-tight">{(kpi?.activeSessions ?? 0).toLocaleString()}</h3></div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-surface-border flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <span className="p-2 bg-error-container text-error rounded-lg"><span className="material-symbols-outlined">priority_high</span></span>
                <span className="text-error font-semibold text-caption">긴급 {kpi?.urgentCs ?? 0}건</span>
              </div>
              <div><p className="text-caption text-text-muted mb-1">미처리 CS</p><h3 className="text-headline-md font-bold tracking-tight">{kpi?.unresolvedCs ?? 0}</h3></div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-surface-border flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <span className="p-2 bg-surface-container-highest text-on-surface-variant rounded-lg"><span className="material-symbols-outlined">check_circle</span></span>
              </div>
              <div><p className="text-caption text-text-muted mb-1">시스템 상태</p><h3 className="text-headline-md font-bold tracking-tight text-secondary">{kpi?.serverStatus === 'CRITICAL' ? '위험 (Critical)' : kpi?.serverStatus === 'WARNING' ? '주의 (Warning)' : '정상 (Normal)'}</h3></div>
            </div>
          </div>

          {/* Member list */}
          <div className="bg-white rounded-xl shadow-sm border border-surface-border overflow-hidden">
            <div className="p-6 border-b border-surface-border flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-headline-sm text-headline-sm font-bold">회원 목록 관리</h2>
              <div className="flex items-center gap-3">
                <button onClick={() => onStub('필터')} className="flex items-center gap-2 px-4 py-2 bg-surface border border-surface-border rounded-lg text-body-md font-medium hover:bg-surface-container transition-colors">
                  <span className="material-symbols-outlined text-[20px]">filter_list</span>필터
                </button>
                <button onClick={onExport} disabled={exporting} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-body-md font-medium shadow-lg shadow-indigo-100 hover:opacity-90 transition-opacity disabled:opacity-60">
                  <span className="material-symbols-outlined text-[20px]">download</span>{exporting ? '내보내는 중…' : 'CSV 내보내기'}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface text-caption font-semibold text-text-muted uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 border-b border-surface-border">회원 정보</th>
                    <th className="px-6 py-4 border-b border-surface-border">이메일</th>
                    <th className="px-6 py-4 border-b border-surface-border">가입일</th>
                    <th className="px-6 py-4 border-b border-surface-border">저장공간 사용량</th>
                    <th className="px-6 py-4 border-b border-surface-border">상태</th>
                    <th className="px-6 py-4 border-b border-surface-border text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="text-body-md divide-y divide-slate-50">
                  {items.map((u) => {
                    const badge = STATUS_BADGE[u.status] || STATUS_BADGE.ACTIVE;
                    const p = u.storagePercent ?? 0;
                    return (
                      <tr key={u.id} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-primary font-bold">{u.displayName.slice(0, 1)}</div>
                            <span className="font-semibold">{u.displayName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-text-muted">{u.email}</td>
                        <td className="px-6 py-4 text-text-muted">{fmtDate(u.joinedAt)}</td>
                        <td className="px-6 py-4">
                          <div className="w-48">
                            <div className="flex justify-between text-[10px] mb-1">
                              <span>{formatBytes(u.storageUsedBytes)} / {formatBytes(u.storageQuotaBytes)}</span>
                              <span className={`font-bold ${p >= 80 ? 'text-error' : 'text-primary'}`}>{p}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${barColor(p)}`} style={{ width: `${Math.min(p, 100)}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${badge.cls}`}>{badge.label}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => onStub('회원 상세')} className="p-2 text-outline hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">more_vert</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-10 text-center text-text-muted">검색 결과가 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="px-6 py-4 bg-surface border-t border-surface-border flex items-center justify-between">
              <span className="text-caption text-text-muted">전체 {(data?.totalElements ?? 0).toLocaleString()}명 중 {items.length ? page * 10 + 1 : 0}-{page * 10 + items.length} 표시</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-border bg-white text-outline hover:text-primary transition-colors disabled:opacity-40">
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <span className="px-3 h-8 flex items-center justify-center rounded-lg bg-primary text-white text-body-md font-bold">{page + 1}</span>
                <span className="text-caption text-text-muted">/ {totalPages.toLocaleString()}</span>
                <button onClick={() => setPage((p) => (data?.hasNext ? p + 1 : p))} disabled={!data?.hasNext} className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-border bg-white text-outline hover:text-primary transition-colors disabled:opacity-40">
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* FAB (CS) */}
        <div className="fixed bottom-8 right-8 z-50">
          <button onClick={() => onStub('CS 관리')} className="w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center relative hover:scale-105 active:scale-95 transition-transform duration-200">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat_bubble</span>
            {kpi?.urgentCs ? <span className="absolute -top-1 -right-1 w-6 h-6 bg-error text-white text-[11px] font-bold rounded-full flex items-center justify-center ring-4 ring-white">{kpi.urgentCs}</span> : null}
          </button>
        </div>
      </main>

      {/* Mobile bottom nav (admin tabs) */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-surface-border grid grid-cols-5 h-16 px-2 z-50">
        {NAV.map((item) => {
          const active = item.key === 'members';
          return (
            <a key={item.key} onClick={() => (item.stub ? onStub(item.label) : navigate(item.to))}
              className={`flex flex-col items-center justify-center cursor-pointer ${active ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
              <span className="material-symbols-outlined text-[24px]" style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>{item.icon}</span>
              <span className="text-[10px]">{item.key === 'members' ? '회원' : item.key === 'cs' ? 'CS' : item.key === 'security' ? '보안' : item.key === 'settings' ? '설정' : '대시보드'}</span>
            </a>
          );
        })}
      </div>
      <Toast {...toast} />
    </div>
  );
}
