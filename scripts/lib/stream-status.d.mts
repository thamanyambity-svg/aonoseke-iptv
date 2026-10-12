export type StreamStatus = 'ok' | 'geo' | 'dead';
export interface StreamCheck {
  status: StreamStatus;
  reason: string;
  code?: number;
}
export function classifyHttp(status: number, body?: string): StreamCheck;
export function classifyError(err: unknown): StreamCheck;
export function checkStream(
  url: string,
  opts?: { timeoutMs?: number; fetchImpl?: typeof fetch },
): Promise<StreamCheck>;
