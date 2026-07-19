import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getItem, getRelated, toggleFavorite, toggleVault, shareItems, deleteItems } from '../../api/itemApi';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

/**
 * item_detail_lib_003_2 — 아이템 상세 (/items/:id)
 * ITEM-04 상세, ITEM-05 관련, ITEM-08 즐겨찾기, ITEM-12 vault, ITEM-13 공유, ITEM-09 삭제.
 * [상충 해소] savedAt(ISO)을 프론트에서 절대일자로 포맷(계약 결정: 표기는 프론트 책임).
 */
function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [item, setItem] = useState(null);
  const [related, setRelated] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    getItem(id)
      .then((d) => {
        if (!alive) return;
        // vaulted 아이템은 vault 모듈 흐름으로 유도(잠금 오버레이 → PIN → 마스킹 해제 열람)
        if (d.item?.vaulted) {
          navigate(`/vault/items/${id}`, { replace: true });
          return;
        }
        setItem(d.item);
      })
      .catch((e) => show(e.message || '불러오지 못했습니다.', { icon: 'error' }));
    getRelated(id, 4)
      .then((d) => alive && setRelated(d.items))
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onFavorite = async () => {
    try {
      const d = await toggleFavorite(item.id, !item.favorite);
      setItem((it) => ({ ...it, favorite: d.favorite }));
    } catch (e) {
      show(e.message, { icon: 'error' });
    }
  };

  const onVault = async () => {
    try {
      const d = await toggleVault(item.id, !item.vaulted);
      setItem((it) => ({ ...it, vaulted: d.vaulted }));
      show(d.vaulted ? '비밀 보관함으로 이동했습니다.' : '보관함에서 해제했습니다.', { icon: 'lock' });
    } catch (e) {
      show(e.message, { icon: 'error' });
    }
  };

  const onShare = async () => {
    try {
      const d = await shareItems([item.id]);
      show('공유 링크를 생성했습니다.', { icon: 'link' });
      if (navigator.clipboard) navigator.clipboard.writeText(d.shareUrl).catch(() => {});
    } catch (e) {
      show(e.message, { icon: 'error' });
    }
  };

  const onDelete = async () => {
    setMenuOpen(false);
    try {
      const d = await deleteItems([item.id]);
      // 백엔드는 단건 실패도 200+failedIds로 반환(QA-01) → 성공 0이면 이탈하지 않음
      if (d.deletedCount === 0) {
        show('삭제에 실패했습니다.', { icon: 'error' });
        return;
      }
      show('삭제했습니다.', { icon: 'delete' });
      setTimeout(() => navigate('/library'), 700);
    } catch (e) {
      show(e.message, { icon: 'error' });
    }
  };

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text-muted">불러오는 중...</div>
    );
  }

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md text-body-md pb-32">
      {/* Top Nav */}
      <header className="flex items-center justify-between px-container-padding py-stack-gap-sm w-full z-50 bg-background/80 backdrop-blur-md sticky top-0">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors active:scale-95 duration-200"
        >
          <span className="material-symbols-outlined text-primary">arrow_back</span>
        </button>
        <h1 className="font-headline-sm text-headline-sm text-text-main">자료 상세</h1>
        <div className="relative flex gap-2">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors active:scale-95 duration-200"
          >
            <span className="material-symbols-outlined text-outline">more_vert</span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 bg-white rounded-xl shadow-xl border border-surface-border py-1 w-32 z-50">
              <button onClick={onDelete} className="w-full text-left px-4 py-2 text-error font-body-md hover:bg-error-container/20 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">delete</span> 삭제
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto">
        {/* Hero */}
        <section className="px-container-padding pt-stack-gap-md overflow-hidden" style={{ maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' }}>
          <div className="relative group">
            <div className="w-full aspect-[3/4] rounded-xl overflow-hidden shadow-2xl transition-transform duration-500 group-hover:scale-[1.02] bg-surface-container-low">
              {item.vaulted || !item.fileUrl ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-outline">
                  <span className="material-symbols-outlined text-5xl mb-2">lock</span>
                  <span className="font-label-caps text-label-caps">잠긴 보관함</span>
                </div>
              ) : (
                <img className="w-full h-full object-cover" alt={item.title} src={item.fileUrl} />
              )}
            </div>
            {!item.vaulted && item.fileUrl && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-surface-border flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>zoom_in</span>
                <span className="font-label-caps text-label-caps text-primary">탭하여 확대</span>
              </div>
            )}
          </div>
        </section>

        {/* Info Card */}
        <section className="px-container-padding -mt-8 relative z-10">
          <div className="bg-bg-primary rounded-[24px] p-6 shadow-[0px_10px_30px_rgba(53,37,205,0.08)] border border-surface-border/50">
            {/* Badges */}
            <div className="flex items-center gap-2 mb-4">
              {item.aiClassified && (
                <div className="bg-primary/10 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  <span className="font-label-caps text-[10px] text-primary tracking-wider uppercase">AI 자동 분류</span>
                </div>
              )}
              {item.expiringSoon && (
                <div className="bg-amber-50 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-amber-600" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                  <span className="font-label-caps text-[10px] text-amber-600 tracking-wider uppercase">만료 임박</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h1 className="font-headline-md text-headline-md text-text-main mb-1">{item.title}</h1>
                  <button onClick={onFavorite} className="text-primary active:scale-90 transition-transform shrink-0">
                    <span className="material-symbols-outlined" style={item.favorite ? { fontVariationSettings: "'FILL' 1" } : undefined}>favorite</span>
                  </button>
                </div>
                {item.category && (
                  <div className="flex items-center gap-2 text-text-muted">
                    <span className="material-symbols-outlined text-[18px]">local_activity</span>
                    <span className="font-body-md">{item.category}</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {item.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((t) => (
                    <span key={t} className="px-3 py-1 bg-surface-container-low text-primary rounded-full font-label-caps text-label-caps">
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* AI Summary */}
              {item.aiSummary && (
                <div className="bg-surface p-4 rounded-xl border-l-4 border-primary/20">
                  <div className="flex gap-3">
                    <span className="material-symbols-outlined text-primary/40">description</span>
                    <p className="font-body-md text-on-surface-variant leading-relaxed">{item.aiSummary}</p>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-bg-secondary rounded-lg border border-surface-border/30">
                  <span className="font-label-caps text-[10px] text-text-muted block mb-1">출처</span>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">chat</span>
                    <span className="font-body-md text-on-surface font-medium">{item.sourceApp || '알 수 없음'}</span>
                  </div>
                </div>
                <div className="p-3 bg-bg-secondary rounded-lg border border-surface-border/30">
                  <span className="font-label-caps text-[10px] text-text-muted block mb-1">저장일</span>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">calendar_today</span>
                    <span className="font-body-md text-on-surface font-medium">{formatDate(item.savedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="px-container-padding mt-stack-gap-lg">
            <h2 className="font-headline-sm text-headline-sm mb-4 px-1">함께 사용하기 좋은 아이템</h2>
            <div className="grid grid-cols-2 gap-grid-gutter">
              {related.map((r) => (
                <div
                  key={r.id}
                  onClick={() => navigate(`/items/${r.id}`)}
                  className="bg-white p-3 rounded-xl shadow-sm border border-surface-border cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="w-full aspect-square bg-surface-container-low rounded-lg mb-3 overflow-hidden flex items-center justify-center">
                    {r.thumbnailUrl ? (
                      <img className="w-full h-full object-cover" alt={r.title} src={r.thumbnailUrl} />
                    ) : (
                      <span className="material-symbols-outlined text-outline text-3xl">description</span>
                    )}
                  </div>
                  <span className="font-body-md font-medium text-text-main line-clamp-1 block">{r.title}</span>
                  {r.expiryDate && <span className="font-caption text-caption text-text-muted">만료일 {r.expiryDate.slice(5).replace('-', '/')}</span>}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 w-full z-40 px-container-padding pb-10 pt-4 bg-background/90 backdrop-blur-xl">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-3">
          <button onClick={onShare} className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-white border border-surface-border text-primary hover:bg-surface-container-low transition-all active:scale-95">
            <span className="material-symbols-outlined">share</span>
            <span className="font-label-caps text-[10px]">공유하기</span>
          </button>
          <button
            onClick={() => show('수정 화면은 준비 중입니다.', { icon: 'info' })}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-white border border-surface-border text-primary hover:bg-surface-container-low transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">edit</span>
            <span className="font-label-caps text-[10px]">수정하기</span>
          </button>
          <button onClick={onVault} className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>enhanced_encryption</span>
            <span className="font-label-caps text-[10px]">{item.vaulted ? '보관함에서 해제' : '비밀 보관함으로 이동'}</span>
          </button>
        </div>
      </div>

      <Toast {...toast} shape="rounded" />
    </div>
  );
}
