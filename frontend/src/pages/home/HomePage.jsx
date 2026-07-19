import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../../api/homeApi';
import BottomNav from '../../components/BottomNav';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

/**
 * home_home_001_2 — 홈 대시보드 (/home)
 * HOME-01 1회 호출로 정리 제안 + 최근 문서 + 카테고리 요약. AI 검색 바 → /search?q=.
 * recentItems/categories 는 ITEM-03/ITEM-14 형태 참조. 저장일 상대시간 표기는 프론트 책임.
 */
function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return '방금 전';
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d === 1) return '어제';
  return `${d}일 전`;
}

// 정리 제안 유형별 스타일 (HOME-01 suggestions[].type)
const SUGGESTION_STYLE = {
  DUPLICATE_PHOTOS: { icon: 'content_copy', box: 'bg-primary-container/5 border-primary/5', accent: 'text-primary' },
  EXPIRING_ITEMS: { icon: 'notification_important', box: 'bg-tertiary-fixed/10 border-tertiary-fixed/20', accent: 'text-tertiary' },
};
const DEFAULT_SUGGESTION = { icon: 'lightbulb', box: 'bg-surface-container-low border-outline-variant/20', accent: 'text-primary' };

// 카테고리 이름 → 아이콘/색 매핑 (문구·아이콘은 프론트 책임, 서버는 {name, itemCount}만 반환)
const CATEGORY_STYLE = {
  쿠폰: { icon: 'confirmation_number', box: 'bg-primary/10', fg: 'text-primary' },
  영수증: { icon: 'receipt_long', box: 'bg-secondary-container/30', fg: 'text-on-secondary-container' },
  여행: { icon: 'flight_takeoff', box: 'bg-on-tertiary-container/30', fg: 'text-tertiary' },
  쇼핑: { icon: 'shopping_bag', box: 'bg-on-primary-container/30', fg: 'text-primary-fixed-variant' },
};
const DEFAULT_CATEGORY = { icon: 'folder', box: 'bg-surface-container', fg: 'text-primary' };

function categorySubtitle(c) {
  if (c.name === '여행') return `${c.itemCount}개 프로젝트`;
  if (c.name === '쇼핑') return `스크랩 ${c.itemCount}건`;
  return `${c.itemCount}개 저장됨`;
}

