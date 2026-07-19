import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getStatus, unlock, setPin } from '../../api/vaultApi';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

/**
 * app_lock_pin_entry_com_006 — 보안 잠금 PIN 입력 (/vault/unlock)
 * VAULT-02 상태 조회, VAULT-03 잠금 해제(6자리 자동 제출), VAULT-01 최초 설정.
 * 성공 시 ?next 경로(없으면 /home)로 이동.
 * [가정] PIN 미설정(pinSet=false) 상태면 최초 입력을 설정으로 처리 후 곧바로 해제(별도 확인 UI 화면 없음).
 * [가정] Face ID: 서버 API 없음 → 웹 데모에서는 안내만, 실제 해제는 PIN 입력.
 */
const KEYS = [
  { d: '1', s: '' }, { d: '2', s: 'ABC' }, { d: '3', s: 'DEF' },
  { d: '4', s: 'GHI' }, { d: '5', s: 'JKL' }, { d: '6', s: 'MNO' },
  { d: '7', s: 'PQRS' }, { d: '8', s: 'TUV' }, { d: '9', s: 'WXYZ' },
];

export default function PinEntryPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/home';
  const { toast, show } = useToast();

  const [pin, setPinValue] = useState('');
  const [pinSet, setPinSet] = useState(true);
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getStatus()
      .then((s) => setPinSet(!!s.pinSet))
      .catch(() => {});
  }, []);

  const append = (digit) => {
    if (busy || pin.length >= 6) return;
    const nextPin = pin + digit;
    setPinValue(nextPin);
    if (nextPin.length === 6) submit(nextPin);
  };

  const remove = () => {
    if (busy) return;
    setPinValue((p) => p.slice(0, -1));
  };

  const submit = async (value) => {
    setBusy(true);
    try {
      if (!pinSet) {
        await setPin({ newPin: value });
        setPinSet(true);
      }
      await unlock(value);
      navigate(next, { replace: true });
    } catch (e) {
      setShake(true);
      setPinValue('');
      setTimeout(() => setShake(false), 500);
      const msg =
        e.code === 'VAULT_LOCKED_OUT'
          ? e.message || '시도 횟수를 초과했습니다. 잠시 후 다시 시도하세요.'
          : e.message || 'PIN이 일치하지 않습니다.';
      show(msg, { icon: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col font-body-md overflow-hidden">
      <header className="w-full flex justify-between items-center px-6 pt-12 pb-4">
        <div className="text-primary font-bold tracking-tight">
          <span className="font-display-lg text-display-lg">Sortmate</span>
        </div>
        <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center px-container-padding">
        <div className="text-center mb-10">
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-2">
            {pinSet ? '보안 잠금' : 'PIN 설정'}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {pinSet ? '금고에 액세스하려면 6자리 PIN을 입력하세요' : '금고를 보호할 6자리 PIN을 설정하세요'}
          </p>
        </div>

        {/* PIN Dots */}
        <div className={`flex gap-4 mb-16 ${shake ? 'error-shake' : ''}`}>
          {Array.from({ length: 6 }).map((_, i) => {
            const filled = i < pin.length;
            return (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  shake && filled
                    ? 'bg-error border-error'
                    : filled
                    ? 'bg-primary border-primary scale-110'
                    : 'border-outline-variant bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {/* Face ID (데모: 안내만) */}
        <button
          onClick={() => show('웹 데모에서는 PIN으로 잠금을 해제하세요.', { icon: 'info' })}
          className="flex flex-col items-center gap-2 mb-12 hover:opacity-70 transition-opacity"
        >
          <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'wght' 300" }}>face</span>
          </div>
          <span className="font-caption text-caption text-primary font-medium">Face ID 사용</span>
        </button>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-y-4 gap-x-8 w-full max-w-xs">
          {KEYS.map((k) => (
            <button
              key={k.d}
              onClick={() => append(k.d)}
              className="w-20 h-20 rounded-full flex flex-col items-center justify-center bg-surface-container-low hover:bg-surface-container-high active:scale-90 transition-all"
            >
              <span className="font-headline-md text-headline-md text-on-surface">{k.d}</span>
              {k.s && <span className="text-[10px] text-on-surface-variant tracking-widest font-bold">{k.s}</span>}
            </button>
          ))}
          <div className="w-20 h-20" />
          <button
            onClick={() => append('0')}
            className="w-20 h-20 rounded-full flex items-center justify-center bg-surface-container-low hover:bg-surface-container-high active:scale-90 transition-all"
          >
            <span className="font-headline-md text-headline-md text-on-surface">0</span>
          </button>
          <button
            onClick={remove}
            className="w-20 h-20 rounded-full flex items-center justify-center hover:bg-surface-container-low active:scale-90 transition-all text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-2xl">backspace</span>
          </button>
        </div>
      </main>

      <footer className="w-full py-8 px-container-padding flex flex-col items-center gap-4">
        <a
          href="mailto:support@sortmate.app"
          className="text-primary font-body-md font-semibold hover:underline decoration-2 underline-offset-4"
        >
          비밀번호를 잊으셨나요? 고객 지원팀에 문의하세요
        </a>
        <div className="w-32 h-1 bg-outline-variant/30 rounded-full mb-2" />
      </footer>

      <Toast {...toast} shape="rounded" iconClassName="text-error" />
    </div>
  );
}
