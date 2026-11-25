import { AlertTriangle } from 'lucide-react';
import { ActuatorPanel } from '../components/ActuatorPanel.tsx';
import { MetricsGrid } from '../components/MetricsGrid.tsx';
import { StatusPills } from '../components/StatusPills.tsx';
import { TrendChart } from '../components/TrendChart.tsx';
import { useStore } from '../lib/store.tsx';

export function DashboardView() {
  const { currentZone, zoneName, loadError } = useStore();

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Zona {String(currentZone + 1).padStart(2, '0')}</p>
          <h1 className="mt-1.5 text-[clamp(1.75rem,3.2vw,2.45rem)] font-extrabold leading-tight tracking-[-0.035em] text-ink">
            Kondisi Greenhouse
          </h1>
          <p className="mt-1 text-sm text-muted">
            {zoneName} · iklim mikro, neraca air, dan status perangkat
          </p>
        </div>
      </section>

      <div className="lg:hidden">
        <StatusPills />
      </div>

      {loadError && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-danger-line bg-danger-soft px-4 py-3 text-[12.5px] text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-bold">Gagal memuat data dari Firebase.</p>
            <p className="text-[11.5px] opacity-90">
              {loadError}. Periksa koneksi, lalu gunakan tombol muat ulang.
            </p>
          </div>
        </div>
      )}

      <MetricsGrid />

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-12">
        <TrendChart className="xl:col-span-7" />
        <ActuatorPanel className="xl:col-span-5" />
      </div>

      <p className="px-1 text-[11px] leading-relaxed text-faint">
        Data sensor dibaca secara real-time dari Firebase Realtime Database. Interval polling
        mengikuti rentang grafik dan berhenti otomatis saat tab tidak aktif.
      </p>
    </div>
  );
}
