import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getItem, updateItem, reanalyzeItem, deleteItems } from '../../api/itemApi';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

/**
 * item_edit_lib_004 — 아이템 편집 (/items/:id/edit)
 * 저장 → ITEM-06 PATCH (title/category/tags 전체 치환). aiSummary는 읽기 전용(미전송).
 * AI 재분석 → ITEM-15 stub. 삭제 → ITEM-09 (failedIds 규약 준수).
 * [가정] 썸네일 편집: 업로드 UI는 이번 범위 밖 → 안내 토스트만(계약 thumbnailFileId 선택 필드).
 * [가정] 카테고리 select 값은 화면 고정 4종의 한글 라벨로 저장(앱 전반 category가 한글).
 */
const CATEGORY_OPTIONS = ['쿠폰', '영수증', '링크', '메모'];

export default function ItemEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [item, setItem] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState([]);
  const [tagDraft, setTagDraft] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getItem(id)
      .then((d) => {
        if (!alive) return;
        setItem(d.item);
        setTitle(d.item.title || '');
        setCategory(d.item.category || '');
        setTags(d.item.tags || []);
      })
      .catch((e) => show(e.message || '불러오지 못했습니다.', { icon: 'error' }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const addTag = () => {
    const t = tagDraft.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagDraft('');
  };

  const onSave = async () => {
    setBusy(true);
    try {
      await updateItem(id, { title, category: category || undefined, tags });
      show('변경사항이 저장되었습니다.', { icon: 'check_circle' });
      setTimeout(() => navigate(`/items/${id}`), 900);
    } catch (e) {
      show(e.message, { icon: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const onReanalyze = async () => {
    try {
      await reanalyzeItem(id);
      show('AI 재분석 요청이 접수되었습니다.', { icon: 'auto_awesome' });
    } catch (e) {
      show(e.message, { icon: 'error' });
    }
  };

  const onDelete = async () => {
    try {
      const d = await deleteItems([Number(id)]);
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
    return <div className="min-h-screen flex items-center justify-center text-text-muted">불러오는 중...</div>;
  }

  // 현재 category가 고정 4종에 없으면 옵션에 추가해 표시 유지
  const options = CATEGORY_OPTIONS.includes(category) || !category ? CATEGORY_OPTIONS : [category, ...CATEGORY_OPTIONS];

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      {/* Header */}
      <header className="bg-surface/80 backdrop-blur-md sticky top-0 z-40 w-full">
        <div className="flex items-center justify-between px-container-padding h-16 w-full max-w-[480px] mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-start text-on-surface hover:bg-surface-container-high rounded-full transition-colors active:scale-95 duration-150"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <h1 className="font-headline-sm text-headline-sm text-on-surface">아이템 편집</h1>
          <button
            onClick={onSave}
            disabled={busy}
            className="px-4 py-2 bg-primary-container text-on-primary-container rounded-xl font-bold text-body-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
          >
            {busy ? '저장 중...' : '저장'}
          </button>
        </div>
      </header>

      <main className="max-w-[480px] mx-auto pb-32">
        {/* Thumbnail */}
        <section className="mt-stack-gap-lg px-container-padding flex justify-center">
          <div className="relative w-40 h-40 rounded-xl overflow-hidden memo-shadow border-2 border-surface-container bg-surface-container-low flex items-center justify-center">
            {item.thumbnailUrl && !item.vaulted ? (
              <img className="w-full h-full object-cover" alt={item.title} src={item.thumbnailUrl} />
            ) : (
              <span className="material-symbols-outlined text-outline text-4xl">image</span>
            )}
            <button
              onClick={() => show('썸네일 편집은 준비 중입니다.', { icon: 'info' })}
              className="absolute bottom-2 right-2 bg-primary text-on-primary w-8 h-8 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>edit</span>
            </button>
          </div>
        </section>

        {/* Form */}
        <section className="mt-stack-gap-lg px-container-padding space-y-stack-gap-lg">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-label-caps font-label-caps text-on-surface-variant flex items-center gap-1 uppercase">
              <span className="material-symbols-outlined text-[14px]">title</span> 제목
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-surface-container-lowest border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-body-lg font-body-lg memo-shadow text-on-surface"
              type="text"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-label-caps font-label-caps text-on-surface-variant flex items-center gap-1 uppercase">
              <span className="material-symbols-outlined text-[14px]">category</span> 카테고리
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full appearance-none px-4 py-3 bg-surface-container-lowest border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-body-lg font-body-lg memo-shadow text-on-surface"
              >
                {options.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-label-caps font-label-caps text-on-surface-variant flex items-center gap-1 uppercase">
              <span className="material-symbols-outlined text-[14px]">sell</span> 태그 관리
            </label>
            <div className="bg-surface-container-lowest p-4 rounded-xl memo-shadow space-y-3">
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-caption font-medium border border-primary/10">
                    #{t}
                    <button
                      onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                      className="hover:bg-primary/20 rounded-full flex items-center justify-center w-4 h-4"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </span>
                ))}
              </div>
              <div className="relative">
                <input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="w-full bg-transparent border-b border-outline-variant focus:border-primary focus:ring-0 px-0 py-2 text-body-md placeholder:text-outline-variant"
                  placeholder="새 태그 추가..."
                  type="text"
                />
                <button onClick={addTag} className="absolute right-0 top-1/2 -translate-y-1/2 text-primary">
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
            </div>
          </div>

          {/* AI Summary (읽기 전용) */}
          <div className="space-y-2">
            <label className="text-label-caps font-label-caps text-on-surface-variant flex items-center gap-1 uppercase">
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span> AI 분석 요약
            </label>
            <div className="bg-surface-container-low p-4 rounded-xl border border-surface-variant">
              <p className="text-body-md text-on-surface-variant leading-relaxed">
                {item.aiSummary || 'AI 분석 요약이 아직 없습니다.'}
              </p>
              <div className="mt-3 flex items-center gap-2 text-caption text-primary font-medium">
                <span className="material-symbols-outlined text-[16px]">info</span>
                AI 요약은 편집할 수 없습니다.
              </div>
            </div>
          </div>

          {/* AI Re-analysis */}
          <button
            onClick={onReanalyze}
            className="w-full flex items-center justify-center gap-2 py-4 bg-surface-container-lowest border border-primary text-primary rounded-xl font-bold hover:bg-primary/5 active:scale-[0.98] transition-all memo-shadow mt-8"
          >
            <span className="material-symbols-outlined">refresh</span>
            AI 재분석 요청
          </button>
        </section>

        {/* Danger Zone */}
        <section className="mt-12 px-container-padding mb-10">
          <button
            onClick={onDelete}
            className="w-full flex items-center justify-center gap-2 py-3 text-error font-medium text-body-md hover:bg-error/5 rounded-xl transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">delete_outline</span>
            아이템 삭제하기
          </button>
        </section>
      </main>

      <Toast {...toast} shape="rounded" />
    </div>
  );
}
