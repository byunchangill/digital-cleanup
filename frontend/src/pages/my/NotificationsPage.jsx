import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listNotifications, readNotifications } from '../../api/myApi';
import BottomNav from '../../components/BottomNav';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

/**
 * notifications_my_004 — 알림 인박스 (/my/notifications)
 * MY-01 조회(카테고리 필터) + MY-02 읽음 처리(카드 탭). 시간 그룹(오늘/이번 주)은 createdAt으로 프론트 분류.
 */
const TABS = [
  { key: null, label: '전체' },
  { key: 'AI_ANALYSIS', label: 'AI 분석' },
  { key: 'SYSTEM', label: '시스템 관리' },
  { key: 'BENEFIT', label: '혜택' },
];

// 카테고리별 아이콘/색 (화면 디자인의 시각 매핑)
const STYLE = {
  AI_ANALYSIS: { icon: 'psychology', box: 'bg-primary-container/10', text: 'text-primary' },
  SYSTEM: { icon: 'security', box: 'bg-surface-variant/30', text: 'text-outline' },
  BENEFIT: { icon: 'timer', box: 'bg-error-container/20', text: 'text-error' },
};

const DAY = 24 * 3600 * 1000;

function relTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 3600 * 1000) return `${Math.max(1, Math.floor(diff / 60000))}분 전`;
  if (diff < DAY) return `${Math.floor(diff / (3600 * 1000))}시간 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { weekday: 'long' });
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [tab, setTab] = useState(null);
  const [data, setData] = useState(null);

  const load = (category) =>
    listNotifications(category ? { category } : {})
      .then(setData)
      .catch((e) => show(e.message || '불러오지 못했습니다.', { icon: 'error' }));

  useEffect(() => {
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const onCardTap = async (n) => {
    if (!n.read) {
      try {
        await readNotifications({ ids: [n.id] });
        setData((d) => d && { ...d, notifications: d.notifications.map((x) => (x.id === n.id ? { ...x, read: true } : x)), unreadCount: Math.max(0, d.unreadCount - 1) });
      } catch {
        /* 읽음 실패는 무시(선택 기능) */
      }
    }
    if (n.actionRoute) navigate(n.actionRoute);
  };

  const list = data?.notifications || [];
  const today = list.filter((n) => Date.now() - new Date(n.createdAt).getTime() < DAY);
  const thisWeek = list.filter((n) => Date.now() - new Date(n.createdAt).getTime() >= DAY);
  const empty = data && list.length === 0;

  const Card = (n) => {
    const s = STYLE[n.category] || STYLE.SYSTEM;
    return (
      <div
        key={n.id}
        onClick={() => onCardTap(n)}
        className={`group bg-surface-container-lowest rounded-xl p-4 shadow-[0px_2px_4px_rgba(0,0,0,0.05),0px_10px_20px_rgba(0,0,0,0.02)] flex items-start gap-4 active:scale-[0.98] transition-all cursor-pointer border border-transparent hover:border-primary/10 ${n.read ? 'opacity-70' : ''}`}
      >
        <div className={`w-12 h-12 rounded-xl ${s.box} flex items-center justify-center shrink-0`}>
          <span className={`material-symbols-outlined ${s.text}`} style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex justify-between items-start">
            <h3 className="font-body-lg text-body-lg font-semibold text-on-surface">{n.title}</h3>
            <span className="font-caption text-caption text-outline shrink-0 ml-2">{relTime(n.createdAt)}</span>
          </div>
          <p className="text-on-surface-variant text-body-md">{n.body}</p>
          {n.actionLabel && (
            <div className="flex gap-2 mt-2">
              <button className="text-primary font-bold text-body-md hover:underline decoration-2 underline-offset-4">{n.actionLabel}</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen">
      <header className="sticky top-0 z-50 flex justify-between items-center px-container-padding h-16 w-full bg-surface/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/my')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant/50 active:scale-95 transition-transform">
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </button>
          <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface">알림</h1>
        </div>
        {data?.unreadCount > 0 && (
          <button onClick={async () => { await readNotifications({ all: true }); load(tab); show('모든 알림을 읽음 처리했습니다.'); }} className="font-caption text-caption text-primary font-semibold">
            모두 읽음
          </button>
        )}
      </header>

      <main className="pb-24 pt-4 px-container-padding max-w-2xl mx-auto space-y-stack-gap-lg">
        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.label}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2 rounded-full font-body-md whitespace-nowrap active:scale-95 transition-all ${
                tab === t.key ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-variant/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {empty ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-outline text-4xl">notifications_off</span>
            </div>
            <div className="space-y-1">
              <p className="font-headline-sm text-headline-sm text-on-surface">모두 확인했습니다!</p>
              <p className="text-on-surface-variant text-body-md">현재 새로운 알림이 없습니다.</p>
            </div>
          </div>
        ) : (
          <>
            {today.length > 0 && (
              <section className="space-y-stack-gap-md">
                <h2 className="font-label-caps text-label-caps text-outline uppercase tracking-widest">오늘</h2>
                <div className="space-y-3">{today.map(Card)}</div>
              </section>
            )}
            {thisWeek.length > 0 && (
              <section className="space-y-stack-gap-md">
                <h2 className="font-label-caps text-label-caps text-outline uppercase tracking-widest">이번 주</h2>
                <div className="space-y-3">{thisWeek.map(Card)}</div>
              </section>
            )}
          </>
        )}
      </main>

      <BottomNav active="my" />
      <Toast {...toast} shape="rounded" />
    </div>
  );
}
