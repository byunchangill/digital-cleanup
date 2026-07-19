import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, updateSettings } from '../../api/cleanupApi';
import BottomNav from '../../components/BottomNav';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';
import formatBytes from '../../lib/formatBytes';

/**
 * cleanup_settings_my_004_2 — 정리 설정 (/cleanup/settings, 마이 탭 진입)
 * CLEAN-09 조회 + CLEAN-10 부분 저장. 토글은 즉시 저장, 슬라이더는 드래그 종료 시 저장.
 * hero monthlySavedBytes 는 읽기 전용 파생값. 경고 문구는 정적 카피.
 */
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${checked ? 'bg-primary' : 'bg-outline-variant'}`}
    >
      <span className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

export default function CleanupSettingsPage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [settings, setSettings] = useState(null);
  const [days, setDays] = useState(90); // 슬라이더 라이브 표시값

  useEffect(() => {
    getSettings()
      .then((d) => {
        setSettings(d);
        setDays(d.unusedThresholdDays);
      })
      .catch((e) => show(e.message || '불러오지 못했습니다.', { icon: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (patch) => {
    try {
      const d = await updateSettings(patch);
      setSettings(d);
      setDays(d.unusedThresholdDays);
      show('설정이 저장되었습니다.', { icon: 'check_circle' });
    } catch (e) {
      // 실패 시 서버 상태로 롤백
      if (settings) setDays(settings.unusedThresholdDays);
      show(e.message || '저장 실패', { icon: 'error' });
    }
  };

  if (!settings) {
    return (
      <div className="bg-surface min-h-screen flex items-center justify-center text-on-surface-variant">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen overflow-x-hidden pb-32">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-container-padding h-16 bg-surface shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:opacity-80 transition-opacity duration-200">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="font-headline-sm text-headline-sm text-on-surface">정리 설정</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/search')} className="material-symbols-outlined text-primary hover:opacity-80 cursor-pointer transition-opacity duration-200">search</button>
        </div>
      </header>

      <main className="pt-24 pb-32 px-container-padding max-w-lg mx-auto">
        {/* Hero Status Card */}
        <div className="mb-stack-gap-lg p-6 bg-primary-container rounded-xl shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <span className="font-label-caps text-label-caps bg-on-primary-container text-primary-container px-2 py-1 rounded">시스템 상태</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-white mb-2">최적화된 상태</h2>
            <p className="text-on-primary-container text-body-md opacity-90">
              이번 달 자동 정리를 통해 워크스페이스에서 {formatBytes(settings.monthlySavedBytes)}의 저장 공간을 절약했습니다.
            </p>
          </div>
        </div>

        {/* Automation */}
        <div className="mb-stack-gap-lg">
          <h3 className="font-label-caps text-label-caps text-text-muted mb-4 px-1">자동화 규칙</h3>
          <div className="space-y-grid-gutter">
            <div className="bento-card bg-bg-primary p-5 rounded-xl border border-surface-border shadow-[0px_2px_4px_rgba(0,0,0,0.05),0px_10px_20px_rgba(0,0,0,0.02)] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">delete_sweep</span>
                </div>
                <div>
                  <p className="font-body-lg text-body-lg font-semibold text-text-main leading-tight">휴지통으로 자동 이동</p>
                  <p className="text-caption text-caption text-text-muted mt-0.5">만료일이 지난 항목 이동</p>
                </div>
              </div>
              <Toggle checked={settings.autoTrashExpired} onChange={(v) => save({ autoTrashExpired: v })} />
            </div>

            <div className="bento-card bg-bg-primary p-5 rounded-xl border border-surface-border shadow-[0px_2px_4px_rgba(0,0,0,0.05),0px_10px_20px_rgba(0,0,0,0.02)] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">auto_awesome</span>
                </div>
                <div>
                  <p className="font-body-lg text-body-lg font-semibold text-text-main leading-tight">스마트 스크린샷 감지</p>
                  <p className="text-caption text-caption text-text-muted mt-0.5">AI가 불필요한 임시 파일을 식별</p>
                </div>
              </div>
              <Toggle checked={settings.smartScreenshotDetection} onChange={(v) => save({ smartScreenshotDetection: v })} />
            </div>
          </div>
        </div>

        {/* Thresholds */}
        <div className="mb-stack-gap-lg">
          <h3 className="font-label-caps text-label-caps text-text-muted mb-4 px-1">보관 임계값</h3>
          <div className="bento-card bg-bg-primary p-6 rounded-xl border border-surface-border shadow-[0px_2px_4px_rgba(0,0,0,0.05),0px_10px_20px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">history</span>
              </div>
              <div>
                <p className="font-body-lg text-body-lg font-semibold text-text-main">미사용 자료 기준</p>
                <p className="text-caption text-caption text-text-muted">일정 기간 활동이 없는 콘텐츠 보관</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-body-md font-semibold text-primary">
                <span>{days}일</span>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>edit</span>
              </div>
              <input
                type="range"
                min="30"
                max="365"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                onMouseUp={(e) => save({ unusedThresholdDays: Number(e.target.value) })}
                onTouchEnd={(e) => save({ unusedThresholdDays: Number(e.target.value) })}
                className="w-full h-1.5 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-caption text-text-muted">
                <span>30일</span>
                <span>180일</span>
                <span>365일</span>
              </div>
            </div>
          </div>
        </div>

        {/* Warning Card */}
        <div className="p-4 bg-error-container/20 border border-error-container rounded-xl flex gap-4 items-start">
          <span className="material-symbols-outlined text-error">info</span>
          <p className="text-caption text-on-error-container">
            자동 정리는 <strong>비밀 금고</strong>에 있는 항목이나 <span className="bg-primary/10 px-1 rounded text-primary">영구 보관</span> 태그가 지정된 항목은 절대 삭제하지 않습니다.
          </p>
        </div>
      </main>

      <BottomNav active="cleanup" />
      <Toast {...toast} shape="rounded" />
    </div>
  );
}
