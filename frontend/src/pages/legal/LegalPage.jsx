import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import termsMd from '../../legal/terms-of-service.md?raw';
import privacyMd from '../../legal/privacy-policy.md?raw';

/**
 * terms_and_policies_com_005 — 약관 및 정책 (/legal)
 * 이용 약관 / 개인정보 처리방침 탭. 콘텐츠는 src/legal/*.md 전문을 ?raw로 번들에 정적 포함.
 * 신규 의존성 없이 라인 기반 최소 md 변환(제목/목록/인용/표행/문단). placeholder는 원문 그대로 노출.
 * ponytail: 라인 단위 렌더러 — 표는 monospace 행으로 표시(정식 표 파서 불필요). md 문법 확장 시 교체.
 */
function renderMarkdown(src) {
  return src.split('\n').map((raw, i) => {
    const line = raw.trimEnd();
    if (!line.trim()) return <div key={i} className="h-2" />;
    if (line.startsWith('### ')) return <h3 key={i} className="font-headline-sm text-headline-sm text-on-surface mt-4">{line.slice(4)}</h3>;
    if (line.startsWith('## ')) return <h2 key={i} className="font-headline-sm text-headline-sm text-on-surface mt-6">{line.slice(3)}</h2>;
    if (line.startsWith('# ')) return <h1 key={i} className="font-headline-md text-headline-md text-on-surface mt-2 mb-2">{line.slice(2)}</h1>;
    if (line.startsWith('> ')) return <p key={i} className="text-caption font-caption text-text-muted">{line.slice(2)}</p>;
    if (line.startsWith('|')) return <pre key={i} className="font-label-caps text-[11px] text-on-surface-variant overflow-x-auto whitespace-pre">{line}</pre>;
    if (/^\s*[-*]\s+/.test(line)) return <li key={i} className="list-disc ml-6">{line.replace(/^\s*[-*]\s+/, '')}</li>;
    if (/^\s*\d+\.\s+/.test(line)) return <li key={i} className="list-decimal ml-6">{line.replace(/^\s*\d+\.\s+/, '')}</li>;
    return <p key={i} className="leading-relaxed">{line}</p>;
  });
}

const TABS = [
  { key: 'terms', label: '이용 약관', md: termsMd },
  { key: 'privacy', label: '개인정보 처리방침', md: privacyMd },
];

export default function LegalPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('terms');
  const active = TABS.find((t) => t.key === tab);

  return (
    <div className="bg-background text-on-surface font-body-lg min-h-screen flex flex-col">
      <header className="bg-surface/80 backdrop-blur-md w-full sticky top-0 z-40 flex items-center justify-between px-container-padding h-16 border-b border-surface-border">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-surface-container-high transition-colors active:scale-95 text-on-surface-variant" aria-label="뒤로 가기">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="font-headline-sm text-headline-sm text-on-surface flex-1 text-center font-bold tracking-tight">약관 및 정책</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 flex flex-col w-full max-w-3xl mx-auto px-container-padding py-stack-gap-lg">
        <div className="flex border-b border-surface-border mb-stack-gap-md sticky top-16 bg-background z-30 pt-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-center font-body-md text-body-md rounded-t-lg transition-colors ${
                tab === t.key ? 'border-b-2 border-primary text-primary font-semibold' : 'text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pb-32 text-on-surface-variant font-body-md text-body-md space-y-1">
          {renderMarkdown(active.md)}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full bg-surface/90 backdrop-blur-md border-t border-surface-border px-container-padding py-4 pb-8 z-50 flex justify-center">
        <button onClick={() => navigate(-1)} className="w-full max-w-sm bg-primary text-on-primary font-body-lg font-semibold py-3 px-6 rounded-xl shadow-lg hover:bg-surface-tint active:scale-95 transition-all flex items-center justify-center gap-2">
          <span>확인</span>
          <span className="material-symbols-outlined text-[20px]">check</span>
        </button>
      </div>
    </div>
  );
}
