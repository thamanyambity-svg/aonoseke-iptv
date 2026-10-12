import type { StreamCheck } from './stream-status.mjs';

export const MAX_FAILED_CHECKS: number;
export type Bucket = 'ok' | 'geo' | 'pending' | 'dead';
export function decideChannel(
  ch: Record<string, unknown>,
  result: Pick<StreamCheck, 'status' | 'reason'>,
  now: string,
): { bucket: Bucket; entry: Record<string, unknown> | null };
