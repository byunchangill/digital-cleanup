import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listScreenshots } from '../../api/cleanupApi';
import { deleteItems } from '../../api/itemApi';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

/**
 * unnecessary_screenshots_clean_005 — 불필요한 스크린샷 정리 (/cleanup/screenshots)
 * CLEAN-05 조회(사유 라벨/추천). 체크박스 다중 선택(기본 defaultSelected).
 * 삭제는 itemApi.deleteItems(ITEM-09 재사용) — itemId 배열 전달, 200+failedIds 규약(afterBulk 패턴). 완료 시 history.back.
 */
const REASON_STYLE = {
  ONE_TIME: 'text-tertiary-container bg-tertiary/10',
  BLURRY: 'text-error bg-error-container/20',
  INFO: 'text-secondary bg-secondary-container/20',
};

export default function ScreenshotCleanupPage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [reason, setReason] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [reasonCounts, setReasonCounts] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listScreenshots({ reason: reason || undefined })
      .then((d) => {
        setCandidates(d.candidates);
        setReasonCounts(d.reasonCounts);
        // 진입 시 defaultSelected=true 인 항목을 기본 체크 (itemId 기준)
        setSelected(new Set(d.candidates.filter((c) => c.defaultSelected).map((c) => c.itemId)));
      })
      .catch((e) => show(e.message || '불러오지 못했습니다.', { icon: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reason]);

  const toggle = (itemId) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });

  const allChecked = candidates.length > 0 && candidates.every((c) => selected.has(c.itemId));
  const toggleAll = () =>
    setSelected(allChecked ? new Set() : new Set(candidates.map((c) => c.itemId)));

  const onTrash = async () => {
    const ids = Array.from(selected);
    if (busy || ids.length === 0) return;
    setBusy(true);
    try {
      const d = await deleteItems(ids);
      const failed = d.failedIds?.length || 0;
      if (d.deletedCount === 0) {
        show(`휴지통 이동 실패 (${failed}건)`, { icon: 'error' });
        setBusy(false);
        return;
      }
      show(failed ? `${d.deletedCount}개 이동, ${failed}건 실패` : `${d.deletedCount}개 항목을 휴지통으로 이동했습니다.`, {
        icon: failed ? 'error' : 'check_circle',
      });
      setTimeout(() => navigate(-1), 800);
    } catch (e) {
      show(e.message || '휴지통 이동 실패', { icon: 'error' });
      setBusy(false);
    }
  };

  const count = selected.size;

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md flex justify-between items-center w-full px-container-padding h-16">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="hover:opacity-80 transition-opacity active:scale-95 duration-100">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md text-on-surface">불필요한 스크린샷 정리</h1>
        </div>
      </header>

      <main className="flex-grow px-container-padding pt-stack-gap-md pb-40">
        {/* Insight Card */}
        <section className="mb-stack-gap-lg p-stack-gap-md bg-surface-container-low rounded-xl border border-surface-border">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_delete</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">디지털 정리</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                Sortmate가 일시적이거나 화질이 낮은 항목을 발견했습니다. 이를 삭제하여 공간을 확보하세요.
              </p>
            </div>
          </div>
        </section>

        {/* Item List */}
        <div className="space-y-grid-gutter">
          {candidates.map((c) => {
            const isSel = selected.has(c.itemId);
            return (
              <label
                key={c.itemId}
                onClick={() => toggle(c.itemId)}
                className="flex items-center gap-stack-gap-md p-3 bg-white rounded-xl shadow-sm border border-slate-50 transition-all active:scale-[0.98] cursor-pointer group"
              >
                <span className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 border-2 ${isSel ? 'bg-primary border-primary text-white' : 'border-outline-variant'}`}>
                  {isSel && <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>}
                </span>
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                  {c.thumbnailUrl ? (
                    <img className="w-full h-full object-cover" src={c.thumbnailUrl} alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-outline-variant">lock</span>
                    </div>
                  )}
                </div>
                <div className="flex-grow">
                  <div className="flex items-center gap-2">
                    <span className={`font-label-caps text-label-caps px-2 py-0.5 rounded-full ${REASON_STYLE[c.reason] || 'text-primary bg-primary/10'}`}>{c.reasonLabel}</span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface font-medium mt-0.5">{c.title}</p>
                  <p className="font-caption text-caption text-on-surface-variant">추천: {c.recommendationText}</p>
                </div>
                <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">chevron_right</span>
              </label>
            );
          })}
        </div>

        {/* Reason Filter Chips */}
        <div className="mt-stack-gap-lg flex flex-wrap gap-2">
          {reasonCounts.map((rc) => {
            const active = reason === rc.reason;
            return (
              <button
                key={rc.reason}
                onClick={() => setReason(active ? '' : rc.reason)}
                className={`font-label-caps text-label-caps px-3 py-1.5 rounded-full flex items-center gap-2 border transition-colors ${
                  active ? 'bg-primary text-white border-primary' : 'bg-surface-container-highest text-primary-fixed-dim border-primary/20'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{rc.reason === 'BLURRY' ? 'blur_on' : 'filter_list'}</span>
                {rc.label} ({rc.count})
              </button>
            );
          })}
        </div>
      </main>

      {/* Fixed Action Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.08)] px-container-padding pt-4 pb-8">
        <div className="flex flex-col gap-4 max-w-lg mx-auto">
          <div className="flex justify-between items-center px-2">
            <span className="font-body-md text-body-md text-on-surface-variant">{count}개 항목 선택됨</span>
            <button onClick={toggleAll} className="font-label-caps text-label-caps text-primary font-bold hover:opacity-70 transition-opacity">
              {allChecked ? '전체 해제' : '전체 선택'}
            </button>
          </div>
          <button
            onClick={onTrash}
            disabled={busy || count === 0}
            className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-headline-sm text-headline-sm flex justify-center items-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-primary/20 disabled:opacity-50 disabled:grayscale"
          >
            <span className={`material-symbols-outlined ${busy ? 'animate-spin' : ''}`} style={busy ? undefined : { fontVariationSettings: "'FILL' 1" }}>
              {busy ? 'refresh' : 'delete_forever'}
            </span>
            {busy ? '처리 중...' : `${count}개 항목 휴지통으로 이동`}
          </button>
        </div>
      </div>

      <Toast {...toast} shape="rounded" />
    </div>
  );
}
