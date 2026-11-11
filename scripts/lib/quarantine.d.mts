export const RESTORE_AFTER_OK: number;
export const QUARANTINE_MAX_DAYS: number;
export interface QuarantineEntry { channel: Record<string, any>; reason: string; since: string; okRuns: number; lastReason?: string }
export function quarantineAdd(quarantine: QuarantineEntry[], ch: Record<string, any>, reason: string, now: string): QuarantineEntry[];
export function quarantineStep(
  quarantine: QuarantineEntry[],
  results: Map<string, { status: 'ok' | 'geo' | 'dead'; reason: string }>,
  now: string,
): { quarantine: QuarantineEntry[]; restored: Array<Record<string, any>>; abandoned: number };
