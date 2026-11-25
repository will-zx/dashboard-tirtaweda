import { Droplet, Droplets, Gauge, Sprout, Sun, Thermometer, Waves } from 'lucide-react';
import { fmtMl, fmtNum } from '../lib/format.js';
import type { MetricItem } from '../types.ts';

const META: Record<
  MetricItem['key'],
  { icon: typeof Thermometer; accent: string; badgeBg: string }
> = {
  temp: { icon: Thermometer, accent: 'bg-temp', badgeBg: 'bg-temp/10 text-temp' },
  hum: { icon: Droplets, accent: 'bg-hum', badgeBg: 'bg-hum/10 text-hum' },
  soil: { icon: Sprout, accent: 'bg-soil', badgeBg: 'bg-soil/10 text-soil' },
  vpd: { icon: Gauge, accent: 'bg-vpd', badgeBg: 'bg-vpd/10 text-vpd' },
  etc: { icon: Sun, accent: 'bg-etc', badgeBg: 'bg-etc/10 text-etc' },
  budget: { icon: Waves, accent: 'bg-dose', badgeBg: 'bg-dose/10 text-dose' },
  used: { icon: Droplet, accent: 'bg-hum', badgeBg: 'bg-hum/10 text-hum' },
};

export function MetricCard({ metric, className = '' }: { metric: MetricItem; className?: string }) {
  const meta = META[metric.key];
  const Icon = meta.icon;

  const display = metric.ml
    ? fmtMl(metric.value) ?? '-'
    : fmtNum(metric.value, metric.digits ?? 2);

  const hintClass =
    metric.hintTone === 'danger'
      ? 'bg-danger-soft text-danger'
      : metric.hintTone === 'warn'
        ? 'bg-warn-soft text-warn'
        : metric.key === 'soil'
          ? 'metric-probe'
          : 'bg-surface-2 text-muted';

  return (
    <article className={`metric-card ${className}`}>
      <span className={`absolute inset-x-0 top-0 h-1 ${meta.accent} opacity-80`} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-muted">
          {metric.label}
        </p>
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${meta.badgeBg}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-4 min-w-0">
        <div className="num flex items-baseline gap-1.5">
          <span className="text-[28px] font-bold leading-none tracking-tight text-ink sm:text-[31px]">
            {display}
          </span>
          {metric.unit && (
            <span className="text-[11.5px] font-semibold text-muted">{metric.unit}</span>
          )}
        </div>

        {metric.progressPct != null && (
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-dose transition-[width] duration-500"
              style={{ width: `${metric.progressPct}%` }}
            />
          </div>
        )}

        {metric.hint && (
          <p className={`mt-2.5 inline-block rounded-lg px-2 py-1 text-[10.5px] font-bold leading-snug ${hintClass}`}>
            {metric.hint}
          </p>
        )}
      </div>
    </article>
  );
}
