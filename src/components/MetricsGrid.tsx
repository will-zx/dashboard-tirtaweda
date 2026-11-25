import { useStore } from '../lib/store.tsx';
import { MetricCard } from './MetricCard.tsx';

export function MetricsGrid() {
  const { metrics } = useStore();

  const primaryMetrics = metrics.filter((m) => !['etc', 'budget', 'used'].includes(m.key));
  const irrigationMetrics = (['budget', 'used', 'etc'] as const)
    .map((key) => metrics.find((m) => m.key === key))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
      <section aria-label="Kondisi iklim dan tanaman" className="lg:col-span-7">
        <p className="section-kicker mb-2.5">Iklim &amp; Tanaman</p>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          {primaryMetrics.map((metric) => (
            <MetricCard key={metric.key} metric={metric} />
          ))}
        </div>
      </section>

      {irrigationMetrics.length > 0 && (
        <section aria-label="Neraca air dan irigasi" className="lg:col-span-5">
          <p className="section-kicker mb-2.5">Neraca Air &amp; Irigasi</p>
          <div className="grid grid-cols-2 gap-3.5">
            {irrigationMetrics.map((metric) => (
              <MetricCard
                key={metric.key}
                metric={metric}
                className={metric.key === 'etc' && irrigationMetrics.length === 3 ? 'col-span-2' : ''}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
