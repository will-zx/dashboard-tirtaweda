import { useEffect, useRef, useState } from 'react';
import { Check, Leaf, Pencil, X } from 'lucide-react';
import { useStore } from '../lib/store.tsx';

export function ZoneMenu() {
  const {
    zones,
    labels,
    currentZone,
    zoneMenuOpen,
    setZoneMenuOpen,
    switchZone,
    saveZoneLabel,
    isAdmin,
    online,
    isStale,
    ageText,
  } = useStore();

  const [editing, setEditing] = useState<number>(-1);
  const [draft, setDraft] = useState<string>('');
  const [saving, setSaving] = useState<number>(-1);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!zoneMenuOpen) return;
    setEditing(-1);
    setSaving(-1);
    setMessage('');
    setError('');
  }, [zoneMenuOpen]);

  useEffect(() => {
    if (editing >= 0) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing]);

  if (!zoneMenuOpen) return null;

  function close() {
    setZoneMenuOpen(false);
    setEditing(-1);
  }

  function zoneStatus(index: number) {
    if (index !== currentZone) return '';
    if (!online) return 'gagal baca';
    if (isStale) return `data ${ageText}`;
    return `live · ${ageText}`;
  }

  async function handleSave(index: number) {
    if (saving === index) return;
    setSaving(index);
    setError('');
    try {
      const label = await saveZoneLabel(index, draft);
      setMessage(label ? 'Label disimpan.' : 'Label direset ke nama default.');
      setEditing(-1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan label.');
    } finally {
      setSaving(-1);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-sidebar/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="card w-full max-w-md overflow-hidden shadow-float"
        role="dialog"
        aria-modal="true"
        aria-labelledby="zone-menu-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 id="zone-menu-title" className="text-[15px] font-bold text-ink">
              Pilih unit greenhouse
            </h2>
            <p className="mt-0.5 text-[11.5px] text-muted">
              Data dan kontrol mengikuti unit yang dipilih.
            </p>
          </div>
          <button className="btn-icon h-8 w-8" type="button" aria-label="Tutup" onClick={close}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 p-3">
          {zones.map((z, i) => (
            <div
              key={z.id}
              className={`rounded-xl border transition-colors ${
                i === currentZone ? 'border-primary-line bg-primary-soft/60' : 'border-line bg-surface-2'
              }`}
            >
              <div className="flex items-center gap-2 p-2.5">
                {editing === i ? (
                  <>
                    <input
                      ref={inputRef}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="input py-1.5"
                      type="text"
                      maxLength={40}
                      placeholder={z.name}
                      aria-label={`Label greenhouse ${z.id}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleSave(i);
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditing(-1);
                          setError('');
                        }
                      }}
                    />
                    <button
                      className="btn-icon h-8 w-8 text-primary"
                      type="button"
                      disabled={saving === i}
                      aria-label="Simpan label"
                      onClick={() => void handleSave(i)}
                    >
                      {saving === i ? <span className="spinner h-3.5 w-3.5" /> : <Check className="h-4 w-4" />}
                    </button>
                    <button
                      className="btn-icon h-8 w-8"
                      type="button"
                      aria-label="Batal"
                      onClick={() => {
                        setEditing(-1);
                        setError('');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                      type="button"
                      onClick={() => {
                        switchZone(i);
                        close();
                      }}
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-primary ring-1 ring-line">
                        <Leaf className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-baseline gap-1.5">
                          <span className="truncate text-[13px] font-bold text-ink">
                            {labels[z.id] || z.name}
                          </span>
                          {i === currentZone && (
                            <span className="shrink-0 text-[10.5px] font-semibold text-muted">
                              · {zoneStatus(i)}
                            </span>
                          )}
                        </span>
                        <span className="num block text-[10.5px] text-muted">{z.id}</span>
                      </span>
                      {i === currentZone && <Check className="h-4 w-4 shrink-0 text-primary" />}
                    </button>

                    {isAdmin && (
                      <button
                        className="btn-icon h-8 w-8 shrink-0"
                        type="button"
                        title="Ganti label"
                        aria-label={`Ganti label greenhouse ${z.id}`}
                        onClick={() => {
                          setEditing(i);
                          setDraft(labels[z.id] || '');
                          setMessage('');
                          setError('');
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>

              {editing === i && error && (
                <p className="px-3 pb-2.5 text-[11px] font-semibold text-danger">{error}</p>
              )}
            </div>
          ))}

          {message && <p className="px-2 pt-1 text-[11.5px] font-semibold text-ok">{message}</p>}
          {!isAdmin && (
            <p className="px-2 pt-1 text-[11px] leading-snug text-faint">
              Hanya admin yang dapat mengganti label greenhouse.
            </p>
          )}
          <p className="px-2 pt-0.5 text-[11px] leading-snug text-faint">
            Satu unit ESP32 per greenhouse. Daftar unit berasal dari konfigurasi dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
