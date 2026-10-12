export const WEB_ORIGIN: string;
export const APP_ORIGIN: string;
export function corsAllows(acao: string | null | undefined, origin: string): boolean;
export function looksLikeMedia(bytes: Uint8Array | null | undefined): boolean;
export interface DeepCheck {
  status: 'ok' | 'geo' | 'dead';
  reason: string;
  retryable: boolean;
  cors: { web: boolean; app: boolean };
  code?: number;
}
export function deepCheckStream(
  url: string,
  opts?: { timeoutMs?: number; fetchImpl?: typeof fetch },
): Promise<DeepCheck>;
