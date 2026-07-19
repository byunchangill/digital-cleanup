import { useNavigate } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';

/**
 * 마이 홈/허브 (/my). [가정] 별도 Stitch 화면 설계가 없어 메뉴 리스트로 구성.
 * BottomNav "마이" 탭 목적지. 각 my 하위 화면 + 기존 프라이버시/정리 설정으로 연결.
 */
const MENU = [
  { icon: 'notifications', label: '알림', desc: 'AI 분석 · 시스템 · 혜택 소식', to: '/my/notifications' },
  { icon: 'cloud_download', label: '데이터 내보내기', desc: '보관 자료를 .zip으로 백업', to: '/my/export' },
  { icon: 'donut_large', label: '저장공간', desc: '유형별 사용량과 대용량 자산', to: '/my/storage' },
  { icon: 'workspace_premium', label: '플랜', desc: '무료 · 프리미엄 비교/업그레이드', to: '/my/plan' },
  { icon: 'shield', label: '프라이버시 및 보안', desc: 'AI 학습 동의 · 앱 잠금', to: '/my/privacy' },
  { icon: 'tune', label: '정리 설정', desc: '자동 정리 규칙 관리', to: '/cleanup/settings' },
];

export default function MyHomePage() {
  const navigate = useNavigate();
  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen pb-28">
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-container-padding h-16 bg-surface/80 backdrop-blur-md shadow-sm">
        <h1 className="font-headline-md text-headline-md font-bold text-primary">마이</h1>
        <button onClick={() => navigate('/my/notifications')} className="p-2 text-primary active:scale-95 transition-transform">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </header>

      <main className="pt-24 px-container-padding max-w-2xl mx-auto space-y-3">
        {MENU.map((m) => (
          <button
            key={m.to}
            onClick={() => navigate(m.to)}
            className="w-full flex items-center gap-4 p-4 bg-surface-container-lowest rounded-xl border border-surface-border shadow-[0px_2px_4px_rgba(0,0,0,0.05),0px_10px_20px_rgba(0,0,0,0.02)] active:scale-[0.98] transition-transform text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined">{m.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body-lg text-body-lg font-semibold text-on-surface">{m.label}</p>
              <p className="font-caption text-caption text-on-surface-variant truncate">{m.desc}</p>
            </div>
            <span className="material-symbols-outlined text-outline">chevron_right</span>
          </button>
        ))}

        <button
          onClick={() => navigate('/my/delete-account')}
          className="w-full flex items-center gap-4 p-4 mt-2 text-left text-error"
        >
          <div className="w-12 h-12 rounded-xl bg-error-container/30 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined">delete_forever</span>
          </div>
          <div className="flex-1">
            <p className="font-body-lg text-body-lg font-semibold">계정 탈퇴</p>
            <p className="font-caption text-caption text-on-surface-variant">계정과 모든 데이터를 삭제</p>
          </div>
          <span className="material-symbols-outlined text-error/60">chevron_right</span>
        </button>
      </main>

      <BottomNav active="my" />
    </div>
  );
}
