import { FormEvent, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { useStore } from '../lib/store.tsx';

export function LoginModal() {
  const { loginOpen, setLoginOpen, login } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loginOpen) return;
    setError('');
    setLoading(false);
    const id = requestAnimationFrame(() => emailRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [loginOpen]);

  if (!loginOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!email.trim() || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-sidebar/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) setLoginOpen(false);
      }}
    >
      <div
        className="card w-full max-w-sm overflow-hidden shadow-float"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 id="login-modal-title" className="text-[15px] font-bold text-ink">
              Masuk sebagai admin
            </h2>
            <p className="mt-0.5 text-[11.5px] text-muted">
              Tamu tetap bisa melihat data. Login diperlukan untuk kendali.
            </p>
          </div>
          <button
            className="btn-icon h-8 w-8"
            type="button"
            aria-label="Tutup"
            onClick={() => setLoginOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="space-y-3.5 px-5 py-4" onSubmit={handleSubmit}>
          <div>
            <label className="label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              ref={emailRef}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              type="email"
              autoComplete="username"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2 text-[11.5px] font-semibold text-danger">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <button className="btn btn-primary w-full" type="submit" disabled={loading}>
            {!loading && <ShieldCheck className="h-4 w-4" />}
            {loading ? 'Memeriksa…' : 'Masuk'}
          </button>

          <p className="text-center text-[10.5px] leading-snug text-faint">
            Sesi disimpan di browser ini sampai kamu keluar.
          </p>
        </form>
      </div>
    </div>
  );
}
