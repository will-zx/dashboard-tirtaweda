import { FormEvent, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CloudRain,
  Droplet,
  Droplets,
  Fan,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { useStore } from '../lib/store.tsx';

const MODES = [
  { value: 'off', label: 'OFF', active: 'seg-btn-off' },
  { value: 'on', label: 'ON', active: 'seg-btn-on' },
  { value: 'auto', label: 'AUTO', active: 'seg-btn-auto' },
] as const;

const BLOWER_PRESETS = [0, 40, 70, 100];

export function ActuatorPanel({ className = '' }: { className?: string }) {
  const {
    lastData,
    isAdmin,
    isStale,
    actuatorModes,
    overrideChip,
    onSwitch,
    setBlowerDuty,
    releaseAll,
  } = useStore();

  const [blowerDuty, setBlowerDutyInput] = useState('');

  const irrigation = lastData?.irrigation ?? null;
  const irrigationParts: string[] = [];
  if (irrigation?.doseMs) irrigationParts.push(`${Math.round(irrigation.doseMs / 1000)} dtk pompa`);
  if (irrigation?.intervalMin) irrigationParts.push(`jeda min ${Math.round(irrigation.intervalMin / 60)} jam`);
  const irrigationLine = irrigationParts.length ? irrigationParts.join(' · ') : null;

  const notice = !lastData
    ? { tone: 'warn', text: 'Status aktuator belum tersedia dari perangkat.' }
    : isStale
      ? { tone: 'warn', text: 'Telemetri lebih dari 5 menit; status mungkin tidak aktual.' }
      : lastData.flags.irrigOff
        ? { tone: 'warn', text: 'Irigasi otomatis dimatikan di perangkat. Perintah manual tetap tersedia.' }
        : irrigation?.holdReason
          ? { tone: 'warn', text: `Siklus irigasi ditahan: ${irrigation.holdReason}` }
          : lastData.tmeanFallback
            ? { tone: 'warn', text: 'ETc memakai suhu saat ini sampai Tmean 24 jam tersedia.' }
            : { tone: 'ok', text: 'Semua aktuator beroperasi normal.' };

  const items = [
    {
      key: 'mist' as const,
      label: 'Misting',
      icon: CloudRain,
      on: lastData?.misting ?? false,
      fuzzy: lastData?.fuzzy.mist ?? null,
      duty: null as number | null,
    },
    {
      key: 'irigasi' as const,
      label: 'Irigasi',
      icon: Droplets,
      on: lastData?.irigasi ?? false,
      fuzzy: lastData?.fuzzy.irigasi ?? null,
      duty: null as number | null,
    },
    {
      key: 'blower' as const,
      label: 'Blower',
      icon: Fan,
      on: lastData?.blower ?? false,
      fuzzy: lastData?.fuzzy.blower ?? null,
      duty: lastData?.blowerLevel ?? null,
    },
  ];

  function actualStatus(key: 'mist' | 'irigasi' | 'blower', on: boolean) {
    if (!lastData) return 'Belum ada data';
    const stateText = on ? 'Aktif' : 'Mati';
    const mode = actuatorModes[key];
    if (mode === 'unknown') return stateText;
    return `${stateText} · ${mode === 'auto' ? 'Auto' : 'Manual'}`;
  }

  function handleBlowerSubmit(e: FormEvent) {
    e.preventDefault();
    setBlowerDuty(blowerDuty);
  }

  return (
    <section className={`card card-pad min-w-0 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[14.5px] font-bold text-ink">
            <Sliders className="h-4 w-4 text-primary" />
            {isAdmin ? 'Kendali Aktuator' : 'Status Aktuator'}
          </h2>
          <p className="mt-0.5 text-[11.5px] text-muted">
            {isAdmin ? 'Mode manual atau kembali ke kontrol fuzzy otomatis.' : 'Mode tamu · hanya pantau status.'}
          </p>
        </div>

        {isAdmin && (
          <button
            className="btn shrink-0 px-2.5 py-1.5 text-[11px]"
            type="button"
            onClick={releaseAll}
          >
            <RefreshCw className="h-3.5 w-3.5 text-primary" />
            Semua Auto
          </button>
        )}
      </div>

      <div
        className={`mt-3.5 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[11.5px] leading-snug ${
          notice.tone === 'ok'
            ? 'border-primary-line bg-primary-soft text-primary-dark'
            : 'border-warn-line bg-warn-soft text-warn'
        }`}
      >
        {notice.tone === 'ok' ? (
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        ) : (
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        )}
        <span>{notice.text}</span>
      </div>

      <div className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface-2 px-3.5">
        {items.map((it) => {
          const Icon = it.icon;
          const chip = overrideChip(it.key);
          return (
            <article key={it.key} className="space-y-2.5 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ${
                      it.on
                        ? 'bg-primary-soft text-primary ring-primary-line'
                        : 'bg-surface text-muted ring-line'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-[13px] font-bold text-ink">{it.label}</h3>
                    <p className="num truncate text-[10.5px] text-muted">
                      {it.duty != null
                        ? `Duty ${Math.round(it.duty * 100)}%`
                        : it.fuzzy === null
                          ? 'Fuzzy belum tersedia'
                          : `Fuzzy ${it.fuzzy ? 'ON' : 'OFF'}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                      !lastData ? 'text-faint' : it.on ? 'text-ok' : 'text-muted'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        !lastData
                          ? 'bg-faint'
                          : it.on
                            ? 'bg-ok shadow-[0_0_0_3px_rgb(21_128_61/0.16)]'
                            : 'bg-line-strong'
                      }`}
                    />
                    {actualStatus(it.key, it.on)}
                  </span>
                  {chip && <span className="num mt-1 text-[10px] font-semibold text-warn">Override {chip}</span>}
                </div>
              </div>

              {isAdmin && it.key === 'blower' && (
                <div className="space-y-2">
                  <form className="flex items-center gap-2" onSubmit={handleBlowerSubmit}>
                    <input
                      value={blowerDuty}
                      onChange={(e) => setBlowerDutyInput(e.target.value)}
                      className="input num min-w-0 flex-1 py-1.5 text-center text-[12px]"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      step={1}
                      placeholder="Duty 0-100%"
                      title="0 = mati; di bawah 20% dijalankan pada duty minimum 20%"
                      aria-label="Duty blower dalam persen"
                    />
                    <button className="btn btn-primary shrink-0 px-3 py-1.5 text-[11.5px]" type="submit">
                      Set
                    </button>
                  </form>
                  <div className="flex items-center gap-1.5">
                    {BLOWER_PRESETS.map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        className="num flex-1 rounded-lg border border-line bg-surface py-1 text-[10.5px] font-bold text-muted transition-colors hover:border-primary-line hover:bg-primary-soft hover:text-primary-dark"
                        onClick={() => {
                          setBlowerDutyInput(String(pct));
                          setBlowerDuty(pct);
                        }}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isAdmin && it.key !== 'blower' && (
                <div className="seg w-full" role="group" aria-label={`Mode ${it.label}`}>
                  {MODES.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      className={`seg-btn px-2 text-[11px] ${
                        actuatorModes[it.key] === m.value ? m.active : ''
                      }`}
                      aria-pressed={actuatorModes[it.key] === m.value}
                      onClick={() => onSwitch(it.key as 'mist' | 'irigasi', m.value)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {irrigationLine && (
        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
          <Droplet className="h-3.5 w-3.5 shrink-0 text-hum" />
          <span className="num">{irrigationLine}</span>
        </div>
      )}
    </section>
  );
}
