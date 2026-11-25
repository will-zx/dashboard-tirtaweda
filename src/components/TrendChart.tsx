import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CategoryScale,
  Chart,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartConfiguration,
} from 'chart.js';
import { Activity, Clock } from 'lucide-react';
import { TREND_RANGE } from '../config.js';
import { fmtNum, fmtTimeShort } from '../lib/format.js';
import { useStore } from '../lib/store.tsx';
import type { TrendRangeKey } from '../types.ts';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip);

const SERIES = [
  { key: 'temp', field: 'temperature', label: 'Suhu', unit: '°C', color: '--color-temp', axis: 'y' },
  { key: 'hum', field: 'humidity', label: 'Kelembapan', unit: '%', color: '--color-hum', axis: 'y1' },
  { key: 'vpd', field: 'vpd', label: 'VPD', unit: 'kPa', color: '--color-vpd', axis: 'y2' },
] as const;

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function readPalette() {
  return {
    temp: cssVar('--color-temp'),
    hum: cssVar('--color-hum'),
    vpd: cssVar('--color-vpd'),
    muted: cssVar('--color-muted'),
    line: cssVar('--color-line'),
    tooltip: cssVar('--color-sidebar'),
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const raw = (hex || '').replace('#', '');
  if (raw.length !== 6) return `rgba(0,0,0,${alpha})`;
  const n = parseInt(raw, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function TrendChart({ className = '' }: { className?: string }) {
  const { trendData, trendRange, setTrendRange, lastData, zoneName, ageText, theme } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [hidden, setHidden] = useState<Record<string, boolean>>({
    temp: false,
    hum: false,
    vpd: false,
    target: false,
  });

  const target = lastData?.phase?.target ?? null;

  const latest = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const s of SERIES) {
      out[s.key] = null;
      for (let i = trendData.length - 1; i >= 0; i -= 1) {
        const val = trendData[i][s.field];
        if (typeof val === 'number') {
          out[s.key] = val;
          break;
        }
      }
    }
    return out;
  }, [trendData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const palette = readPalette();
    Chart.defaults.color = palette.muted;
    Chart.defaults.borderColor = palette.line;

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          ...SERIES.map((s) => ({
            label: s.label,
            yAxisID: s.axis,
            data: [] as Array<number | null>,
            borderColor: palette[s.key],
            pointBackgroundColor: palette[s.key],
            backgroundColor: 'transparent',
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBorderWidth: 2,
            borderWidth: 2.2,
            tension: 0.32,
          })),
          {
            label: 'Target VPD',
            yAxisID: 'y2',
            data: [] as Array<number | null>,
            borderColor: hexToRgba(palette.vpd, 0.65),
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 0,
            tension: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            padding: 10,
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            backgroundColor: palette.tooltip,
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            callbacks: {
              label: (ctx) => {
                const unit = ctx.datasetIndex < SERIES.length ? SERIES[ctx.datasetIndex].unit : 'kPa';
                return ` ${ctx.dataset.label}: ${fmtNum(ctx.parsed.y)} ${unit}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: palette.line, drawTicks: false },
            border: { display: false },
            ticks: {
              color: palette.muted,
              maxTicksLimit: 7,
              maxRotation: 0,
              autoSkipPadding: 16,
              padding: 4,
            },
          },
          y: {
            position: 'left',
            grid: { color: palette.line, drawTicks: false },
            border: { display: false },
            grace: '10%',
            afterDataLimits: (scale) => {
              const MIN_SPAN = 4;
              if (scale.max - scale.min < MIN_SPAN) {
                const mid = (scale.min + scale.max) / 2;
                scale.min = mid - MIN_SPAN / 2;
                scale.max = mid + MIN_SPAN / 2;
              }
            },
            ticks: { color: palette.temp, maxTicksLimit: 6, padding: 6 },
          },
          y1: {
            position: 'right',
            suggestedMin: 0,
            suggestedMax: 100,
            grid: { drawOnChartArea: false },
            border: { display: false },
            ticks: { color: palette.hum, maxTicksLimit: 6, padding: 6 },
          },
          y2: {
            position: 'right',
            suggestedMin: 0,
            suggestedMax: 3,
            grid: { drawOnChartArea: false },
            border: { display: false },
            ticks: { color: palette.vpd, maxTicksLimit: 6, padding: 6 },
          },
        },
      },
    };

    const chart = new Chart(canvas, config);
    chartRef.current = chart;

    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [theme]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.data.labels = trendData.map((p) => fmtTimeShort(p.ts));
    SERIES.forEach((s, i) => {
      chart.data.datasets[i].data = trendData.map((p) =>
        typeof p[s.field] === 'number' ? p[s.field] : null,
      );
    });
    chart.data.datasets[SERIES.length].data = trendData.map(() => target);

    const keys = ['temp', 'hum', 'vpd', 'target'];
    keys.forEach((key, i) => {
      chart.setDatasetVisibility(i, !hidden[key]);
    });
    chart.update('none');
  }, [hidden, target, trendData, theme]);

  return (
    <section className={`card card-pad flex min-w-0 flex-col ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[14.5px] font-bold text-ink">
            <Activity className="h-4 w-4 text-primary" />
            Tren Iklim Mikro
            <span className="font-medium text-muted">· {zoneName}</span>
          </h2>
          <p className="mt-0.5 text-[11.5px] text-muted">
            Suhu, kelembapan relatif, dan VPD dari pembacaan sensor.
          </p>
        </div>

        <div className="seg" role="group" aria-label="Rentang waktu grafik">
          {(Object.keys(TREND_RANGE) as TrendRangeKey[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`seg-btn ${trendRange === key ? 'seg-btn-on' : ''}`}
              onClick={() => setTrendRange(key)}
            >
              {TREND_RANGE[key].short}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        {SERIES.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`inline-flex items-center gap-2 rounded-lg px-2 py-1 text-[11.5px] font-semibold transition-opacity hover:bg-surface-2 ${
              hidden[s.key] ? 'opacity-40' : 'opacity-100'
            }`}
            aria-pressed={!hidden[s.key]}
            onClick={() => setHidden((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: `var(${s.color})` }} />
            <span className="text-muted">{s.label}</span>
            <span className="num text-ink">
              {latest[s.key] != null ? fmtNum(latest[s.key], s.key === 'hum' ? 1 : 2) : '-'}{' '}
              <span className="font-medium text-muted">{s.unit}</span>
            </span>
          </button>
        ))}

        {target != null && (
          <button
            type="button"
            className={`inline-flex items-center gap-2 rounded-lg px-2 py-1 text-[11.5px] font-semibold transition-opacity hover:bg-surface-2 ${
              hidden.target ? 'opacity-40' : 'opacity-100'
            }`}
            aria-pressed={!hidden.target}
            onClick={() => setHidden((prev) => ({ ...prev, target: !prev.target }))}
          >
            <span className="h-0 w-4 border-t-2 border-dashed border-vpd" />
            <span className="text-muted">Target</span>
            <span className="num text-ink">
              {target.toFixed(2)} <span className="font-medium text-muted">kPa</span>
            </span>
          </button>
        )}
      </div>

      <div className="relative mt-3 h-[280px] sm:h-[320px]">
        <canvas ref={canvasRef} />
        {!trendData.length && (
          <div className="absolute inset-0 grid place-items-center rounded-xl bg-surface-2/70">
            <div className="text-center">
              <Activity className="mx-auto h-7 w-7 text-faint" />
              <p className="mt-2 text-[12.5px] font-semibold text-muted">Menunggu data sensor…</p>
              <p className="text-[11px] text-faint">Grafik muncul setelah perangkat mengirim log.</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-faint" />
          Data terakhir {ageText} lalu
        </span>
        <span className="num">
          {trendData.length} titik · bucket {TREND_RANGE[trendRange].bucket / 60} menit
        </span>
      </div>
    </section>
  );
}
