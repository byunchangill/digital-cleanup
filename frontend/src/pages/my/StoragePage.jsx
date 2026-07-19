import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStorage } from '../../api/myApi';
import { deleteItems } from '../../api/itemApi';
import BottomNav from '../../components/BottomNav';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';
import formatBytes from '../../lib/formatBytes';

/**
 * storage_detail_my_006(정상) + storage_limit_reached_my_006(한도) 통합 (/my/storage).
 * MY-07 조회. limitReached=true면 한도 도달 변형(경고 헤더 + 업그레이드/정리 CTA) 렌더.
 * 대용량 자산 삭제 = ITEM-09 재사용. "지금 정리하기" = /cleanup, "플랜 업그레이드" = /my/plan.
 */
const SEG_COLORS = ['bg-primary', 'bg-secondary-fixed-dim', 'bg-tertiary-fixed-dim', 'bg-surface-dim'];
const CAT_ICON = { VIDEO: 'movie', SCREENSHOT: 'screenshot', DOCUMENT: 'description', LINK: 'link', IMAGE: 'image', ARCHIVE: 'folder_zip' };
const INSIGHT_STYLE = {
  GROWTH: { icon: 'analytics', text: 'text-primary' },
  ENCRYPTED: { icon: 'verified', text: 'text-secondary' },
  VAULT_SYNCED: { icon: 'cloud_sync', text: 'text-tertiary' },
};

function relDay(iso) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 3600 * 1000));
  if (d < 1) return '오늘';
  if (d < 7) return `${d}일 전`;
  if (d < 30) return `${Math.floor(d / 7)}주일 전`;
  return `${Math.floor(d / 30)}개월 전`;
}

