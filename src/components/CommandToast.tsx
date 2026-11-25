import { useEffect, useState } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { useStore } from '../lib/store.tsx';

export function CommandToast() {
  const { cmdAt, cmdError, cmdStatus } = useStore();
  const [visible, setVisible] = useState(false);

  const message = cmdError || cmdStatus;
  const isError = Boolean(cmdError);

  useEffect(() => {
    if (!cmdAt || !message) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(timer);
  }, [cmdAt, message]);

  if (!visible || !message) return null;

  return (
    <div
      className={`fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-md items-start gap-2.5 rounded-2xl border px-4 py-3 text-[12px] font-semibold shadow-float sm:inset-x-auto sm:bottom-6 sm:right-6 sm:mx-0 ${
        isError
          ? 'border-danger-line bg-danger-soft text-danger'
          : 'border-primary-line bg-primary-soft text-primary-dark'
      }`}
      role="status"
      aria-live="polite"
    >
      {isError ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <Check className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span className="flex-1 leading-snug">{message}</span>
      <button
        type="button"
        className="shrink-0 opacity-70 hover:opacity-100"
        aria-label="Tutup notifikasi"
        onClick={() => setVisible(false)}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
