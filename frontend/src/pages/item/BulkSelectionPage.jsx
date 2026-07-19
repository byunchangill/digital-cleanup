import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listItems, listCategories, deleteItems, bulkCategory, bulkTags, shareItems } from '../../api/itemApi';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

/**
 * bulk_selection_lib_001 — 일괄 선택 라이브러리 (/library, 선택 모드)
 * ITEM-03 목록(category 필터), ITEM-14 카테고리 칩, ITEM-09/10/11/13 일괄 작업.
 * [가정] 카테고리 칩은 ITEM-14 조회로 구성(설계의 고정 칩 대신 실제 카테고리) + '모든 파일'.
 */
export default function BulkSelectionPage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [category, setCategory] = useState('');
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(() => new Set());

  useEffect(() => {
    listCategories().then((d) => setCats(d.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    listItems({ category: category || undefined })
      .then((d) => alive && setItems(d.items))
      .catch((e) => alive && show(e.message || '불러오지 못했습니다.', { icon: 'error' }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectAll = () => setSelected(new Set(items.map((it) => it.id)));

  const ids = () => Array.from(selected);

  /**
   * 일괄 작업 결과 처리. 백엔드는 부분 실패를 422가 아닌 200+failedIds로 반환(QA-01).
   * 전체 실패(성공 0) → 에러 토스트, 선택 유지/미갱신.  부분/전체 성공 → 갱신 + 실패 건수 병기.
   */
  const afterBulk = (successCount, failedIds = [], verb) => {
    const failed = failedIds.length;
    if (successCount === 0) {
      show(`${verb} 실패 (${failed}건)`, { icon: 'error' });
      return;
    }
    show(failed ? `${successCount}개 ${verb}, ${failed}건 실패` : `${successCount}개 ${verb}`, {
      icon: failed ? 'error' : 'check_circle',
    });
    setSelected(new Set());
    listItems({ category: category || undefined }).then((d) => setItems(d.items)).catch(() => {});
  };

  const onDelete = async () => {
    try {
      const d = await deleteItems(ids());
      afterBulk(d.deletedCount, d.failedIds, '삭제됨');
    } catch (e) {
      show(e.message, { icon: 'error' });
    }
  };
  const onMove = async () => {
    const c = window.prompt('이동할 카테고리를 입력하세요');
    if (!c) return;
    try {
      const d = await bulkCategory(ids(), c);
      afterBulk(d.updatedCount, d.failedIds, '이동됨');
    } catch (e) {
      show(e.message, { icon: 'error' });
    }
  };
  const onTag = async () => {
    const t = window.prompt('추가할 태그(쉼표로 구분)');
    if (!t) return;
    const tags = t.split(',').map((s) => s.trim()).filter(Boolean);
    try {
      const d = await bulkTags(ids(), tags);
      afterBulk(d.updatedCount, d.failedIds, '태그 추가됨');
    } catch (e) {
      show(e.message, { icon: 'error' });
    }
  };
  const onShare = async () => {
    try {
      await shareItems(ids());
      afterBulk('공유 링크 생성됨');
    } catch (e) {
      show(e.message, { icon: 'error' });
    }
  };

  const chips = [{ name: '', label: '모든 파일' }, ...cats.map((c) => ({ name: c.name, label: c.name }))];
  const count = selected.size;

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen pb-40">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-surface/80 backdrop-blur-md flex justify-between items-center px-container-padding h-16">
        <div className="flex items-center gap-4">
          <button
            onClick={() => (count > 0 ? setSelected(new Set()) : navigate(-1))}
            className="text-on-surface-variant hover:opacity-80 transition-opacity active:scale-95 duration-100"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <h1 className="font-headline-md text-headline-md text-primary">
            {count > 0 ? `${count}개 항목 선택됨` : '라이브러리'}
          </h1>
        </div>
        <button onClick={selectAll} className="font-label-caps text-label-caps text-primary font-bold hover:opacity-80 transition-opacity uppercase">
          전체 선택
        </button>
      </header>

      <main className="pt-20 px-container-padding">
        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
          {chips.map((c) => (
            <button
              key={c.name || 'all'}
              onClick={() => setCategory(c.name)}
              className={`px-4 py-2 rounded-full font-label-caps text-label-caps whitespace-nowrap transition-colors ${
                category === c.name ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-grid-gutter mt-4">
          {items.map((it) => {
            const isSel = selected.has(it.id);
            return (
              <div
                key={it.id}
                onClick={() => toggle(it.id)}
                className="relative group rounded-xl bg-surface memo-shadow overflow-hidden cursor-pointer"
                style={isSel ? { outline: '3px solid #3525cd', outlineOffset: '-3px' } : undefined}
              >
                <div
                  className="aspect-square bg-cover bg-center relative bg-surface-container-low"
                  style={it.thumbnailUrl && !it.vaulted ? { backgroundImage: `url('${it.thumbnailUrl}')` } : undefined}
                >
                  {it.vaulted && (
                    <div className="absolute inset-0 bg-vault-blur/30 backdrop-blur-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-surface-variant/50 text-3xl">lock</span>
                    </div>
                  )}
                  {isSel ? (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white">
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    </div>
                  ) : (
                    <div className="absolute top-2 right-2 w-6 h-6 border-2 border-outline-variant bg-white/50 rounded-full" />
                  )}
                </div>
                <div className="p-3">
                  <p className="font-label-caps text-label-caps text-on-surface-variant truncate">{it.title}</p>
                  {it.category && (
                    <div className="flex gap-1 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${it.vaulted ? 'bg-secondary-container/20 text-secondary' : 'bg-primary-container/10 text-primary'}`}>
                        {it.category}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Bulk Action Bar */}
      <div
        className={`fixed bottom-0 left-0 w-full z-[60] bg-surface shadow-lg rounded-t-xl transition-transform duration-300 transform ${
          count === 0 ? 'translate-y-full' : 'translate-y-0'
        }`}
      >
        <div className="w-full h-1 bg-gradient-to-b from-transparent to-black/5 absolute -top-1" />
        <div className="flex justify-around items-center px-4 pb-8 pt-4">
          <button onClick={onMove} className="flex flex-col items-center justify-center text-on-surface-variant p-2 hover:bg-surface-container-low transition-colors active:scale-90 duration-200">
            <span className="material-symbols-outlined mb-1">drive_file_move</span>
            <span className="font-label-caps text-[10px] uppercase">이동</span>
          </button>
          <button onClick={onTag} className="flex flex-col items-center justify-center text-on-surface-variant p-2 hover:bg-surface-container-low transition-colors active:scale-90 duration-200">
            <span className="material-symbols-outlined mb-1">label</span>
            <span className="font-label-caps text-[10px] uppercase">태그</span>
          </button>
          <button onClick={onShare} className="flex flex-col items-center justify-center text-on-surface-variant p-2 hover:bg-surface-container-low transition-colors active:scale-90 duration-200">
            <span className="material-symbols-outlined mb-1">share</span>
            <span className="font-label-caps text-[10px] uppercase">공유</span>
          </button>
          <button onClick={onDelete} className="flex flex-col items-center justify-center text-error p-2 hover:bg-error-container/20 transition-colors rounded-xl active:scale-90 duration-200">
            <span className="material-symbols-outlined mb-1">delete</span>
            <span className="font-label-caps text-[10px] uppercase">삭제</span>
          </button>
        </div>
      </div>

      <Toast {...toast} shape="rounded" />
    </div>
  );
}
