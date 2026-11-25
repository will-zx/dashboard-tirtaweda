import { Leaf, Target } from 'lucide-react';
import { useStore } from '../lib/store.tsx';

export function StatusPills() {
  const { online, isStale, ageText, lastData } = useStore();

  const connection = !online
    ? { text: 'Offline / gagal baca', cls: 'pill-danger', dot: 'bg-danger', pulse: false }
    : isStale
      ? { text: `Data basi · ${ageText} lalu`, cls: 'pill-warn', dot: 'bg-warn', pulse: false }
      : { text: `Live · ${ageText} lalu`, cls: 'pill-on', dot: 'bg-primary', pulse: true };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`pill ${connection.cls}`}>
        <span className="relative flex h-2 w-2">
          {connection.pulse && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          )}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${connection.dot}`} />
        </span>
        {connection.text}
      </span>
      {lastData?.phase?.name && (
        <span className="pill pill-off capitalize">
          <Leaf className="h-3 w-3" />
          {lastData.phase.name}
        </span>
      )}
      {lastData?.phase?.target != null && (
        <span className="pill pill-off num">
          <Target className="h-3 w-3 text-vpd" />
          VPD {lastData.phase.target.toFixed(2)} kPa
        </span>
      )}
    </div>
  );
}
