export type OverrideMode = 'on' | 'off' | 'auto' | 'unknown';
export type TrendRangeKey = '6j' | '24j';
export type ThemeMode = 'light' | 'dark';
export type DurationUnit = 'detik' | 'menit' | 'jam' | 'hari';

export interface ZoneConfig {
  id: string;
  name: string;
}

export interface AuthSession {
  idToken: string;
  refreshToken: string;
  uid: string;
  email: string;
  expiresAt: number;
}

export interface PhaseInfo {
  name: string | null;
  target: number | null;
  active: boolean;
  duration: number | null;
  elapsed: number | null;
  remaining: number | null;
}

export interface IrrigationInfo {
  doseMl: number | null;
  doseMs: number | null;
  budgetMl: number | null;
  usedMl: number | null;
  intervalMin: number | null;
  holdReason: string;
}

export interface TelemetryLog {
  _key: string;
  ts: number | null;
  timeText: string;
  synced: boolean;
  device: string;
  temperature: number | null;
  humidity: number | null;
  soil: number | null;
  soil2: number | null;
  soil3: number | null;
  soilOk: number | null;
  soilN: number;
  vpd: number | null;
  etc: number | null;
  tmean: number | null;
  tmeanFallback: boolean;
  blowerLevel: number | null;
  misting: boolean;
  irigasi: boolean;
  blower: boolean;
  status: string | null;
  statusRaw: string;
  manual: boolean;
  fuzzy: {
    mist: boolean | null;
    irigasi: boolean | null;
    blower: boolean | null;
  };
  ovLeft: {
    mist: number | null;
    irigasi: number | null;
    blower: number | null;
  };
  flags: {
    sensorError: boolean;
    soilErr: boolean;
    noSync: boolean;
    irrigOff: boolean;
  };
  phase: PhaseInfo;
  irrigation: IrrigationInfo;
  override: {
    mist: OverrideMode;
    irigasi: OverrideMode;
    blower: OverrideMode;
  };
}

export interface TrendPoint {
  ts: number;
  temperature: number | null;
  humidity: number | null;
  vpd: number | null;
  etc: number | null;
  soil: number | null;
}

export interface MetricItem {
  key: 'temp' | 'hum' | 'soil' | 'vpd' | 'etc' | 'budget' | 'used';
  label: string;
  value: number | null | undefined;
  digits?: number;
  unit: string;
  ml?: boolean;
  hint?: string;
  hintTone?: 'ok' | 'warn' | 'danger';
  progressPct?: number | null;
}

export interface PendingCommand {
  action: string;
  value: unknown;
  mode: string | null;
  seconds: number | null;
  commandId: string | null;
  baselineLogKey: string | null;
  baselineLogTs: number | null;
  sentAt: number;
  deadline: number;
}