function RecentCard({ it, onOpen }) {
  const badge = it.expiringSoon
    ? { text: it.expiryDate ? `D-${Math.max(0, Math.ceil((new Date(it.expiryDate) - Date.now()) / 86400000))} 만료` : '만료 임박', cls: '' }
    : null;
  return (
    <div
      onClick={() => onOpen(it)}
      className="min-w-[160px] max-w-[160px] bg-surface rounded-xl overflow-hidden shadow-sm border border-outline-variant/10 flex-shrink-0 transition-transform active:scale-95 duration-100 cursor-pointer"
    >
      <div className="h-32 bg-surface-container-low relative flex items-center justify-center">
        {it.thumbnailUrl ? (
          <img className="w-full h-full object-cover" alt={it.title} src={it.thumbnailUrl} />
        ) : (
          <span className="material-symbols-outlined text-outline text-4xl">{it.type === 'LINK' ? 'link' : 'description'}</span>
        )}
        {it.category && (
          <div className="absolute top-2 left-2 bg-on-background/60 backdrop-blur-md px-2 py-0.5 rounded-full">
            <span className="text-[10px] text-white font-label-caps">{it.category}</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-body-md text-body-md truncate font-medium">{it.title}</p>
        <p className="font-caption text-caption text-outline">{badge ? badge.text : it.sourceApp || relativeTime(it.savedAt)}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [data, setData] = useState({ suggestions: [], recentItems: [], categories: [] });
  const [q, setQ] = useState('');
  const searchInput = useRef(null);

  useEffect(() => {
    let alive = true;
    getDashboard(10)
      .then((d) => alive && setData(d))
      .catch((e) => alive && show(e.message || '홈을 불러오지 못했습니다.', { icon: 'error' }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    const query = q.trim();
    if (query) navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="bg-background text-on-surface min-h-screen pb-32">
      {/* Top App Bar */}
      <header className="bg-surface/80 backdrop-blur-md flex justify-between items-center w-full px-container-padding h-16 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary-container/20 flex items-center justify-center border border-outline-variant/30 text-primary">
            <span className="material-symbols-outlined">person</span>
          </div>
          <h1 className="font-display-lg text-display-lg font-bold text-primary">Sortmate</h1>
        </div>
        <button onClick={() => searchInput.current?.focus()} className="material-symbols-outlined text-primary hover:opacity-80 transition-opacity p-2">
          search
        </button>
      </header>

      <main className="px-container-padding pt-4 space-y-stack-gap-lg">
        {/* AI Search Bar */}
        <section className="relative">
          <form onSubmit={submitSearch} className="relative flex items-center group">
            <div className="absolute left-4 text-outline material-symbols-outlined pointer-events-none">auto_awesome</div>
            <input
              ref={searchInput}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-full font-body-lg text-body-lg text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              placeholder="지난달 저장한 와이파이 비번 알려줘"
              type="text"
            />
          </form>
        </section>

        {/* Proactive Suggestions (없으면 섹션 숨김) */}
        {data.suggestions.length > 0 && (
          <section>
            <h2 className="font-headline-sm text-headline-sm mb-4">정리 제안</h2>
            <div className="bg-surface rounded-xl p-5 shadow-[0px_10px_20px_rgba(0,0,0,0.02),0px_2px_4px_rgba(0,0,0,0.05)] border border-outline-variant/10 space-y-4">
              {data.suggestions.map((s) => {
                const st = SUGGESTION_STYLE[s.type] || DEFAULT_SUGGESTION;
                return (
                  <div key={s.type} className={`flex items-center justify-between p-3 rounded-lg border ${st.box}`}>
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined ${st.accent}`}>{st.icon}</span>
                      <span className="font-body-md text-body-md font-medium">{s.title}</span>
                    </div>
                    <button onClick={() => navigate(s.actionRoute)} className={`${st.accent} font-label-caps text-label-caps hover:underline`}>
                      {s.actionLabel}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Recent Captures */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-headline-sm text-headline-sm">최근 문서</h2>
            <button onClick={() => navigate('/library')} className="text-primary font-label-caps text-label-caps">전체보기</button>
          </div>
          <div className="flex gap-grid-gutter overflow-x-auto no-scrollbar pb-2 -mx-5 px-5">
            {data.recentItems.map((it) => (
              <RecentCard key={it.id} it={it} onOpen={(x) => navigate(`/items/${x.id}`)} />
            ))}
          </div>
        </section>

        {/* Category Grid */}
        <section>
          <h2 className="font-headline-sm text-headline-sm mb-4">카테고리</h2>
          <div className="grid grid-cols-2 gap-4">
            {data.categories.map((c) => {
              const st = CATEGORY_STYLE[c.name] || DEFAULT_CATEGORY;
              return (
                <button
                  key={c.name}
                  onClick={() => navigate(`/library?category=${encodeURIComponent(c.name)}`)}
                  className="p-5 bg-surface rounded-xl shadow-sm border border-outline-variant/10 flex flex-col gap-3 text-left active:scale-[0.98] transition-transform"
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${st.box}`}>
                    <span className={`material-symbols-outlined ${st.fg}`}>{st.icon}</span>
                  </div>
                  <div>
                    <span className="font-body-lg text-body-lg font-semibold">{c.name}</span>
                    <p className="font-caption text-caption text-outline">{categorySubtitle(c)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      {/* FAB */}
      <button
        onClick={() => navigate('/items/new-memo')}
        className="fixed right-6 bottom-28 w-14 h-14 rounded-full bg-primary text-on-primary shadow-[0_10px_20px_rgba(53,37,205,0.3)] flex items-center justify-center z-50 active:scale-95 transition-transform"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

      <BottomNav active="home" />
      <Toast {...toast} shape="rounded" />
    </div>
  );
}