export default function StoragePage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [data, setData] = useState(null);

  const load = () => getStorage().then(setData).catch((e) => show(e.message || '불러오지 못했습니다.', { icon: 'error' }));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const onDelete = async (item) => {
    if (!window.confirm(`"${item.title}"을(를) 삭제할까요?`)) return;
    try {
      await deleteItems([item.itemId]);
      show(`삭제 완료 · ${formatBytes(item.bytes)} 확보`, { icon: 'check_circle' });
      load();
    } catch (e) {
      show(e.message || '삭제 실패', { icon: 'error' });
    }
  };

  const s = data;
  const limit = s?.limitReached;

  return (
    <div className="bg-background text-text-main font-body-md min-h-screen pb-32">
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-container-padding h-16 bg-surface shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/my')} className="material-symbols-outlined text-primary p-2 hover:bg-surface-container-low rounded-full transition-colors">arrow_back</button>
          <h1 className="font-headline-sm text-headline-sm font-bold text-primary">저장공간</h1>
        </div>
      </header>

      <main className="pt-24 px-container-padding max-w-2xl mx-auto space-y-8">
        {!s ? (
          <p className="text-center text-on-surface-variant py-20">불러오는 중...</p>
        ) : limit ? (
          /* ── 한도 도달 변형 ── */
          <>
            <section className="mt-4 flex flex-col gap-stack-gap-md items-center text-center">
              <div className="w-16 h-16 bg-error-container rounded-full flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-error text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              </div>
              <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-background">저장 공간이 가득 찼습니다</h2>
              <p className="font-body-md text-on-surface-variant px-4">
                {s.planName} 플랜의 {formatBytes(s.totalBytes)} 제한에 도달했습니다. 공간을 확보하기 전까지는 새로운 항목을 저장할 수 없습니다.
              </p>
            </section>

            <section className="bg-surface shadow-sm border border-surface-border rounded-xl p-5 flex flex-col gap-stack-gap-sm">
              <div className="flex justify-between items-end mb-1">
                <span className="font-label-caps text-label-caps text-on-surface-variant">현재 사용량</span>
                <span className="font-headline-sm text-headline-sm text-error">{formatBytes(s.usedBytes)} / {formatBytes(s.totalBytes)}</span>
              </div>
              <div className="w-full h-4 bg-surface-container-low rounded-full overflow-hidden">
                <div className="h-full bg-error rounded-full" style={{ width: `${Math.min(100, s.usedPercent)}%` }} />
              </div>
            </section>

            <section className="flex flex-col gap-stack-gap-sm">
              <h3 className="font-label-caps text-label-caps text-on-surface-variant ml-1">저장 공간 점유 항목</h3>
              <div className="flex flex-col gap-2">
                {s.categories.map((c) => (
                  <div key={c.type} className="flex items-center justify-between p-4 bg-surface rounded-xl shadow-sm border border-surface-border">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-surface-container-low rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary">{CAT_ICON[c.type] || 'folder'}</span>
                      </div>
                      <div>
                        <p className="font-body-lg text-body-lg font-semibold">{c.label}</p>
                        <p className="font-caption text-caption text-on-surface-variant">{c.itemCount.toLocaleString()}개 항목</p>
                      </div>
                    </div>
                    <span className="font-body-md text-body-md font-medium text-on-background">{formatBytes(c.bytes)}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full px-container-padding flex flex-col gap-3 max-w-md">
              <button onClick={() => navigate('/my/plan')} className="w-full py-4 bg-primary text-white rounded-xl font-headline-sm text-headline-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                플랜 업그레이드
              </button>
              <button onClick={() => navigate('/cleanup')} className="w-full py-4 bg-white border border-primary text-primary rounded-xl font-headline-sm text-headline-sm flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined">auto_fix_high</span>
                지금 정리하기
              </button>
            </div>
          </>
        ) : (
          /* ── 정상 상세 ── */
          <>
            <section>
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0px_2px_4px_rgba(0,0,0,0.05),0px_10px_20px_rgba(0,0,0,0.02)]">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <p className="text-text-muted font-label-caps uppercase tracking-wider mb-1">전체 사용량</p>
                    <h2 className="font-display-lg text-display-lg text-text-main">
                      {formatBytes(s.usedBytes)} <span className="text-body-lg text-text-muted font-normal">/ {formatBytes(s.totalBytes)}</span>
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="text-primary font-semibold text-body-md">{s.usedPercent}% 사용 중</span>
                  </div>
                </div>
                <div className="h-6 w-full flex rounded-full overflow-hidden bg-surface-container mb-8">
                  {s.categories.map((c, i) => (
                    <div key={c.type} className={`h-full ${SEG_COLORS[i % SEG_COLORS.length]}`} style={{ width: `${c.percent}%` }} title={`${c.label}: ${formatBytes(c.bytes)}`} />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {s.categories.map((c, i) => (
                    <div key={c.type} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${SEG_COLORS[i % SEG_COLORS.length]}`} />
                      <div>
                        <p className="text-body-md font-semibold">{c.label}</p>
                        <p className="text-caption text-text-muted">{formatBytes(c.bytes)} • {c.itemCount.toLocaleString()}개</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section>
              <div className="relative overflow-hidden bg-primary-container text-on-primary p-6 rounded-xl shadow-lg">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <h3 className="font-headline-sm text-headline-sm font-bold text-white">저장 공간 최적화</h3>
                    <p className="text-on-primary-container text-body-md opacity-90 max-w-xs">AI가 삭제해도 안전한 중복 파일 및 흐릿한 스크린샷 {formatBytes(s.reclaimableBytes)}를 찾았습니다.</p>
                  </div>
                  <button onClick={() => navigate('/cleanup')} className="bg-white text-primary px-8 py-3 rounded-xl font-bold text-body-lg hover:bg-opacity-90 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">auto_fix_high</span>
                    지금 정리하기
                  </button>
                </div>
              </div>
            </section>

            {s.largestItems.length > 0 && (
              <section className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <h3 className="font-headline-sm text-headline-sm font-bold text-text-main">대용량 자산</h3>
                  <button onClick={() => navigate('/library?sort=size')} className="text-primary font-semibold text-body-md flex items-center gap-1 hover:underline">
                    전체 보기 <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {s.largestItems.map((it) => (
                    <div key={it.itemId} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-surface-border hover:shadow-md transition-shadow group">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-surface-container-low flex-shrink-0 relative">
                        {it.thumbnailUrl ? (
                          <img alt={it.title} className="w-full h-full object-cover" src={it.thumbnailUrl} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-surface-dim">
                            <span className="material-symbols-outlined text-primary text-[24px]">{CAT_ICON[it.type] || 'folder_zip'}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/items/${it.itemId}`)}>
                        <h4 className="font-semibold text-body-md truncate group-hover:text-primary transition-colors">{it.title}</h4>
                        <p className="text-caption text-text-muted">{relDay(it.modifiedAt)} 수정됨 • {formatBytes(it.bytes)}</p>
                      </div>
                      <button onClick={() => onDelete(it)} className="material-symbols-outlined text-on-surface-variant hover:text-error transition-colors p-2 rounded-full hover:bg-error-container">delete</button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {s.insights.length > 0 && (
              <section className="space-y-4">
                <h3 className="font-headline-sm text-headline-sm font-bold text-text-main px-1">저장 공간 인사이트</h3>
                <div className="flex flex-wrap gap-3">
                  {s.insights.map((ins) => {
                    const st = INSIGHT_STYLE[ins.type] || { icon: 'info', text: 'text-primary' };
                    return (
                      <div key={ins.type} className="flex items-center gap-2 bg-surface-container px-4 py-2 rounded-full">
                        <span className={`material-symbols-outlined text-[18px] ${st.text}`}>{st.icon}</span>
                        <span className="text-body-md font-medium text-text-main">{ins.label}</span>
                      </div>
                    );
                  })}
                </div>
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
