import { logger } from './logger.ts';

export function isValidUrl(url: string, protocols: string[] = ['http', 'https']): boolean {
  try {
    const parsed = new URL(url);
    return protocols.includes(parsed.protocol.replace(':', ''));
  } catch {
    return false;
  }
}

export function sanitizeLogoUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!isValidUrl(trimmed)) {
    logger.warn('Invalid logo URL filtered', { url: trimmed });
    return '';
  }
  return trimmed;
}

export function isLocalStorageAvailable(): boolean {
  try {
    const test = '__ls_test__';
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

export function getLocalStorageItem<T>(key: string, fallback: T): T {
  try {
    if (!isLocalStorageAvailable()) return fallback;
    const item = window.localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (error) {
    logger.warn('Failed to read from localStorage', { key, error });
    return fallback;
  }
}

export function setLocalStorageItem<T>(key: string, value: T): boolean {
  try {
    if (!isLocalStorageAvailable()) return false;
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error('Failed to write to localStorage', error as Error, { key });
    return false;
  }
}
