import { useEffect, useState } from 'react';
import { Check, ChevronDown, RefreshCw, Settings, ShieldCheck, X } from 'lucide-react';
import { VPD_TARGET_MAX, VPD_TARGET_MIN } from '../config.js';
import { fmtDuration } from '../lib/format.js';
import { useStore } from '../lib/store.tsx';
import type { DurationUnit } from '../types.ts';

export function PhasePanel() {
  const { lastData, isAdmin, pending, setPhaseSetpoints, resetPhaseCounter, setPhaseName } =
    useStore();

  const phase = lastData?.phase ?? null;
  const [showForm, setShowForm] = useState(false);
  const [vpdInput, setVpdInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [durInput, setDurInput] = useState('');
  const [durUnit, setDurUnit] = useState<DurationUnit>('hari');

  useEffect(() => {
    if (!phase) return;
    if (vpdInput === '' && phase.target !== null) setVpdInput(String(phase.target));
    if (nameInput === '' && phase.name) setNameInput(phase.name);
  }, [lastData?._key, nameInput, phase, vpdInput]);

  const progress =
    phase && phase.duration && phase.elapsed !== null
      ? Math.min(100, Math.max(0, (phase.elapsed / phase.duration) * 100))
      : 0;

  const isPending = ['set_vpd', 'set_fase', 'set_durasi'].some((action) => pending[action]);

  return (
    <section className="card card-pad flex flex-col">
      <div className="rounded-2xl border border-primary-line/60 bg-gradient-to-br from-primary-soft/80 via-surface to-surface-2 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
                Fase Berjalan
              </p>
              <span className={`pill ${phase?.active ? 'pill-on' : 'pill-off'}`}>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${phase?.active ? 'bg-primary' : 'bg-faint'}`}
                />
                {phase?.active ? 'Aktif' : 'Fuzzy Penuh'}
              </span>
            </div>
            <p className="mt-1 truncate text-[21px] font-extrabold capitalize text-ink">
              {phase?.name || 'Tanpa fase'}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
              Target VPD
            </p>
            <p className="num text-[22px] font-bold text-primary-dark">
              {phase?.target != null ? phase.target.toFixed(2) : '-'}{' '}
              <span className="text-[11px] font-semibold text-muted">kPa</span>
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="h-2.5 overflow-hidden rounded-full bg-surface ring-1 ring-line">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary-dark transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="num mt-2 flex justify-between text-[10.5px] font-semibold text-muted">
            <span>{fmtDuration(phase?.elapsed)} berjalan</span>
            <span>{fmtDuration(phase?.remaining)} tersisa</span>
          </div>
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-line bg-surface-2 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Durasi</p>
          <p className="num mt-0.5 text-[12.5px] font-bold text-ink">
            {fmtDuration(phase?.duration)}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface-2 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Berjalan</p>
          <p className="num mt-0.5 text-[12.5px] font-bold text-ink">
            {fmtDuration(phase?.elapsed)}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface-2 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Sisa</p>
          <p className="num mt-0.5 text-[12.5px] font-bold text-ink">
            {fmtDuration(phase?.remaining)}
          </p>
        </div>
      </div>

      <div className="mt-4">
        {isAdmin ? (
          <>
            <button
              type="button"
              className="btn w-full"
              aria-expanded={showForm}
              onClick={() => setShowForm((v) => !v)}
            >
              <Settings className="h-4 w-4 text-primary" />
              {showForm ? 'Tutup Pengaturan' : 'Ubah Setpoint Fase'}
              <ChevronDown
                className={`ml-auto h-4 w-4 transition-transform ${showForm ? 'rotate-180' : ''}`}
              />
            </button>

            {showForm && (
              <div className="mt-3 space-y-3.5 rounded-2xl border border-line bg-surface-2 p-4">
                <div>
                  <label className="label" htmlFor="vpd-target">
                    Target VPD (kPa)
                  </label>
                  <input
                    id="vpd-target"
                    value={vpdInput}
                    onChange={(e) => setVpdInput(e.target.value)}
                    className="input num"
                    type="number"
                    min={VPD_TARGET_MIN}
                    max={VPD_TARGET_MAX}
                    step={0.05}
                    placeholder={phase?.target != null ? String(phase.target) : '1.00'}
                  />
                  <p className="mt-1 text-[10.5px] text-faint">
                    Rentang {VPD_TARGET_MIN}–{VPD_TARGET_MAX} kPa
                  </p>
                </div>

                <div>
                  <label className="label" htmlFor="phase-name">
                    Nama Fase
                  </label>
                  <input
                    id="phase-name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="input"
                    type="text"
                    maxLength={23}
                    placeholder={phase?.name || 'Vegetatif'}
                  />
                </div>

                <div>
                  <label className="label" htmlFor="phase-duration">
                    Durasi Fase
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="phase-duration"
                      value={durInput}
                      onChange={(e) => setDurInput(e.target.value)}
                      className="input num"
                      type="number"
                      min={0}
                      step={1}
                      placeholder="14"
                    />
                    <select
                      value={durUnit}
                      onChange={(e) => setDurUnit(e.target.value as DurationUnit)}
                      className="input w-auto shrink-0"
                    >
                      <option value="detik">detik</option>
                      <option value="menit">menit</option>
                      <option value="jam">jam</option>
                      <option value="hari">hari</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-line pt-3">
                  <p className="mb-2.5 text-[10.5px] leading-snug text-faint">
                    Kosongkan field yang tidak ingin diubah. Tombol Nonaktifkan menghapus fase.
                  </p>
                  <button
                    className="btn btn-primary w-full"
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      void setPhaseSetpoints({
                        vpd: vpdInput,
                        name: nameInput,
                        duration: durInput,
                        unit: durUnit,
                      })
                    }
                  >
                    <Check className="h-4 w-4" />
                    {isPending ? 'Menunggu perangkat…' : 'Atur Setpoint'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                  <button className="btn flex-1" type="button" onClick={resetPhaseCounter}>
                    <RefreshCw className="h-3.5 w-3.5 text-primary" />
                    Reset Penghitung
                  </button>
                  <button className="btn flex-1" type="button" onClick={() => setPhaseName('')}>
                    <X className="h-3.5 w-3.5 text-danger" />
                    Nonaktifkan
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="flex items-center justify-center gap-1.5 py-2 text-[11.5px] text-muted">
            <ShieldCheck className="h-4 w-4 text-faint" />
            Login admin untuk mengubah setpoint fase.
          </p>
        )}
      </div>
    </section>
  );
}
