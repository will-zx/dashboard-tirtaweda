import { AlertTriangle, ChevronLeft, ChevronRight, Download, List, Search } from 'lucide-react';
import { TREND_RANGE } from '../config.js';
import { fmtNum } from '../lib/format.js';
import { useStore } from '../lib/store.tsx';
import type { TelemetryLog, TrendRangeKey } from '../types.ts';

function statusTone(row: TelemetryLog): string {
  const s = (row.status || '').toLowerCase();
  return ['misting', 'blower', 'irigasi'].some((k) => s.includes(k)) ? 'pill-on' : 'pill-off';
}

export function LogView() {
  const {
    trendRange,
    setTrendRange,
    logRows,
    setLogRows,
    logFilter,
    setLogFilter,
    logPageCount,
    safeLogPage,
    setLogPage,
    matchedLogs,
    pagedLogs,
    logLimit,
    loadError,
    zoneName,
    exportCsv,
  } = useStore();

  const rangeLabel = TREND_RANGE[trendRange].label;
  const total = logPageCount;
  const startPage = Math.max(1, Math.min(safeLogPage - 2, total - 4));
  const endPage = Math.min(total, startPage + 4);
  const pageNumbers: number[] = [];
  for (let i = startPage; i <= endPage; i += 1) pageNumbers.push(i);

  const firstRow = matchedLogs.length ? (safeLogPage - 1) * logRows + 1 : 0;
  const lastRow = Math.min(safeLogPage * logRows, matchedLogs.length);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Data Perangkat</p>
          <h1 className="mt-1.5 text-[clamp(1.65rem,2.5vw,2.2rem)] font-extrabold tracking-[-0.035em] text-ink">
            Riwayat Pembacaan
          </h1>
          <p className="mt-1 text-[12px] text-muted">
            {zoneName} · Jendela {rangeLabel} · <span className="num">{matchedLogs.length}</span> baris
          </p>
        </div>

        <button className="btn" type="button" onClick={exportCsv}>
          <Download className="h-4 w-4 text-primary" />
          Ekspor CSV
        </button>
      </div>

      <div className="card card-pad">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="input pl-9"
              type="search"
              placeholder="Cari waktu, status, atau fase…"
              aria-label="Cari log"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[11.5px] font-semibold text-muted">
              Rentang
              <select
                value={trendRange}
                onChange={(e) => setTrendRange(e.target.value as TrendRangeKey)}
                className="input w-auto py-1.5"
              >
                {(Object.keys(TREND_RANGE) as TrendRangeKey[]).map((key) => (
                  <option key={key} value={key}>
                    {TREND_RANGE[key].label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-[11.5px] font-semibold text-muted">
              Baris
              <select
                value={logRows}
                onChange={(e) => setLogRows(Number(e.target.value))}
                className="input w-auto py-1.5"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
        </div>

        <div
          className="mt-3.5 overflow-x-auto rounded-xl border border-line"
          tabIndex={0}
          role="region"
          aria-label="Tabel riwayat pembacaan sensor"
        >
          <table className="w-full min-w-[960px] border-collapse text-[12px]">
            <caption className="sr-only">Riwayat pembacaan sensor greenhouse</caption>
            <thead>
              <tr>
                <th scope="col" className="table-head sticky left-0 top-0 z-20 bg-surface-2">
                  Waktu
                </th>
                <th scope="col" className="table-head sticky top-0 z-10">
                  Suhu (°C)
                </th>
                <th scope="col" className="table-head sticky top-0 z-10">
                  RH (%)
                </th>
                <th scope="col" className="table-head sticky top-0 z-10">
                  Tanah (%)
                </th>
                <th scope="col" className="table-head sticky top-0 z-10">
                  Probe
                </th>
                <th scope="col" className="table-head sticky top-0 z-10">
                  VPD (kPa)
                </th>
                <th scope="col" className="table-head sticky top-0 z-10">
                  ETc (mm/hari)
                </th>
                <th scope="col" className="table-head sticky top-0 z-10">
                  Fase
                </th>
                <th scope="col" className="table-head sticky top-0 z-10">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {loadError ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center">
                    <AlertTriangle className="mx-auto h-6 w-6 text-danger" />
                    <p className="mt-2 text-[12.5px] font-semibold text-danger">
                      Gagal memuat log ({loadError}). Gunakan tombol muat ulang.
                    </p>
                  </td>
                </tr>
              ) : !matchedLogs.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center">
                    <List className="mx-auto h-6 w-6 text-faint" />
                    <p className="mt-2 text-[12.5px] font-semibold text-muted">
                      {logFilter ? 'Tidak ada baris yang cocok.' : 'Belum ada data sensor.'}
                    </p>
                  </td>
                </tr>
              ) : (
                pagedLogs.map((row) => (
                  <tr key={row._key} className="transition-colors hover:bg-primary-soft/40">
                    <td
                      className="table-cell num sticky left-0 z-[1] bg-surface font-semibold text-ink"
                      title={row.ts ? '' : 'Jam perangkat belum sinkron'}
                    >
                      {row.ts ? row.timeText : '—'}
                    </td>
                    <td className="table-cell num font-semibold text-ink">
                      {fmtNum(row.temperature, 1)}
                    </td>
                    <td className="table-cell num font-semibold text-ink">
                      {fmtNum(row.humidity, 1)}
                    </td>
                    <td className="table-cell num font-semibold text-ink">{fmtNum(row.soil, 0)}</td>
                    <td className="table-cell">
                      <span
                        className={`pill num ${
                          row.soilN === 3 ? 'probe-good' : row.soilN > 0 ? 'pill-warn' : 'pill-danger'
                        }`}
                      >
                        {row.soilN}/3
                      </span>
                    </td>
                    <td className="table-cell num font-semibold text-ink">{fmtNum(row.vpd)}</td>
                    <td className="table-cell num font-semibold text-ink">{fmtNum(row.etc)}</td>
                    <td className="table-cell">
                      {row.phase.name ? (
                        <span className="capitalize text-muted">{row.phase.name}</span>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <span className={`pill ${statusTone(row)}`}>{row.status || '—'}</span>
                      {row.flags.soilErr && <span className="pill pill-danger ml-1">SOILERR</span>}
                      {row.flags.noSync && <span className="pill pill-warn ml-1">NOSYNC</span>}
                      {row.flags.irrigOff && (
                        <span
                          className="pill pill-warn ml-1"
                          title="Irigasi otomatis dimatikan di perangkat"
                        >
                          IRRIGOFF
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-[11px] text-faint sm:hidden">
          Geser tabel ke samping untuk melihat semua kolom.
        </p>

        <div className="mt-3.5 flex flex-col gap-3 border-t border-line pt-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11.5px] text-muted">
            Menampilkan <span className="num font-bold text-ink">{firstRow}–{lastRow}</span> dari{' '}
            <span className="num font-bold text-ink">{matchedLogs.length}</span> baris
          </p>

          <div className="flex items-center gap-1">
            <button
              className="btn-icon h-8 w-8"
              type="button"
              disabled={safeLogPage <= 1}
              aria-label="Halaman sebelumnya"
              onClick={() => setLogPage(safeLogPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageNumbers.map((page) => (
              <button
                key={page}
                type="button"
                className={`num grid h-8 min-w-8 place-items-center rounded-lg px-2 text-[11.5px] font-bold transition-colors ${
                  page === safeLogPage
                    ? 'bg-primary text-white dark:text-sidebar'
                    : 'text-muted hover:bg-surface-2'
                }`}
                aria-current={page === safeLogPage ? 'page' : undefined}
                onClick={() => setLogPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              className="btn-icon h-8 w-8"
              type="button"
              disabled={safeLogPage >= logPageCount}
              aria-label="Halaman berikutnya"
              onClick={() => setLogPage(safeLogPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <p className="px-1 text-[11px] leading-relaxed text-faint">
        Dashboard memuat {logLimit} record terbaru dari Firebase RTDB dan menampilkan {logRows} baris
        per halaman.
      </p>
    </div>
  );
}
