import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listDuplicates, resolveDuplicate, dismissDuplicate } from '../../api/cleanupApi';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';
import formatBytes from '../../lib/formatBytes';

/**
 * duplicate_review_clean_002 — 중복 자료 검토 (/cleanup/duplicates)
 * CLEAN-02 목록의 첫 그룹을 표시. 라디오로 유지본 선택(기본 recommendedKeep).
 * "나머지 정리하기" → CLEAN-03 resolve, "중복이 아니에요" → CLEAN-04 dismiss. 완료 시 history.back.
 */
function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  } catch {
    return '';
  }
}

export default function DuplicateReviewPage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [group, setGroup] = useState(null);
  const [keepId, setKeepId] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listDuplicates()
      .then((d) => {
        const g = d.groups?.[0] || null;
        setGroup(g);
        if (g) {
          const rec = g.candidates.find((c) => c.recommendedKeep) || g.candidates[0];
          setKeepId(rec?.itemId ?? null);
        }
      })
      .catch((e) => show(e.message || '불러오지 못했습니다.', { icon: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteCount = useMemo(() => (group ? group.candidates.length - 1 : 0), [group]);

  const onResolve = async () => {
    if (busy || !group || keepId == null) return;
    setBusy(true);
    try {
      const r = await resolveDuplicate(group.groupId, keepId);
      const failed = r.failedIds?.length || 0;
      show(
        failed
          ? `일부 실패 (${failed}건) · ${formatBytes(r.savedBytes)} 확보`
          : `${r.deletedItemIds.length}개 정리 · ${formatBytes(r.savedBytes)} 확보`,
        { icon: failed ? 'error' : 'check_circle' }
      );
      setTimeout(() => navigate(-1), 800);
    } catch (e) {
      show(e.message || '정리 실패', { icon: 'error' });
      setBusy(false);
    }
  };

  const onDismiss = async () => {
    if (busy || !group) return;
    setBusy(true);
    try {
      await dismissDuplicate(group.groupId);
      show('일반 라이브러리로 이동했습니다.', { icon: 'check_circle' });
      setTimeout(() => navigate(-1), 800);
    } catch (e) {
      show(e.message || '처리 실패', { icon: 'error' });
      setBusy(false);
    }
  };

  return (
    <div className="bg-background font-body-md text-on-background min-h-screen pb-32">
      {/* Top Navigation */}
      <nav className="flex items-center justify-between px-container-padding py-stack-gap-sm w-full z-50 bg-background sticky top-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="material-symbols-outlined text-on-surface-variant active:scale-95 transition-transform">arrow_back</button>
          <h1 className="font-headline-sm text-headline-sm font-bold text-primary">중복 자료 검토</h1>
        </div>
        <div className="flex items-center gap-stack-gap-md">
          <button onClick={() => navigate('/search')} className="material-symbols-outlined text-primary active:scale-95 transition-transform">search</button>
        </div>
      </nav>

      <main className="px-container-padding pt-stack-gap-md">
        {!group ? (
          <div className="mt-20 flex flex-col items-center text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl mb-3 text-primary">task_alt</span>
            <p className="font-body-lg">검토할 중복 자료가 없습니다.</p>
          </div>
        ) : (
          <>
            {/* AI Insight Header */}
            <div className="mb-stack-gap-lg p-stack-gap-md bg-surface-container-low rounded-xl border border-surface-container-high flex items-start gap-3">
              <span className="material-symbols-outlined text-primary-container p-2 bg-primary-fixed rounded-lg">auto_fix_high</span>
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">중복 그룹</h2>
                <p className="text-on-surface-variant font-body-md mt-1">
                  Sortmate가 {group.summary} 가장 높은 화질의 버전을 유지하여 {formatBytes(group.estimatedSaveBytes)}를 절약하세요.
                </p>
              </div>
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-grid-gutter mb-stack-gap-lg">
              {group.candidates.map((c, i) => {
                const selected = c.itemId === keepId;
                return (
                  <label key={c.itemId} className="relative group cursor-pointer block" onClick={() => setKeepId(c.itemId)}>
                    <div
                      className="bg-surface rounded-xl overflow-hidden border border-surface-border transition-all duration-300"
                      style={selected ? { outline: '3px solid #3525cd', transform: 'scale(1.02)', boxShadow: '0 10px 25px -5px rgba(53,37,205,0.2)' } : undefined}
                    >
                      <div className="aspect-[9/16] relative" style={{ opacity: 1 - i * 0.2 }}>
                        {c.thumbnailUrl ? (
                          <img className="w-full h-full object-cover" src={c.thumbnailUrl} alt="" />
                        ) : (
                          <div className="w-full h-full bg-surface-container-low flex items-center justify-center">
                            <span className="material-symbols-outlined text-outline-variant text-3xl">lock</span>
                          </div>
                        )}
                        {c.recommendedKeep && (
                          <div className="absolute top-2 right-2 bg-secondary text-on-secondary px-2 py-1 rounded-lg text-caption font-label-caps flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            최고 화질
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-surface-container-lowest">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-on-surface font-bold text-body-md">{c.width} x {c.height}</p>
                            <p className="text-on-surface-variant text-caption">{fmtDate(c.capturedAt)} • {formatBytes(c.fileSize)}</p>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selected ? 'bg-primary border-primary' : 'border-outline-variant'}`}>
                            <div className="w-2.5 h-2.5 bg-white rounded-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Feedback & Secondary Actions */}
            <div className="flex flex-col items-center gap-stack-gap-md text-center">
              <button onClick={onDismiss} disabled={busy} className="flex items-center gap-2 text-primary font-body-md py-2 px-4 rounded-full hover:bg-primary-fixed transition-colors active:scale-95 disabled:opacity-60">
                <span className="material-symbols-outlined text-[20px]">thumb_down</span>
                중복이 아니에요
              </button>
              <p className="text-caption text-on-surface-variant px-container-padding italic">
                "중복이 아니에요"를 선택하면 이 항목들이 분리되어 일반 라이브러리로 이동합니다.
              </p>
            </div>
          </>
        )}
      </main>

      {/* Bottom Action Bar */}
      {group && (
        <div className="fixed bottom-0 left-0 w-full p-container-padding z-50 pointer-events-none">
          <div className="max-w-xl mx-auto flex gap-stack-gap-md bg-white p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] pointer-events-auto items-center">
            <div className="flex-1">
              <p className="text-caption text-on-surface-variant font-label-caps">항목 1개 유지 중</p>
              <p className="text-on-surface font-bold">삭제할 항목 {deleteCount}개</p>
            </div>
            <button
              onClick={onResolve}
              disabled={busy}
              className="bg-primary hover:bg-primary-container text-on-primary px-8 py-3 rounded-xl font-headline-sm text-body-lg shadow-lg active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70"
            >
              <span className={`material-symbols-outlined text-[20px] ${busy ? 'animate-spin' : ''}`} style={busy ? undefined : { fontVariationSettings: "'FILL' 1" }}>
                {busy ? 'sync' : 'delete_forever'}
              </span>
              {busy ? '정리 중...' : '나머지 정리하기'}
            </button>
          </div>
        </div>
      )}

      <Toast {...toast} shape="rounded" />
    </div>
  );
}
