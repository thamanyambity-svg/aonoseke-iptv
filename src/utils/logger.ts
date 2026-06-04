import { appConfig } from '../config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private enabled = appConfig.enableLogging;

  debug(message: string, details?: Record<string, unknown>): void {
    if (!this.enabled) return;
    console.debug(`[DBG] ${message}`, details ?? '');
  }

  info(message: string, details?: Record<string, unknown>): void {
    if (!this.enabled) return;
    console.info(`[INF] ${message}`, details ?? '');
  }

  warn(message: string, details?: Record<string, unknown>): void {
    if (!this.enabled) return;
    console.warn(`[WRN] ${message}`, details ?? '');
  }

  error(message: string, error?: Error, details?: Record<string, unknown>): void {
    if (!this.enabled) return;
    console.error(`[ERR] ${message}`, details ?? '', error?.stack ?? '');
  }
}

export const logger = new Logger();
