import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPrivacy, updatePrivacy, requestAccountDeletion } from '../../api/vaultApi';
import BottomNav from '../../components/BottomNav';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

/**
 * privacy_controls_my_002 — 개인정보 제어 (/my/privacy)
 * VAULT-05 조회, VAULT-06 토글 즉시 저장, VAULT-07 계정 데이터 삭제 요청(접수).
 */
const TOGGLES = [
  { key: 'aiTrainingConsent', title: '익명 데이터 AI 학습 허용', desc: '익명화된 패턴을 통해 모델이 학습할 수 있도록 허용하여 Sortmate의 분류 정확도 향상을 도와주세요.' },
  { key: 'usageStatsSharing', title: '사용 통계 공유', desc: '버그 수정 및 환경 최적화를 위해 익명화된 성능 및 사용 지표를 전송합니다.' },
  { key: 'personalizedSuggestions', title: '맞춤형 정리 제안', desc: '사용자의 탐색 및 상호작용 습관을 기반으로 보관할 항목에 대한 스마트한 제안을 받으세요.' },
];

export default function PrivacyControlsPage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [settings, setSettings] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    getPrivacy()
      .then(setSettings)
      .catch((e) => show(e.message || '설정을 불러오지 못했습니다.', { icon: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onToggle = async (key) => {
    const nextVal = !settings[key];
    setSettings((s) => ({ ...s, [key]: nextVal })); // 낙관적 업데이트
    try {
      const d = await updatePrivacy({ [key]: nextVal });
      setSettings(d);
    } catch (e) {
      setSettings((s) => ({ ...s, [key]: !nextVal })); // 롤백
      show(e.message || '저장에 실패했습니다.', { icon: 'error' });
    }
  };

  const onDeleteRequest = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await requestAccountDeletion();
      setConfirmDelete(false);
      show('계정 삭제 요청이 접수되었습니다.', { icon: 'check_circle' });
    } catch (e) {
      show(e.message || '요청에 실패했습니다.', { icon: 'error' });
    }
  };

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pb-24">
      {/* Top AppBar */}
      <header className="sticky top-0 z-50 flex justify-between items-center px-container-padding h-16 w-full bg-surface/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-variant/50 transition-colors"
          >
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface">개인정보 제어</h1>
        </div>
      </header>

      <main className="px-container-padding py-6 space-y-stack-gap-lg">
        {/* Intro */}
        <section className="space-y-stack-gap-sm">
          <h2 className="font-headline-md text-headline-md text-on-surface">데이터 관리</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Sortmate가 일상을 정리하기 위해 정보를 사용하는 방식을 제어하세요. 사용자의 보안이 최우선입니다.
          </p>
        </section>

        {/* Toggles */}
        <section className="space-y-stack-gap-md">
          {TOGGLES.map((t) => {
            const on = !!settings?.[t.key];
            return (
              <div
                key={t.key}
                className={`bg-surface-container-lowest p-5 rounded-xl border shadow-[0px_2px_4px_rgba(0,0,0,0.05)] hover:shadow-md transition-all duration-300 ${
                  on ? 'border-primary/30' : 'border-surface-border'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-body-lg text-body-lg font-semibold text-on-surface">{t.title}</h3>
                    <p className="font-caption text-caption text-on-surface-variant">{t.desc}</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={on}
                    aria-label={t.title}
                    disabled={!settings}
                    onClick={() => onToggle(t.key)}
                    className="relative inline-flex items-center flex-shrink-0 mt-1 disabled:opacity-50"
                  >
                    <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${on ? 'bg-primary' : 'bg-outline-variant'}`}>
                      <div
                        className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform duration-200 ${
                          on ? 'translate-x-5' : ''
                        }`}
                      />
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {/* Encryption highlight */}
        <section className="relative h-32 rounded-xl overflow-hidden bg-primary-container/10 flex items-center p-6 gap-6">
          <div className="flex-1 z-10">
            <h4 className="font-label-caps text-label-caps text-primary tracking-widest mb-1">데이터 암호화</h4>
            <p className="font-body-md text-body-md text-on-primary-fixed-variant leading-tight">
              사용자의 데이터는 기기를 떠나기 전 항상 표준 AES-256 프로토콜로 암호화됩니다.
            </p>
          </div>
          <div className="flex-shrink-0 relative w-16 h-16 flex items-center justify-center bg-white rounded-full shadow-lg z-10">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
          </div>
          <div className="absolute right-0 top-0 w-1/2 h-full opacity-20 pointer-events-none">
            <div className="w-full h-full bg-gradient-to-br from-primary to-transparent blur-3xl rounded-full translate-x-12 -translate-y-8" />
          </div>
        </section>

        {/* Data deletion */}
        <section className="bg-error-container/20 p-6 rounded-xl border border-error/10 space-y-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-error">delete_forever</span>
            <h3 className="font-headline-sm text-headline-sm text-error">데이터 삭제</h3>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            이 작업은 서버에서 모든 스크린샷, 태그 및 계정 정보를 영구적으로 삭제합니다. 이 작업은 취소할 수 없습니다.
          </p>
          <button
            onClick={onDeleteRequest}
            className="w-full py-4 px-6 bg-white border border-error text-error font-semibold rounded-xl active:scale-[0.98] transition-transform hover:bg-error/5 flex justify-center items-center gap-2"
          >
            {confirmDelete ? '정말 삭제를 요청하시겠습니까? 한 번 더 탭' : '계정 탈퇴 요청'}
          </button>
        </section>
      </main>

      <BottomNav active="my" />
      <Toast {...toast} shape="rounded" />
    </div>
  );
}
