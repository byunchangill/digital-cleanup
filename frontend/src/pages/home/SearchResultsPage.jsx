import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { search } from '../../api/homeApi';
import { toggleFavorite } from '../../api/itemApi';
import BottomNav from '../../components/BottomNav';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

/**
 * search_results_home_002_2 (결과) + search_no_results_home_002 (빈 상태) — /search?q={query}
 * HOME-02 자연어 검색: 질의 해석(칩) + 결과(matchScore) + 상세 필터 추천 + 빈 상태(assistantHint).
 * 결과 카드는 Item 표준 표현 재사용, vaulted 마스킹. star 토글은 ITEM-08 재사용.
 * 빈 결과는 에러가 아니라 200 + results:[] → 빈 상태 화면 렌더.
 */
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${String(d.getDate()).padStart(2, '0')}일`;
}

// 해석 칩 유형별 아이콘/스타일 (HOME-02 interpretations[].type)
const CHIP = {
  PERIOD: { icon: 'calendar_month', cls: 'bg-primary-container/10 text-primary border-primary/10' },
  ITEM_TYPE: { icon: 'screenshot', cls: 'bg-secondary-container/20 text-on-secondary-container border-secondary/10' },
  LOCATION: { icon: 'location_on', cls: 'bg-primary-container/10 text-primary border-primary/10' },
  KEYWORD: { icon: 'label', cls: 'bg-secondary-container/20 text-on-secondary-container border-secondary/10' },
};

function ResultCard({ it, onOpen, onToggle }) {
  if (it.vaulted) {
    return (
      <div className="bg-bg-primary rounded-xl overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,0.05),0_10px_20px_rgba(0,0,0,0.02)] flex flex-col active:scale-[0.98] transition-transform">
        <div className="relative aspect-[3/4] bg-surface-container overflow-hidden">
          <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[20px]" style={{ background: 'rgba(255,255,255,0.4)' }}>
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
          </div>
        </div>
        <div className="p-3 flex flex-col gap-1">
          <h3 className="font-headline-sm text-headline-sm text-text-main truncate">{it.title}</h3>
          <div className="flex items-center justify-between">
            <span className="font-caption text-caption text-text-muted">{formatDate(it.savedAt)}</span>
            <span className="material-symbols-outlined text-primary text-[16px]">verified_user</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onOpen(it)}
      className="bg-bg-primary rounded-xl overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,0.05),0_10px_20px_rgba(0,0,0,0.02)] flex flex-col active:scale-[0.98] transition-transform cursor-pointer"
    >
      <div className="relative aspect-[3/4] bg-surface-container overflow-hidden">
        {it.thumbnailUrl && <img alt={it.title} className="w-full h-full object-cover" src={it.thumbnailUrl} />}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(it);
          }}
          className="absolute top-2 right-2 active:scale-90 transition-transform"
        >
          <span
            className={`material-symbols-outlined drop-shadow-md ${it.favorite ? 'text-white' : 'text-white/60'}`}
            style={{ fontVariationSettings: it.favorite ? "'FILL' 1" : "'FILL' 0" }}
          >
            star
          </span>
        </button>
      </div>
      <div className="p-3 flex flex-col gap-1">
        <h3 className="font-headline-sm text-headline-sm text-text-main truncate">{it.title}</h3>
        <div className="flex items-center justify-between">
          <span className="font-caption text-caption text-text-muted">{formatDate(it.savedAt)}</span>
          {typeof it.matchScore === 'number' && (
            <div className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold">{it.matchScore}% 일치</div>
          )}
        </div>
      </div>
    </div>
  );
}

// 정적 도움 제안 (서버 계약 없음 — search_no_results 화면 고정 문구)
const HELP_TIPS = [
  { icon: 'lightbulb', text: '더 넓은 범위의 키워드를 시도해 보세요 (예: 특정 재료 대신 "팬케이크")' },
  { icon: 'filter_alt_off', text: '"지난 24시간" 또는 "이미지만"과 같은 활성 필터를 해제해 보세요' },
  { icon: 'spellcheck', text: '오타나 다른 맞춤법이 있는지 확인해 보세요' },
];

export default function SearchResultsPage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const runSearch = (opts = {}) => {
    setLoading(true);
    search({ q, ...opts })
      .then((d) => setData(d))
      .catch((e) => show(e.message || '검색에 실패했습니다.', { icon: 'error' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // 근본 가드: 빈 q는 계약상 400(q 1~200자) → 호출 생략하고 검색 유도 상태로.
    if (!q.trim()) {
      setData(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    search({ q })
      .then((d) => alive && setData(d))
      .catch((e) => alive && show(e.message || '검색에 실패했습니다.', { icon: 'error' }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const onToggle = async (it) => {
    try {
      const d = await toggleFavorite(it.id, !it.favorite);
      setData((prev) => ({ ...prev, results: prev.results.map((x) => (x.id === it.id ? { ...x, favorite: d.favorite } : x)) }));
    } catch (e) {
      show(e.message, { icon: 'error' });
    }
  };

  const isEmpty = data && data.results.length === 0;

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col">
      {/* Top App Bar */}
      <header className="flex items-center justify-between px-container-padding py-stack-gap-sm w-full z-50 bg-background sticky top-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/home')} className="w-10 h-10 rounded-full bg-primary-container/20 overflow-hidden flex items-center justify-center text-primary active:scale-95 transition-transform">
            <span className="material-symbols-outlined">person</span>
          </button>
          <h1 className="font-headline-md text-headline-md font-bold text-primary">Sortmate</h1>
        </div>
        <button onClick={() => navigate('/home')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors active:scale-95">
          <span className="material-symbols-outlined text-primary">search</span>
        </button>
      </header>

      {/* 검색어 없음 → 검색 유도 (빈 q 가드) */}
      {!q.trim() ? (
        <main className="flex-grow pt-8 pb-32 px-container-padding flex flex-col items-center justify-center max-w-lg mx-auto text-center w-full gap-4">
          <div className="w-20 h-20 rounded-full bg-primary-container/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-4xl">search</span>
          </div>
          <h2 className="font-headline-md text-headline-md text-on-background">무엇을 찾아드릴까요?</h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">홈 화면 검색창에 자연어로 질문해 보세요. (예: "지난달 저장한 와이파이 비번")</p>
          <button onClick={() => navigate('/home')} className="mt-2 py-3 px-6 bg-primary text-on-primary rounded-xl font-headline-sm text-headline-sm active:scale-95 transition-transform">
            검색하러 가기
          </button>
        </main>
      ) : isEmpty ? (
        <main className="flex-grow pt-8 pb-32 px-container-padding flex flex-col items-center max-w-lg mx-auto text-center w-full">
          {/* Search context chip + close */}
          <div className="w-full mb-stack-gap-lg">
            <div className="bg-surface-container-low p-base-unit px-stack-gap-md rounded-full flex items-center gap-stack-gap-sm w-fit mx-auto mb-4 border border-outline-variant/30">
              <span className="material-symbols-outlined text-on-surface-variant text-body-md">search</span>
              <span className="font-body-md text-body-md text-on-surface-variant italic">"{data.query || q}"</span>
              <button onClick={() => navigate('/home')} className="material-symbols-outlined text-on-surface-variant hover:text-error transition-colors text-body-md">close</button>
            </div>
          </div>

          <div className="w-full flex flex-col items-center">
            {/* Illustration */}
            <div className="relative w-64 h-64 mb-8">
              <div className="absolute inset-0 bg-primary-fixed-dim/20 rounded-full blur-3xl scale-110" />
              <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg bg-surface flex items-center justify-center border border-outline-variant/10 text-primary">
                <span className="material-symbols-outlined text-7xl">search_off</span>
              </div>
            </div>

            <h2 className="font-headline-md text-headline-md text-on-background mb-stack-gap-sm">검색 결과가 없습니다</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mb-stack-gap-lg max-w-sm">
              현재 쿼리와 일치하는 스크린샷, 링크 또는 문서를 찾을 수 없습니다.
            </p>

            {/* Static help suggestions */}
            <div className="w-full bg-surface-container rounded-xl p-stack-gap-md mb-stack-gap-lg text-left border border-outline-variant/20 shadow-sm">
              <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-4 opacity-70">도움이 되는 제안</h3>
              <ul className="space-y-stack-gap-sm">
                {HELP_TIPS.map((t) => (
                  <li key={t.icon} className="flex items-center gap-stack-gap-sm font-body-md text-body-md text-on-surface">
                    <span className="material-symbols-outlined text-primary text-[18px]">{t.icon}</span>
                    {t.text}
                  </li>
                ))}
              </ul>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-stack-gap-sm w-full">
              <button
                onClick={() => runSearch({ mode: 'ASSISTANT' })}
                className="w-full py-4 bg-primary text-on-primary rounded-xl font-headline-sm text-headline-sm shadow-[0_4px_12px_rgba(53,37,205,0.25)] flex items-center justify-center gap-stack-gap-sm active:scale-95 transition-transform duration-150"
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_fix_high</span>
                Sortmate에게 물어보기
              </button>
              <button
                onClick={() => runSearch({ mode: 'NORMAL' })}
                className="w-full py-4 bg-transparent border border-primary text-primary rounded-xl font-body-lg text-body-lg hover:bg-primary-fixed/30 transition-colors"
              >
                필터 초기화
              </button>
            </div>
          </div>

          {/* AI assistant hint bubble */}
          {data.assistantHint && (
            <div className="mt-stack-gap-lg p-4 bg-white rounded-2xl border border-primary/10 shadow-lg flex items-center gap-stack-gap-md text-left">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary-container text-headline-sm" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
              </div>
              <div>
                <p className="font-body-md text-body-md text-on-surface leading-tight">"{data.assistantHint}"</p>
              </div>
            </div>
          )}
        </main>
      ) : (
        <main className="flex-1 px-container-padding pb-32">
          {/* Query display */}
          <section className="py-stack-gap-lg">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 text-text-muted">
                <span className="material-symbols-outlined text-[20px]">psychology</span>
                <p className="font-body-md text-body-md">자연어 검색</p>
              </div>
              <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-text-main leading-tight">"{data?.query || q}"</h2>
              {data?.interpretations?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {data.interpretations.map((ip) => {
                    const st = CHIP[ip.type] || CHIP.KEYWORD;
                    return (
                      <div key={ip.label} className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-full font-label-caps text-label-caps ${st.cls}`}>
                        <span className="material-symbols-outlined text-[14px]">{st.icon}</span>
                        {ip.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Results grid */}
          <section className="grid grid-cols-2 gap-grid-gutter mt-2">
            {data?.results?.map((it) => (
              <ResultCard key={it.id} it={it} onOpen={(x) => navigate(`/items/${x.id}`)} onToggle={onToggle} />
            ))}
          </section>

          {/* Refined filters */}
          {data?.refinedFilters?.length > 0 && (
            <section className="mt-stack-gap-lg pt-stack-gap-md border-t border-surface-border">
              <h4 className="font-label-caps text-label-caps text-text-muted mb-4 uppercase tracking-widest">상세 필터</h4>
              <div className="flex flex-col gap-3">
                {data.refinedFilters.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => runSearch({ ...f.params })}
                    className="flex items-center gap-3 p-4 bg-surface rounded-xl hover:bg-surface-container-low transition-colors border border-surface-border group"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined">tune</span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-headline-sm text-headline-sm text-text-main">{f.title}</p>
                      <p className="font-caption text-caption text-text-muted">{f.description}</p>
                    </div>
                    <span className="material-symbols-outlined text-outline">chevron_right</span>
                  </button>
                ))}
              </div>
              <div className="mt-8 text-center pb-12">
                <p className="font-body-md text-body-md text-text-muted">원하는 결과가 없나요?</p>
                <button onClick={() => navigate('/home')} className="mt-3 text-primary font-headline-sm text-headline-sm flex items-center gap-2 mx-auto active:scale-95 transition-transform">
                  다른 검색어 입력하기 <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </section>
          )}
        </main>
      )}

      {/* FAB */}
      <button
        onClick={() => navigate('/items/new-memo')}
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-on-primary rounded-full shadow-[0_8px_16px_rgba(53,37,205,0.3)] flex items-center justify-center z-50 active:scale-90 transition-transform duration-150"
      >
        <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
      </button>

      <BottomNav active="home" />
      <Toast {...toast} shape="rounded" />
    </div>
  );
}
