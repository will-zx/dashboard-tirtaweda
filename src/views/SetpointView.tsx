import { PhasePanel } from '../components/PhasePanel.tsx';

export function SetpointView() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div>
        <p className="eyebrow">Pengaturan Kendali</p>
        <h1 className="mt-1.5 text-[clamp(1.65rem,2.5vw,2.2rem)] font-extrabold tracking-[-0.035em] text-ink">
          Fase &amp; Setpoint
        </h1>
        <p className="mt-1 text-[12px] text-muted">
          Setpoint mengoreksi keluaran fuzzy secara adaptif, bukan menggantikannya.
        </p>
      </div>

      <PhasePanel />
    </div>
  );
}
