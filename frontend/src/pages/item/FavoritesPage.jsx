import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listFavorites, toggleFavorite } from '../../api/itemApi';
import BottomNav from '../../components/BottomNav';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

/**
 * favorites_lib_005 — 즐겨찾기 (/favorites)
 * ITEM-07 목록(favorite=true), ITEM-08 하트 토글. 타입 필터 칩 + 제목 검색(q).
 * [상충 해소] savedAt(ISO) → 상대시간 표기(프론트 책임). 상세는 절대일자.
 */
function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return '방금 저장됨';
  if (h < 24) return `${h}시간 전 저장됨`;
  const d = Math.floor(h / 24);
  if (d === 1) return '어제 저장됨';
  return `${d}일 전 저장됨`;
}

function formatSize(bytes) {
  if (!bytes) return '';
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const TYPE_FILTERS = [
  { key: '', label: '전체', icon: 'all_inclusive' },
  { key: 'IMAGE', label: '이미지', icon: 'image' },
  { key: 'LINK', label: '링크', icon: 'link' },
  { key: 'DOCUMENT', label: '문서', icon: 'description' },
];

function FavCard({ it, onToggle, onOpen }) {
  const heart = (extra = '') => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle(it);
      }}
      className={`active:scale-90 transition-transform text-primary ${extra}`}
    >
      <span className="material-symbols-outlined" style={{ fontVariationSettings: it.favorite ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
    </button>
  );

  const dimmed = it.favorite ? '' : 'opacity-50 grayscale';

  // Vaulted 카드 (블러 + 잠금)
  if (it.vaulted) {
    return (
      <div className={`group relative bg-surface-container-lowest rounded-xl overflow-hidden shadow-md ${dimmed}`}>
        <div className="aspect-square relative">
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-on-background/10 backdrop-blur-md">
            <span className="material-symbols-outlined text-on-background/40 text-4xl mb-2">lock</span>
            <span className="text-[10px] font-label-caps text-on-background/60">잠긴 보관함</span>
          </div>
          <div className="absolute top-2 right-2 z-10">
            <div className="w-8 h-8 rounded-full bg-surface/90 backdrop-blur flex items-center justify-center shadow-sm">{heart()}</div>
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-body-md text-body-md font-semibold truncate text-on-surface">{it.title}</h3>
          <p className="text-caption font-caption text-text-muted">비공개</p>
        </div>
      </div>
    );
  }

  // 링크 카드 (Bento)
  if (it.type === 'LINK') {
    return (
      <div onClick={() => onOpen(it)} className={`group relative bg-surface-container-lowest rounded-xl overflow-hidden shadow-md flex flex-col justify-between border border-surface-border cursor-pointer ${dimmed}`}>
        <div className="p-4">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">link</span>
            </div>
            {heart()}
          </div>
          <h3 className="font-body-md text-body-md font-semibold text-on-surface line-clamp-2">{it.title}</h3>
          {it.sourceApp && <p className="text-caption font-caption text-primary mt-1">{it.sourceApp}</p>}
        </div>
        {it.tags?.length > 0 && (
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-1">
              {it.tags.map((t) => (
                <span key={t} className="px-2 py-0.5 bg-surface-variant/30 text-primary-fixed-dim rounded-full text-[10px] font-label-caps">{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 문서 카드 (PDF)
  if (it.type === 'DOCUMENT') {
    return (
      <div onClick={() => onOpen(it)} className={`group relative bg-surface-container-lowest rounded-xl overflow-hidden shadow-md p-4 border-l-4 border-primary cursor-pointer ${dimmed}`}>
        <div className="flex justify-between items-start mb-2">
          <div className="p-2 bg-error-container/20 rounded-lg text-error">
            <span className="material-symbols-outlined">picture_as_pdf</span>
          </div>
          {heart()}
        </div>
        <h3 className="font-body-md text-body-md font-semibold text-on-surface line-clamp-1 mb-1">{it.title}</h3>
        <p className="text-caption font-caption text-text-muted mb-4">{formatSize(it.fileSize)} • PDF 문서</p>
        {it.tags?.length > 0 && (
          <div className="flex items-center gap-2">
            {it.tags.map((t) => (
              <span key={t} className="px-2 py-0.5 bg-tertiary-container/10 text-tertiary rounded-full text-[10px] font-label-caps">{t}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 이미지/스크린샷 카드
  return (
    <div onClick={() => onOpen(it)} className={`group relative bg-surface-container-lowest rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer ${dimmed}`}>
      <div className="aspect-square relative overflow-hidden bg-surface-container-low">
        {it.thumbnailUrl && <img alt={it.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src={it.thumbnailUrl} />}
        <div className="absolute top-2 right-2 z-10">
          <div className="w-8 h-8 rounded-full bg-surface/90 backdrop-blur flex items-center justify-center shadow-sm">{heart()}</div>
        </div>
        {it.category && (
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-primary/10 backdrop-blur rounded-lg flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-primary">auto_awesome</span>
            <span className="text-[10px] font-label-caps text-primary">{it.category}</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-body-md text-body-md font-semibold truncate text-on-surface">{it.title}</h3>
        <p className="text-caption font-caption text-text-muted">{relativeTime(it.savedAt)}</p>
      </div>
    </div>
  );
}

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listFavorites({ type: type || undefined, q: q || undefined })
      .then((d) => alive && setItems(d.items))
      .catch((e) => alive && show(e.message || '불러오지 못했습니다.', { icon: 'error' }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, q]);

  const onToggle = async (it) => {
    try {
      const d = await toggleFavorite(it.id, !it.favorite);
      setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, favorite: d.favorite } : x)));
    } catch (e) {
      show(e.message, { icon: 'error' });
    }
  };

  return (
    <div className="min-h-screen text-on-surface bg-surface">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 w-full z-40 bg-surface/80 backdrop-blur-md h-16 flex justify-between items-center px-container-padding">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary-container/20 flex items-center justify-center border border-primary/10 text-primary">
            <span className="material-symbols-outlined">person</span>
          </div>
          <span className="font-display-lg text-display-lg font-bold text-primary">Sortmate</span>
        </div>
        <button className="w-10 h-10 flex items-center justify-center text-primary hover:opacity-80 transition-opacity active:scale-95 duration-100">
          <span className="material-symbols-outlined">search</span>
        </button>
      </header>

      <main className="pt-24 pb-32 px-container-padding">
        <section className="mb-stack-gap-lg">
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-background mb-4">즐겨찾기</h1>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">search</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-full text-body-md focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline shadow-sm"
              placeholder="즐겨찾기 검색..."
              type="text"
            />
          </div>
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 no-scrollbar">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setType(f.key)}
                className={`px-4 py-2 rounded-full font-label-caps text-label-caps flex items-center gap-2 whitespace-nowrap transition-colors ${
                  type === f.key
                    ? 'bg-primary text-on-primary shadow-md'
                    : 'bg-surface text-on-surface-variant border border-outline-variant hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {/* Grid */}
        {items.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-grid-gutter">
            {items.map((it) => (
              <FavCard key={it.id} it={it} onToggle={onToggle} onOpen={(x) => navigate(`/items/${x.id}`)} />
            ))}
          </div>
        ) : (
          !loading && (
            <div className="mt-stack-gap-lg p-stack-gap-md border-2 border-dashed border-outline-variant rounded-2xl flex flex-col items-center text-center py-12">
              <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-outline mb-4">
                <span className="material-symbols-outlined text-3xl">star_outline</span>
              </div>
              <h4 className="font-headline-sm text-headline-sm text-on-surface">즐겨찾기를 추가해 보세요</h4>
              <p className="text-body-md text-text-muted max-w-xs mt-2">라이브러리나 검색에서 별표를 누른 항목은 여기에서 빠르게 확인할 수 있습니다.</p>
            </div>
          )
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => navigate('/items/new-memo')}
        className="fixed right-6 bottom-28 w-14 h-14 rounded-full bg-primary text-on-primary shadow-[0_10px_20px_rgba(53,37,205,0.3)] flex items-center justify-center z-50 active:scale-95 transition-transform"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

      <BottomNav active="library" />
      <Toast {...toast} shape="rounded" />
    </div>
  );
}
