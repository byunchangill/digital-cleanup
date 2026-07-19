import { useNavigate } from 'react-router-dom';

/**
 * 하단 5탭 네비게이션 (홈/라이브러리/[FAB]/정리/마이).
 * favorites 화면 HTML의 nav를 공용화. active prop 으로 현재 탭 강조.
 * 홈/정리/마이는 타 모듈 소관이라 라우트 미정 → [가정] 라이브러리/즐겨찾기 계열만 연결.
 */
const ITEMS = [
  { key: 'home', icon: 'home', label: '홈', to: '/home' },
  { key: 'library', icon: 'grid_view', label: '라이브러리', to: '/library' },
  null, // FAB 자리 스페이서
  { key: 'cleanup', icon: 'auto_delete', label: '정리', to: '/cleanup' },
  { key: 'my', icon: 'person', label: '마이', to: '/my' },
];

export default function BottomNav({ active = 'library' }) {
  const navigate = useNavigate();
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 bg-surface shadow-[0_-2px_10px_rgba(0,0,0,0.05)] rounded-t-xl flex justify-around items-center px-4 pb-8 pt-2">
      {ITEMS.map((it, i) =>
        it === null ? (
          <div key={i} className="w-12" />
        ) : (
          <button
            key={it.key}
            onClick={() => navigate(it.to)}
            className={
              active === it.key
                ? 'flex flex-col items-center justify-center text-primary bg-primary-container/10 rounded-xl p-2 active:scale-90 transition-transform duration-200'
                : 'flex flex-col items-center justify-center text-on-surface-variant p-2 hover:bg-surface-container-low transition-all'
            }
          >
            <span
              className="material-symbols-outlined"
              style={active === it.key ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {it.icon}
            </span>
            <span className="font-label-caps text-label-caps mt-1">{it.label}</span>
          </button>
        )
      )}
    </nav>
  );
}
