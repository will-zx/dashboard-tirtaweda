/// <reference types="vite/client" />

declare module '../config.js' {
  export const DB_URL: string;
  export const ZONES: Array<{ id: string; name: string }>;
  export const ADMIN_UID: string;
  export const ADMIN_EMAIL: string;
  export const firebaseConfig: {
    apiKey: string;
    projectId: string;
    authDomain: string;
  };
  export const TREND_RANGE: Record<
    '6j' | '24j',
    { limit: number; bucket: number; pollMs: number; label: string; short: string }
  >;
  export const CMD_TIMEOUT_MS: number;
  export const VPD_TARGET_MIN: number;
  export const VPD_TARGET_MAX: number;
}

declare module './firebase.js' {
  import type { AuthSession } from '../types.ts';
  export function getSession(): AuthSession | null;
  export function isAdminSession(s?: AuthSession | null): boolean;
  export function signIn(email: string, password: string): Promise<AuthSession>;
  export function signOut(): void;
  export function ensureSession(): Promise<AuthSession | null>;
  export function readLogs(zoneId: string, limit: number): Promise<Record<string, unknown> | null>;
  export function readLabels(): Promise<Record<string, string> | null>;
  export function writeCommand(zoneId: string, body: Record<string, unknown>): Promise<{ name?: string } | null>;
  export function writeLabel(zoneId: string, label: string | null): Promise<unknown>;
}

declare module './format.js' {
  export function fmtNum(v: number | null | undefined, d?: number): string;
  export function fmtMl(v: number | null | undefined): string | null;
  export function fmtLogTime(ts: number | null | undefined): string;
  export function fmtClock(ts: number | null | undefined): string;
  export function fmtTimeShort(ts: number | null | undefined): string;
  export function humanAge(sec: number | null | undefined): string;
  export function fmtDuration(sec: number | null | undefined): string;
  export function mmss(s: number): string;
  export function fmtPercent(v: number | null | undefined): string;
  export function csvCell(v: unknown): string;
}

declare module './command-confirmation.js' {
  import type { PendingCommand, TelemetryLog } from '../types.ts';
  export function isCommandConfirmed(pending: PendingCommand, row: TelemetryLog | null): boolean;
}
