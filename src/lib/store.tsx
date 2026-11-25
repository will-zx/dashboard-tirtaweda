import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  CMD_TIMEOUT_MS,
  TREND_RANGE,
  VPD_TARGET_MAX,
  VPD_TARGET_MIN,
  ZONES,
} from '../config.js';
import {
  ensureSession,
  getSession,
  isAdminSession,
  readLabels,
  readLogs,
  signIn,
  signOut,
  writeCommand,
  writeLabel,
} from './firebase.js';
import { csvCell, fmtLogTime, humanAge, mmss } from './format.js';
import { isCommandConfirmed } from './command-confirmation.js';
import type {
  AuthSession,
  DurationUnit,
  MetricItem,
  OverrideMode,
  PendingCommand,
  TelemetryLog,
  ThemeMode,
  TrendPoint,
  TrendRangeKey,
  ZoneConfig,
} from '../types.ts';

const THEME_KEY = 'tirtaweda.theme';
const ACT_NAMES: Record<string, string> = {
  mist: 'Misting',
  irigasi: 'Irigasi',
  blower: 'Blower',
};

function initialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore storage errors
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const numOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const boolOrNull = (v: unknown): boolean | null => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return v > 0;
  return null;
};

function parseOverride(v: unknown): OverrideMode | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 'on' : 'off';
  if (typeof v === 'number') {
    if (v > 0) return 'on';
    if (v === 0) return 'off';
    return 'auto';
  }
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['on', '1', 'true', 'manual', 'force', 'paksa'].includes(s)) return 'on';
    if (['off', '0', 'false', 'forced'].includes(s)) return 'off';
    if (['auto', '-1', 'fuzzy'].includes(s)) return 'auto';
  }
  return null;
}

function overrideState(src: Record<string, unknown>, field: string, running: boolean): OverrideMode {
  const parsed = parseOverride(src[field]);
  if (parsed) return parsed;
  if (src.manual_mode !== true) return 'auto';
  const newFirmware = 'time_synced' in src || 'fase_aktif' in src || 'blower_level' in src;
  if (newFirmware) return 'unknown';
  return running ? 'on' : 'off';
}

const clockTrusted = (row: TelemetryLog | null): boolean =>
  !!row && row.ts !== null && row.synced === true;

export function normLog(src: Record<string, unknown> | null | undefined, key: string): TelemetryLog {
  const raw = src || {};
  const statusRaw = typeof raw.status_sistem === 'string' ? raw.status_sistem : '';
  const cleanStatus = statusRaw.replace(/\s*\b(SOILERR|NOSYNC|IRRIGOFF)\b/g, '').trim();
  const hasTs = typeof raw.ts === 'number' && raw.ts >= 100000;
  const synced = hasTs && raw.time_synced !== false;
  const level = numOrNull(raw.blower_level);
  const etc = numOrNull(raw.etc ?? raw.et0);
  const soil = numOrNull(raw.soil);
  const soil2 = numOrNull(raw.soil2);
  const soil3 = numOrNull(raw.soil3);
  const soilN = numOrNull(raw.soil_n) ?? [soil, soil2, soil3].filter((v) => v !== null).length;

  const misting = typeof raw.misting === 'boolean' ? raw.misting : statusRaw.includes('MISTING');
  const irigasi = typeof raw.irigasi === 'boolean' ? raw.irigasi : statusRaw.includes('IRIGASI');
  const blower = level !== null ? level > 0 : statusRaw.includes('BLOWER');

  return {
    _key: key,
    ts: hasTs ? (raw.ts as number) : null,
    timeText: fmtLogTime(hasTs ? (raw.ts as number) : null),
    synced,
    device: typeof raw.device === 'string' ? raw.device : '',
    temperature: numOrNull(raw.temperature),
    humidity: numOrNull(raw.humidity),
    soil,
    soil2,
    soil3,
    soilOk: numOrNull(raw.soil_ok),
    soilN,
    vpd: numOrNull(raw.vpd),
    etc,
    tmean: numOrNull(raw.tmean_c),
    tmeanFallback: raw.tmean_fallback === true,
    blowerLevel: level,
    misting,
    irigasi,
    blower,
    status: cleanStatus || null,
    statusRaw,
    manual: raw.manual_mode === true,
    fuzzy: {
      mist: boolOrNull(raw.fuzzy_mist),
      irigasi: boolOrNull(raw.fuzzy_irigasi),
      blower: boolOrNull(raw.fuzzy_blower),
    },
    ovLeft: {
      mist: numOrNull(raw.mist_ov_sisa_s),
      irigasi: numOrNull(raw.irig_ov_sisa_s),
      blower: numOrNull(raw.blower_ov_sisa_s),
    },
    flags: {
      sensorError: /sensor error/i.test(statusRaw),
      soilErr: statusRaw.includes('SOILERR'),
      noSync: statusRaw.includes('NOSYNC') || !synced,
      irrigOff: statusRaw.includes('IRRIGOFF'),
    },
    phase: {
      name: typeof raw.fase === 'string' ? raw.fase : null,
      target: numOrNull(raw.vpd_target),
      active: raw.fase_aktif === true,
      duration: numOrNull(raw.fase_durasi_s),
      elapsed: numOrNull(raw.fase_elapsed_s),
      remaining: numOrNull(raw.fase_sisa_s),
    },
    irrigation: {
      doseMl: numOrNull(raw.irigasi_dosis_ml),
      doseMs: numOrNull(raw.irigasi_durasi_ms),
      budgetMl: numOrNull(raw.irigasi_anggaran_ml),
      usedMl: numOrNull(raw.irigasi_terpakai_ml),
      intervalMin: numOrNull(raw.irigasi_jeda_menit),
      holdReason: typeof raw.irigasi_alasan_tahan === 'string' ? raw.irigasi_alasan_tahan : '',
    },
    override: {
      mist: overrideState(raw, 'mist_ov', misting),
      irigasi: overrideState(raw, 'irig_ov', irigasi),
      blower: overrideState(raw, 'blower_ov', blower),
    },
  };
}

