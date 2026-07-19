import { useCallback, useRef, useState } from 'react';

/**
 * 하단 토스트 표시용 공용 훅. 여러 auth 화면에서 재사용.
 * show(message, { icon, variant }) 호출 시 duration 동안 노출 후 자동 숨김.
 */
export default function useToast(duration = 3000) {
  const [toast, setToast] = useState({ visible: false, message: '', icon: 'check_circle' });
  const timer = useRef(null);

  const show = useCallback(
    (message, { icon = 'check_circle' } = {}) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ visible: true, message, icon });
      timer.current = setTimeout(() => {
        setToast((t) => ({ ...t, visible: false }));
      }, duration);
    },
    [duration]
  );

  return { toast, show };
}
