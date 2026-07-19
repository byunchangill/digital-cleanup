/**
 * 하단 토스트. 화면 HTML의 토스트(inverse-surface 배경, 하단 중앙, 슬라이드 인)를 공용화.
 * useToast 훅과 함께 사용: <Toast {...toast} />
 * - shape: 'pill'(rounded-full, reset_password) | 'rounded'(rounded-xl, 그 외)
 */
export default function Toast({ visible, message, icon = 'check_circle', shape = 'pill', iconClassName = 'text-secondary-fixed' }) {
  const radius = shape === 'pill' ? 'rounded-full' : 'rounded-xl';
  return (
    <div
      className={`fixed bottom-10 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-6 py-3 ${radius} font-body-md text-body-md shadow-2xl flex items-center gap-3 transition-all duration-500 ease-out z-[100] ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'
      }`}
      role="status"
      aria-live="polite"
    >
      <span className={`material-symbols-outlined ${iconClassName}`}>{icon}</span>
      <span>{message}</span>
    </div>
  );
}
