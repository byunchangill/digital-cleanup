import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExportOptions, startExport, getExportJob, cancelExport } from '../../api/myApi';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';
import formatBytes from '../../lib/formatBytes';

/**
 * export_options_my_005 + data_export_progress_my_005 통합 (/my/export).
 * phase: OPTIONS(유형/저장위치 선택 · MY-03/04) → RUNNING(진행 폴링 3초 · MY-05) → DONE.
 * 취소(MY-06)는 RUNNING에서. "백그라운드에서 진행"은 서버 호출 없이 옵션 화면으로 복귀(잡은 계속 진행).
 */
const DATA_ICON = { JSON_METADATA: 'data_object', ORIGINAL_FILES: 'image' };
const DEST_ICON = { DOWNLOAD: 'download', GOOGLE_DRIVE: 'cloud_upload', EMAIL: 'mail' };

export default function ExportPage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [options, setOptions] = useState(null);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [destination, setDestination] = useState('DOWNLOAD');
  const [phase, setPhase] = useState('OPTIONS'); // OPTIONS | RUNNING | DONE
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    getExportOptions()
      .then((d) => {
        setOptions(d);
        setSelectedTypes(d.dataTypes.filter((t) => t.defaultSelected).map((t) => t.type));
        const def = d.destinations.find((x) => x.defaultSelected);
        if (def) setDestination(def.type);
      })
      .catch((e) => show(e.message || '옵션을 불러오지 못했습니다.', { icon: 'error' }));
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleType = (type) =>
    setSelectedTypes((cur) => (cur.includes(type) ? cur.filter((t) => t !== type) : [...cur, type]));

  const beginPolling = (jobId) => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const j = await getExportJob(jobId);
        setJob(j);
        if (['DONE', 'FAILED', 'CANCELED'].includes(j.status)) {
          clearInterval(pollRef.current);
          if (j.status === 'DONE') setPhase('DONE');
          if (j.status === 'FAILED') show(j.error || '내보내기 실패', { icon: 'error' });
          if (j.status === 'CANCELED') setPhase('OPTIONS');
        }
      } catch (e) {
        clearInterval(pollRef.current);
        show(e.message || '진행 상태를 불러오지 못했습니다.', { icon: 'error' });
      }
    }, 3000); // 계약 [가정] 폴링 3초
  };

  const onStart = async () => {
    if (!selectedTypes.length) { show('데이터 유형을 1개 이상 선택하세요.', { icon: 'error' }); return; }
    setBusy(true);
    try {
      const j = await startExport({ dataTypes: selectedTypes, destination });
      setJob(j);
      setPhase('RUNNING');
      beginPolling(j.exportJobId);
    } catch (e) {
      show(e.message || '내보내기를 시작하지 못했습니다.', { icon: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const onCancel = async () => {
    clearInterval(pollRef.current);
    try {
      if (job?.exportJobId) await cancelExport(job.exportJobId);
    } catch {
      /* 이미 종료된 잡이면 무시 */
    }
    setPhase('OPTIONS');
    setJob(null);
  };

  const onBackground = () => {
    clearInterval(pollRef.current); // 잡은 서버에서 계속 진행. 화면만 이탈.
    navigate('/my');
  };

  // ── 진행/완료 화면 ─────────────────────────────
  if (phase === 'RUNNING' || phase === 'DONE') {
    const pct = job?.progressPercent ?? 0;
    const done = phase === 'DONE';
    return (
      <div className="flex flex-col min-h-screen bg-background text-on-surface font-body-md">
        <header className="fixed top-0 w-full z-50 flex justify-between items-center px-container-padding h-16 bg-surface shadow-sm">
          <div className="flex items-center gap-stack-gap-md">
            <button onClick={onBackground} className="material-symbols-outlined text-on-surface-variant">close</button>
            <h1 className="font-headline-sm text-headline-sm text-primary font-bold">데이터 내보내기</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary font-bold text-caption">JD</div>
        </header>

        <main className="flex-grow pt-24 pb-12 px-container-padding flex flex-col items-center justify-center">
          <div className="w-full max-w-md flex flex-col items-center gap-stack-gap-lg">
            <div className="relative mb-stack-gap-md">
              <div className="w-24 h-24 rounded-full bg-primary-fixed flex items-center justify-center text-primary relative z-10">
                <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {done ? 'task_alt' : 'enhanced_encryption'}
                </span>
              </div>
              {!done && <div className="absolute inset-0 bg-primary opacity-20 rounded-full animate-ping -z-0" />}
            </div>

            <div className="text-center space-y-2">
              <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{done ? '내보내기 완료' : '데이터 내보내는 중'}</h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-[280px] mx-auto">
                {done ? '아카이브가 준비되었습니다. 아래에서 다운로드하세요.' : '자산을 수집하고 아카이브를 준비하고 있습니다...'}
              </p>
            </div>

            <div className="w-full bg-surface-container-low p-stack-gap-md rounded-xl shadow-[0px_2px_4px_rgba(0,0,0,0.05),0px_10px_20px_rgba(0,0,0,0.02)] space-y-stack-gap-md">
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="font-label-caps text-label-caps text-primary uppercase tracking-widest">현재 작업</span>
                  <span className="font-body-lg text-body-lg font-semibold">{job?.currentTask || '준비 중'}</span>
                </div>
                <span className="font-display-lg text-display-lg text-primary">{pct}%</span>
              </div>
              <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              {job?.encrypted && (
                <div className="flex items-center gap-2 bg-surface p-2 rounded-lg border border-surface-border">
                  <span className="material-symbols-outlined text-secondary text-[18px]">verified_user</span>
                  <span className="font-caption text-caption text-secondary">종단간 암호화된 JSON 패키지</span>
                </div>
              )}
            </div>

            <div className="w-full mt-stack-gap-lg flex flex-col gap-stack-gap-md">
              {done ? (
                <>
                  <a
                    href={job?.downloadUrl || '#'}
                    className="w-full py-4 bg-primary text-on-primary rounded-xl font-body-lg font-bold shadow-lg text-center active:scale-95 transition-all"
                  >
                    {job?.resultBytes ? `다운로드 (${formatBytes(job.resultBytes)})` : '다운로드'}
                  </a>
                  <button onClick={() => navigate('/my')} className="w-full py-3 text-on-surface-variant font-body-md font-semibold rounded-xl">완료</button>
                </>
              ) : (
                <>
                  <button onClick={onBackground} className="w-full py-4 bg-primary text-on-primary rounded-xl font-body-lg font-bold shadow-lg active:scale-95 transition-all">백그라운드에서 진행</button>
                  <button onClick={onCancel} className="w-full py-3 bg-transparent text-error font-body-md font-semibold hover:bg-error-container/10 rounded-xl transition-colors">내보내기 취소</button>
                </>
              )}
            </div>
          </div>
        </main>
        <Toast {...toast} shape="rounded" />
      </div>
    );
  }

  // ── 옵션 화면 ─────────────────────────────
  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex flex-col">
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-container-padding h-16 bg-surface shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/my')} className="w-10 h-10 flex items-center justify-center hover:bg-surface-container-low rounded-full transition-colors">
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </button>
          <h1 className="font-headline-sm text-headline-sm text-on-surface">일괄 내보내기</h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary font-bold text-caption">JD</div>
      </header>

      <main className="flex-grow pt-24 pb-32 px-container-padding max-w-lg mx-auto w-full">
        <div className="mb-stack-gap-lg">
          <h2 className="font-headline-md text-headline-md text-primary mb-2">콘텐츠 내보내기</h2>
          <p className="text-on-surface-variant font-body-md">외부 저장소로 이동하거나 백업하기 위해 보관된 스크린샷과 링크를 준비합니다.</p>
        </div>

        <div className="space-y-stack-gap-lg">
          <section className="space-y-stack-gap-md">
            <div className="flex items-center justify-between">
              <h3 className="font-label-caps text-label-caps text-outline uppercase tracking-wider">데이터 유형 선택</h3>
              <span className="text-caption text-primary font-medium">{(options?.itemCount ?? 0).toLocaleString()}개 항목 선택됨</span>
            </div>
            <div className="grid gap-stack-gap-sm">
              {(options?.dataTypes || []).map((t) => (
                <label key={t.type} className="group flex items-center p-4 bg-surface rounded-xl border border-surface-border cursor-pointer hover:border-primary transition-all">
                  <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center mr-4 group-hover:bg-primary-fixed transition-colors">
                    <span className="material-symbols-outlined text-primary">{DATA_ICON[t.type] || 'folder'}</span>
                  </div>
                  <div className="flex-grow">
                    <span className="block font-headline-sm text-body-lg text-on-surface">{t.label}</span>
                    <span className="text-caption text-on-surface-variant">{t.description}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(t.type)}
                    onChange={() => toggleType(t.type)}
                    className="w-6 h-6 rounded-md border-outline-variant text-primary focus:ring-primary"
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-stack-gap-md pt-4">
            <h3 className="font-label-caps text-label-caps text-outline uppercase tracking-wider">저장 위치 선택</h3>
            <div className="grid grid-cols-1 gap-stack-gap-sm">
              {(options?.destinations || []).map((d) => {
                const disabled = !d.available;
                const active = destination === d.type;
                return (
                  <button
                    key={d.type}
                    type="button"
                    disabled={disabled}
                    onClick={() => setDestination(d.type)}
                    className={`flex items-center p-4 rounded-xl border transition-all text-left ${
                      active ? 'border-primary bg-primary-fixed' : 'border-surface-border bg-surface'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className="material-symbols-outlined text-on-surface mr-3">{DEST_ICON[d.type] || 'save'}</span>
                    <span className="font-body-md text-on-surface font-semibold">{d.label}</span>
                    {disabled && <span className="ml-auto font-caption text-caption text-outline">준비 중</span>}
                    {active && !disabled && (
                      <span className="material-symbols-outlined text-primary ml-auto" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="p-4 bg-surface-container-low rounded-xl flex items-start gap-3 border border-dashed border-outline-variant">
            <span className="material-symbols-outlined text-secondary text-headline-sm">info</span>
            <div>
              <p className="text-caption text-on-surface font-medium">예상 내보내기 크기: {formatBytes(options?.estimatedBytes)}</p>
              <p className="text-caption text-on-surface-variant">
                파일 크기가 {formatBytes(options?.splitThresholdBytes)}를 초과할 경우 여러 개의 압축 파일로 나뉘어 저장됩니다.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 w-full bg-surface-container-lowest p-container-padding flex flex-col gap-3 shadow-[0px_-4px_20px_rgba(0,0,0,0.08)] rounded-t-[24px] max-w-lg mx-auto left-1/2 -translate-x-1/2">
        <button
          onClick={onStart}
          disabled={busy}
          className="w-full h-14 bg-primary text-on-primary font-headline-sm rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-70"
        >
          <span>내보내기 시작</span>
          <span className={`material-symbols-outlined ${busy ? 'animate-spin' : ''}`}>{busy ? 'sync' : 'rocket_launch'}</span>
        </button>
        <p className="text-center text-caption text-outline">내보내기가 준비되면 알림을 보내드립니다.</p>
      </footer>
      <Toast {...toast} shape="rounded" />
    </div>
  );
}