function fmtMlShort(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)} L` : `${Math.round(v)} mL`;
}

function cmdLabel(cmd: { action: string; value: unknown }): string {
  if (cmd.action === 'auto') return 'Kembali ke Auto';
  if (cmd.action === 'set_blower_duty') return `Duty blower ${Math.round(Number(cmd.value))}%`;
  if (cmd.action === 'set_vpd') return 'Target VPD';
  if (cmd.action === 'set_fase') return cmd.value ? 'Nama fase' : 'Nonaktifkan setpoint';
  if (cmd.action === 'set_durasi') return 'Durasi fase';
  if (cmd.action === 'fase_reset') return 'Reset penghitung fase';
  return ACT_NAMES[cmd.action] || cmd.action;
}

interface StoreContextValue {
  zones: ZoneConfig[];
  session: AuthSession | null;
  isAdmin: boolean;
  currentZone: number;
  zoneId: string;
  zoneName: string;
  labels: Record<string, string>;
  logs: TelemetryLog[];
  lastData: TelemetryLog | null;
  trendRange: TrendRangeKey;
  logLimit: number;
  logRows: number;
  logPage: number;
  logFilter: string;
  online: boolean;
  loading: boolean;
  loadError: string;
  now: number;
  theme: ThemeMode;
  pending: Record<string, PendingCommand>;
  cmdStatus: string;
  cmdError: string;
  cmdAt: number;
  loginOpen: boolean;
  zoneMenuOpen: boolean;
  refreshSpin: boolean;
  age: number | null;
  ageText: string;
  isStale: boolean;
  metrics: MetricItem[];
  trendData: TrendPoint[];
  matchedLogs: TelemetryLog[];
  logPageCount: number;
  safeLogPage: number;
  pagedLogs: TelemetryLog[];
  actuatorModes: { mist: OverrideMode; irigasi: OverrideMode; blower: OverrideMode };
  overrideChip: (key: 'mist' | 'irigasi' | 'blower') => string | null;
  toggleTheme: () => void;
  setLoginOpen: (open: boolean) => void;
  setZoneMenuOpen: (open: boolean) => void;
  setTrendRange: (range: TrendRangeKey) => void;
  setLogRows: (rows: number) => void;
  setLogFilter: (filter: string) => void;
  setLogPage: (page: number) => void;
  switchZone: (index: number) => void;
  saveZoneLabel: (index: number, value: string) => Promise<string>;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  onSwitch: (action: 'mist' | 'irigasi', mode: 'on' | 'off' | 'auto') => void;
  setBlowerDuty: (value: string | number) => void;
  releaseAll: () => void;
  setPhaseName: (name: string) => void;
  setPhaseSetpoints: (args: {
    vpd: string;
    name: string;
    duration: string;
    unit: DurationUnit;
  }) => Promise<boolean>;
  resetPhaseCounter: () => void;
  exportCsv: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const zones = ZONES as ZoneConfig[];
  const [session, setSession] = useState<AuthSession | null>(() => getSession());
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAdminSession());
  const [currentZone, setCurrentZone] = useState<number>(0);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const [lastData, setLastData] = useState<TelemetryLog | null>(null);
  const [trendRange, setTrendRangeState] = useState<TrendRangeKey>('6j');
  const [logRows, setLogRowsState] = useState<number>(25);
  const [logPage, setLogPageState] = useState<number>(1);
  const [logFilter, setLogFilterState] = useState<string>('');
  const [online, setOnline] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string>('');
  const [now, setNow] = useState<number>(() => Date.now());
  const [theme, setTheme] = useState<ThemeMode>(() => initialTheme());
  const [pending, setPending] = useState<Record<string, PendingCommand>>({});
  const [cmdStatus, setCmdStatus] = useState<string>('');
  const [cmdError, setCmdError] = useState<string>('');
  const [cmdAt, setCmdAt] = useState<number>(0);
  const [loginOpen, setLoginOpen] = useState<boolean>(false);
  const [zoneMenuOpen, setZoneMenuOpen] = useState<boolean>(false);
  const [refreshSpin, setRefreshSpin] = useState<boolean>(false);

  const latestAnyRef = useRef<TelemetryLog | null>(null);
  const lastDataAtRef = useRef<number>(0);
  const fetchSeqRef = useRef<number>(0);
  const pendingRef = useRef<Record<string, PendingCommand>>({});
  const lastDataRef = useRef<TelemetryLog | null>(null);
  const currentZoneRef = useRef<number>(currentZone);
  const trendRangeRef = useRef<TrendRangeKey>(trendRange);

  pendingRef.current = pending;
  lastDataRef.current = lastData;
  currentZoneRef.current = currentZone;
  trendRangeRef.current = trendRange;

  const logLimit = TREND_RANGE[trendRange].limit;
  const zoneId = zones[currentZone]?.id ?? zones[0].id;
  const zoneName = labels[zoneId] || zones[currentZone]?.name || zoneId;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const checkPending = useCallback(() => {
    const entries = Object.entries(pendingRef.current);
    if (!entries.length) return;
    const row = latestAnyRef.current ?? lastDataRef.current;
    let changed = false;
    const nextPending = { ...pendingRef.current };

    for (const [key, item] of entries) {
      if (isCommandConfirmed(item, row)) {
        setCmdStatus(`Status ${cmdLabel(item)} terkonfirmasi dari telemetri terbaru.`);
        setCmdError('');
        setCmdAt(Date.now());
        delete nextPending[key];
        changed = true;
      } else if (Date.now() > item.deadline) {
        const id = item.commandId ? ` (ID ${item.commandId})` : '';
        setCmdError(
          `Status ${cmdLabel(item)}${id} belum terkonfirmasi dari telemetri terbaru ` +
            `dalam ${Math.round(CMD_TIMEOUT_MS / 1000)} detik. Perintah mungkin sudah diterapkan; ` +
            'periksa log serial dan data RTDB sebelum mengirim ulang.',
        );
        setCmdStatus('');
        setCmdAt(Date.now());
        delete nextPending[key];
        changed = true;
      }
    }

    if (changed) {
      pendingRef.current = nextPending;
      setPending(nextPending);
    }
  }, []);

  const fetchDataLogs = useCallback(
    async (overrideZoneIdx?: number, overrideRange?: TrendRangeKey) => {
      const seq = ++fetchSeqRef.current;
      const zIdx = overrideZoneIdx ?? currentZoneRef.current;
      const range = overrideRange ?? trendRangeRef.current;
      const targetZoneId = zones[zIdx]?.id ?? zones[0].id;
      const limit = TREND_RANGE[range].limit;

      setLoading(true);
      try {
        const data = await readLogs(targetZoneId, limit);
        if (!data) throw new Error('belum ada data');
        if (
          seq !== fetchSeqRef.current ||
          targetZoneId !== (zones[currentZoneRef.current]?.id ?? zones[0].id) ||
          limit !== TREND_RANGE[trendRangeRef.current].limit
        ) {
          return;
        }

        const rows = Object.entries(data as Record<string, Record<string, unknown>>).map(
          ([key, value]) => normLog(value, key),
        );
        latestAnyRef.current = rows[rows.length - 1] || null;
        rows.sort((a, b) => (a.ts ?? -Infinity) - (b.ts ?? -Infinity));

        const trusted = rows.filter(clockTrusted);
        const latest = trusted.length ? trusted[trusted.length - 1] : latestAnyRef.current;
        if (!latest) throw new Error('belum ada data');

        lastDataAtRef.current = Date.now();
        lastDataRef.current = latest;
        setLogs(rows);
        setLastData(latest);
        setOnline(true);
        setLoadError('');
        setNow(Date.now());
        checkPending();
      } catch (err) {
        if (seq !== fetchSeqRef.current) return;
        const msg = err instanceof Error ? err.message : 'Gagal memuat data';
        setOnline(false);
        setLoadError(msg);
      } finally {
        if (seq === fetchSeqRef.current) setLoading(false);
      }
    },
    [checkPending, zones],
  );

  const pollLatestForConfirmation = useCallback(async () => {
    try {
      const activeZoneId = zones[currentZoneRef.current]?.id ?? zones[0].id;
      const limit = TREND_RANGE[trendRangeRef.current].limit;
      const data = await readLogs(activeZoneId, 1);
      if (!data) return;
      const entries = Object.entries(data as Record<string, Record<string, unknown>>);
      if (!entries.length) return;
      const [key, value] = entries[entries.length - 1];
      const row = normLog(value, key);
      latestAnyRef.current = row;

      if (clockTrusted(row) && (!lastDataRef.current || (row.ts ?? 0) >= (lastDataRef.current.ts ?? 0))) {
        lastDataAtRef.current = Date.now();
        lastDataRef.current = row;
        setLastData(row);
        setLogs((prev) => {
          if (prev.some((item) => item._key === key)) return prev;
          return [...prev, row].sort((a, b) => (a.ts ?? -Infinity) - (b.ts ?? -Infinity)).slice(-limit);
        });
      }
      checkPending();
    } catch {
      // silent: full fetch handles connection error banner
    }
  }, [checkPending, zones]);

  useEffect(() => {
    let mounted = true;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let latestTimer: ReturnType<typeof setInterval> | null = null;
    let clockTimer: ReturnType<typeof setInterval> | null = null;

    const startTimers = () => {
      if (pollTimer) clearInterval(pollTimer);
      if (latestTimer) clearInterval(latestTimer);
      if (clockTimer) clearInterval(clockTimer);
      pollTimer = setInterval(() => fetchDataLogs(), TREND_RANGE[trendRangeRef.current].pollMs);
      latestTimer = setInterval(pollLatestForConfirmation, 30_000);
      clockTimer = setInterval(() => setNow(Date.now()), 1000);
    };

    const stopTimers = () => {
      if (pollTimer) clearInterval(pollTimer);
      if (latestTimer) clearInterval(latestTimer);
      if (clockTimer) clearInterval(clockTimer);
      pollTimer = null;
      latestTimer = null;
      clockTimer = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stopTimers();
      } else {
        setNow(Date.now());
        fetchDataLogs();
        startTimers();
      }
    };

    (async () => {
      const s = await ensureSession().catch(() => null);
      if (!mounted) return;
      setSession(s);
      setIsAdmin(isAdminSession(s));
      try {
        const lbls = (await readLabels()) || {};
        if (mounted) setLabels(lbls);
      } catch {
        // ignore label read error
      }
      await fetchDataLogs();
      if (!mounted) return;
      startTimers();
      document.addEventListener('visibilitychange', onVisibility);
    })();

    return () => {
      mounted = false;
      stopTimers();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchDataLogs, pollLatestForConfirmation]);

  const sendCommand = useCallback(
    async (
      action: string,
      value: unknown,
      extra: { unit?: string; mode?: string; seconds?: number; silent?: boolean } = {},
    ) => {
      const silent = extra.silent === true;
      if (!session) {
        setCmdStatus('Masuk sebagai tamu — login admin untuk mengirim perintah.');
        setCmdAt(Date.now());
        return false;
      }
      if (!isAdmin) {
        setCmdStatus('Hanya admin yang boleh mengirim perintah.');
        setCmdAt(Date.now());
        return false;
      }
      checkPending();
      if (pendingRef.current[action]) {
        setCmdStatus(`Tunggu perintah ${cmdLabel(pendingRef.current[action])} selesai dulu.`);
        setCmdError('');
        setCmdAt(Date.now());
        return false;
      }

      const body: Record<string, unknown> = { action, value };
      if (extra.unit) body.unit = extra.unit;
      if (extra.mode) body.mode = extra.mode;

      if (!silent) {
        setCmdStatus(`Mengirim ${cmdLabel({ action, value })}…`);
        setCmdError('');
        setCmdAt(Date.now());
      }
      try {
        const baseline = latestAnyRef.current ?? lastDataRef.current;
        const response = await writeCommand(zoneId, body);
        const nextItem: PendingCommand = {
          action,
          value,
          mode: extra.mode ?? null,
          seconds: extra.seconds ?? null,
          commandId: response?.name ?? null,
          baselineLogKey: baseline?._key ?? null,
          baselineLogTs: baseline?.ts ?? null,
          sentAt: Date.now(),
          deadline: Date.now() + CMD_TIMEOUT_MS,
        };
        const updated = { ...pendingRef.current, [action]: nextItem };
        pendingRef.current = updated;
        setPending(updated);

        if (!silent) {
          setCmdStatus(`Perintah ${cmdLabel({ action, value })} terkirim — menunggu konfirmasi perangkat…`);
          setCmdAt(Date.now());
        }
        setTimeout(pollLatestForConfirmation, 10_000);
        setTimeout(pollLatestForConfirmation, 30_000);
        setTimeout(checkPending, CMD_TIMEOUT_MS + 1_000);
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Gagal mengirim perintah';
        if (/sesi login berakhir/i.test(msg)) {
          setSession(null);
          setIsAdmin(false);
        }
        setCmdStatus('');
        setCmdError(`Gagal mengirim perintah: ${msg}`);
        setCmdAt(Date.now());
        return false;
      }
    },
    [checkPending, isAdmin, pollLatestForConfirmation, session, zoneId],
  );

  const onSwitch = useCallback(
    (action: 'mist' | 'irigasi', mode: 'on' | 'off' | 'auto') => {
      void sendCommand(action, mode === 'on', { mode });
    },
    [sendCommand],
  );

  const setBlowerDuty = useCallback(
    (value: string | number) => {
      if (value === '' || value === null || value === undefined) {
        setCmdError('Duty blower wajib diisi (0-100%).');
        setCmdAt(Date.now());
        return;
      }
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        setCmdError('Duty blower harus angka 0-100%.');
        setCmdAt(Date.now());
        return;
      }
      void sendCommand('set_blower_duty', Math.round(n));
    },
    [sendCommand],
  );

  const releaseAll = useCallback(() => {
    void sendCommand('auto', true);
  }, [sendCommand]);

  const setPhaseName = useCallback(
    (name: string) => {
      void sendCommand('set_fase', String(name || '').trim());
    },
    [sendCommand],
  );

  const setPhaseSetpoints = useCallback(
    async ({
      vpd,
      name,
      duration,
      unit,
    }: {
      vpd: string;
      name: string;
      duration: string;
      unit: DurationUnit;
    }) => {
      const p = lastDataRef.current?.phase;
      if (!p) {
        setCmdError('Data fase belum tersedia — tunggu pembacaan perangkat.');
        setCmdAt(Date.now());
        return false;
      }

      const jobs: Array<{ action: string; value: unknown; extra?: { unit?: string; seconds?: number } }> = [];
      const vpdText = String(vpd ?? '').trim();
      if (vpdText !== '') {
        const n = Number(vpdText);
        if (!Number.isFinite(n) || n < VPD_TARGET_MIN || n > VPD_TARGET_MAX) {
          setCmdError(`Target VPD harus antara ${VPD_TARGET_MIN} dan ${VPD_TARGET_MAX} kPa.`);
          setCmdAt(Date.now());
          return false;
        }
        if (p.target === null || Math.abs(p.target - n) >= 0.005) {
          jobs.push({ action: 'set_vpd', value: n });
        }
      }

      const nm = String(name ?? '').trim();
      if (nm && nm !== (p.name || '')) {
        jobs.push({ action: 'set_fase', value: nm });
      }

      const durText = String(duration ?? '').trim();
      if (durText !== '') {
        const n = Number(durText);
        if (!Number.isFinite(n) || n < 0) {
          setCmdError('Durasi harus angka >= 0.');
          setCmdAt(Date.now());
          return false;
        }
        const mult = { detik: 1, menit: 60, jam: 3600, hari: 86400 }[unit] || 1;
        const seconds = Math.round(n * mult);
        if (seconds > 31536000) {
          setCmdError('Durasi maksimum 1 tahun.');
          setCmdAt(Date.now());
          return false;
        }
        if (p.duration === null || p.duration !== seconds) {
          jobs.push({ action: 'set_durasi', value: n, extra: { unit, seconds } });
        }
      }

      if (!jobs.length) {
        setCmdStatus('Tidak ada setpoint yang berubah.');
        setCmdError('');
        setCmdAt(Date.now());
        return false;
      }

      const busy = jobs.find((job) => pendingRef.current[job.action]);
      if (busy) {
        setCmdStatus(`Tunggu perintah ${cmdLabel(pendingRef.current[busy.action])} selesai dulu.`);
        setCmdError('');
        setCmdAt(Date.now());
        return false;
      }

      const results = await Promise.all(
        jobs.map((job) => sendCommand(job.action, job.value, { ...job.extra, silent: true })),
      );
      if (results.every(Boolean)) {
        setCmdError('');
        setCmdStatus(`Mengirim ${jobs.length} setpoint — menunggu konfirmasi perangkat…`);
        setCmdAt(Date.now());
        return true;
      }
      return false;
    },
    [sendCommand],
  );

  const resetPhaseCounter = useCallback(() => {
    void sendCommand('fase_reset', true);
  }, [sendCommand]);

  const exportCsv = useCallback(() => {
    const rows = [...logs].sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
    if (!rows.length) {
      setCmdStatus('Belum ada data untuk diekspor.');
      setCmdAt(Date.now());
      return;
    }
    const head = [
      'waktu',
      'suhu_C',
      'kelembapan_pct',
      'tanah_pct',
      'vpd_kPa',
      'etc_mm_hari',
      'status',
      'manual_mode',
      'fase',
      'vpd_target_kPa',
      'fase_aktif',
      'durasi_s',
      'elapsed_s',
      'sisa_s',
      'device',
    ];
    const body = rows.map((row) =>
      [
        row.ts ? new Date(row.ts * 1000).toISOString() : '',
        row.temperature,
        row.humidity,
        row.soil,
        row.vpd,
        row.etc,
        row.statusRaw,
        row.manual ? 'YA' : 'TIDAK',
        row.phase.name,
        row.phase.target,
        row.phase.active ? 'YA' : 'TIDAK',
        row.phase.duration,
        row.phase.elapsed,
        row.phase.remaining,
        row.device,
      ]
        .map(csvCell)
        .join(','),
    );
    const blob = new Blob([`\ufeff${[head.join(',')].concat(body).join('\n')}`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tirtaweda_${zoneId}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setCmdStatus(`${rows.length} baris diekspor ke CSV.`);
    setCmdAt(Date.now());
  }, [logs, zoneId]);

  const setTrendRange = useCallback(
    (range: TrendRangeKey) => {
      if (!TREND_RANGE[range] || range === trendRangeRef.current) return;
      trendRangeRef.current = range;
      setTrendRangeState(range);
      setLogs([]);
      void fetchDataLogs(currentZoneRef.current, range);
    },
    [fetchDataLogs],
  );

  const setLogRows = useCallback((rows: number) => {
    setLogRowsState(Number(rows) || 25);
    setLogPageState(1);
  }, []);

  const setLogFilter = useCallback((value: string) => {
    setLogFilterState(value);
    setLogPageState(1);
  }, []);

  const switchZone = useCallback(
    (index: number) => {
      if (index === currentZoneRef.current) return;
      currentZoneRef.current = index;
      setCurrentZone(index);
      setLastData(null);
      lastDataRef.current = null;
      latestAnyRef.current = null;
      lastDataAtRef.current = 0;
      setLogs([]);
      setLogFilterState('');
      setLogPageState(1);
      setOnline(false);
      setPending({});
      pendingRef.current = {};
      setCmdStatus('');
      setCmdError('');
      setZoneMenuOpen(false);
      void fetchDataLogs(index, trendRangeRef.current);
    },
    [fetchDataLogs],
  );

  const saveZoneLabel = useCallback(
    async (index: number, value: string) => {
      if (!isAdmin) throw new Error('Hanya admin yang boleh mengganti label.');
      const zone = zones[index];
      if (!zone) throw new Error('Zona tidak dikenal.');
      const label = String(value ?? '').trim().slice(0, 40);
      await writeLabel(zone.id, label || null);
      setLabels((prev) => {
        const next = { ...prev };
        if (label) next[zone.id] = label;
        else delete next[zone.id];
        return next;
      });
      return label;
    },
    [isAdmin, zones],
  );

  const refresh = useCallback(async () => {
    setRefreshSpin(true);
    const started = Date.now();
    try {
      const labelsPromise = readLabels().catch(() => null);
      const [, lbls] = await Promise.all([fetchDataLogs(), labelsPromise]);
      if (lbls) setLabels(lbls);
    } finally {
      setTimeout(() => setRefreshSpin(false), Math.max(0, 600 - (Date.now() - started)));
    }
  }, [fetchDataLogs]);

  const login = useCallback(async (email: string, password: string) => {
    const s = await signIn(email, password);
    const admin = isAdminSession(s);
    setSession(s);
    setIsAdmin(admin);
    setLoginOpen(false);
    setCmdError('');
    setCmdStatus(
      admin
        ? 'Login admin berhasil. Kontrol aktuator dan setpoint aktif.'
        : 'Login berhasil, tetapi akun ini bukan admin — hanya bisa melihat data.',
    );
    setCmdAt(Date.now());
  }, []);

  const logout = useCallback(() => {
    signOut();
    setSession(null);
    setIsAdmin(false);
  }, []);

  const age = useMemo(() => {
    if (!clockTrusted(lastData)) return null;
    return Math.max(0, Math.floor(now / 1000) - (lastData!.ts as number));
  }, [lastData, now]);

  const ageText = useMemo(() => humanAge(age), [age]);
  const isStale = useMemo(() => age !== null && age > 300, [age]);

  const metrics = useMemo<MetricItem[]>(() => {
    const d = lastData;
    const ig = d?.irrigation || null;
    const remainingBudget =
      ig && ig.budgetMl !== null && ig.usedMl !== null ? ig.budgetMl - ig.usedMl : null;

    const soilHealth = !d
      ? null
      : d.soilN === 3
        ? { text: '3/3 probe aktif', tone: 'ok' as const }
        : d.soilN >= 1
          ? { text: `${d.soilN}/3 probe aktif`, tone: 'warn' as const }
          : { text: 'probe tidak terdeteksi', tone: 'danger' as const };

    const budgetProgress =
      ig && ig.budgetMl && ig.usedMl !== null
        ? Math.min(100, Math.max(0, (ig.usedMl / ig.budgetMl) * 100))
        : null;

    return [
      {
        key: 'temp',
        label: 'Suhu Udara',
        value: d?.temperature,
        digits: 1,
        unit: '°C',
        hint: 'Sensor SHT31',
      },
      {
        key: 'hum',
        label: 'Kelembapan',
        value: d?.humidity,
        digits: 1,
        unit: '%',
        hint: 'RH relatif',
      },
      {
        key: 'soil',
        label: 'Kadar Air Tanah',
        value: d?.soil,
        digits: 0,
        unit: '%',
        hint: soilHealth?.text || 'rata-rata probe',
        hintTone: soilHealth?.tone,
      },
      {
        key: 'vpd',
        label: 'VPD',
        value: d?.vpd,
        digits: 2,
        unit: 'kPa',
        hint: d?.phase?.target != null ? `target ${d.phase.target.toFixed(2)} kPa` : 'defisit tekanan uap',
      },
      {
        key: 'etc',
        label: 'ETc',
        value: d?.etc,
        digits: 2,
        unit: 'mm/hari',
        hint: d?.tmeanFallback ? 'Tmean sementara (<24j)' : 'Blaney-Criddle',
      },
      ...(ig?.budgetMl != null
        ? [
            {
              key: 'budget' as const,
              label: 'Dosis Harian',
              value: ig.budgetMl,
              unit: '',
              ml: true,
              progressPct: budgetProgress,
              hint:
                remainingBudget === null
                  ? 'anggaran irigasi'
                  : remainingBudget > 0
                    ? `sisa ${fmtMlShort(remainingBudget)}`
                    : 'anggaran habis',
            },
          ]
        : []),
      ...(ig?.usedMl != null
        ? [
            {
              key: 'used' as const,
              label: 'Air Terpakai',
              value: ig.usedMl,
              unit: '',
              ml: true,
              hint: 'akumulasi hari ini',
            },
          ]
        : []),
    ];
  }, [lastData]);

  const trendData = useMemo<TrendPoint[]>(() => {
    const bucket = TREND_RANGE[trendRange].bucket;
    const groups = new Map<number, TelemetryLog[]>();
    for (const row of logs) {
      if (!clockTrusted(row)) continue;
      const slot = Math.floor((row.ts as number) / bucket);
      if (!groups.has(slot)) groups.set(slot, []);
      groups.get(slot)!.push(row);
    }
    const fields = ['temperature', 'humidity', 'vpd', 'etc', 'soil'] as const;
    const out: TrendPoint[] = [];
    for (const [slot, rows] of groups) {
      const point: TrendPoint = {
        ts: slot * bucket,
        temperature: null,
        humidity: null,
        vpd: null,
        etc: null,
        soil: null,
      };
      for (const field of fields) {
        let sum = 0;
        let n = 0;
        for (const r of rows) {
          const v = r[field];
          if (typeof v === 'number' && Number.isFinite(v)) {
            sum += v;
            n += 1;
          }
        }
        point[field] = n ? sum / n : null;
      }
      out.push(point);
    }
    return out;
  }, [logs, trendRange]);

  const matchedLogs = useMemo(() => {
    const filter = logFilter.trim().toLowerCase();
    const rows = [...logs].sort((a, b) => (b.ts ?? -Infinity) - (a.ts ?? -Infinity));
    if (!filter) return rows;
    return rows.filter((row) =>
      `${row.timeText} ${row.statusRaw} ${row.phase.name || ''}`.toLowerCase().includes(filter),
    );
  }, [logFilter, logs]);

  const logPageCount = useMemo(
    () => Math.max(1, Math.ceil(matchedLogs.length / logRows)),
    [logRows, matchedLogs.length],
  );

  const safeLogPage = useMemo(
    () => Math.min(Math.max(1, logPage), logPageCount),
    [logPage, logPageCount],
  );

  const pagedLogs = useMemo(() => {
    const start = (safeLogPage - 1) * logRows;
    return matchedLogs.slice(start, start + logRows);
  }, [logRows, matchedLogs, safeLogPage]);

  const actuatorModes = useMemo(() => {
    if (!lastData) return { mist: 'auto' as OverrideMode, irigasi: 'auto' as OverrideMode, blower: 'auto' as OverrideMode };
    const modes = { ...lastData.override };
    const ig = lastData.irrigation;
    if ((modes.irigasi as string) === 'manual' && ig?.holdReason && !lastData.irigasi) {
      modes.irigasi = 'auto';
    }
    return modes;
  }, [lastData]);

  const overrideChip = useCallback(
    (key: 'mist' | 'irigasi' | 'blower') => {
      if (!lastData) return null;
      const mode = actuatorModes[key];
      const left = lastData.ovLeft[key];
      const since = Math.max(0, Math.floor((now - lastDataAtRef.current) / 1000));
      const seconds = left === null ? 0 : Math.max(0, Math.floor(left) - since);
      if ((mode === 'on' || mode === 'off') && seconds > 0) {
        return `${mode === 'on' ? 'ON' : 'OFF'} ${mmss(seconds)}`;
      }
      return null;
    },
    [actuatorModes, lastData, now],
  );

  const setLogPage = useCallback(
    (page: number) => {
      setLogPageState(Math.min(Math.max(1, page), logPageCount));
    },
    [logPageCount],
  );

  const value: StoreContextValue = {
    zones,
    session,
    isAdmin,
    currentZone,
    zoneId,
    zoneName,
    labels,
    logs,
    lastData,
    trendRange,
    logLimit,
    logRows,
    logPage,
    logFilter,
    online,
    loading,
    loadError,
    now,
    theme,
    pending,
    cmdStatus,
    cmdError,
    cmdAt,
    loginOpen,
    zoneMenuOpen,
    refreshSpin,
    age,
    ageText,
    isStale,
    metrics,
    trendData,
    matchedLogs,
    logPageCount,
    safeLogPage,
    pagedLogs,
    actuatorModes,
    overrideChip,
    toggleTheme,
    setLoginOpen,
    setZoneMenuOpen,
    setTrendRange,
    setLogRows,
    setLogFilter,
    setLogPage,
    switchZone,
    saveZoneLabel,
    refresh,
    login,
    logout,
    onSwitch,
    setBlowerDuty,
    releaseAll,
    setPhaseName,
    setPhaseSetpoints,
    resetPhaseCounter,
    exportCsv,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
