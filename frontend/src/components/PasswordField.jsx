import { useState } from 'react';

/**
 * 라벨 + 표시/숨김 토글이 있는 비밀번호 입력.
 * set_new_password 화면에서 2회 반복되므로 공용화.
 */
export default function PasswordField({ id, label, placeholder, value, onChange }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-stack-gap-sm">
      <label
        className="block font-label-caps text-label-caps text-on-surface-variant tracking-wider uppercase"
        htmlFor={id}
      >
        {label}
      </label>
      <div className="relative group">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-md text-body-lg placeholder:text-outline"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
          aria-label={visible ? '비밀번호 숨기기' : '비밀번호 표시'}
        >
          <span className="material-symbols-outlined text-[20px]">
            {visible ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>
    </div>
  );
}
