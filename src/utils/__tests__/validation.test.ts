import { describe, it, expect } from 'vitest';
import { isValidUrl, sanitizeLogoUrl } from '../validation';

describe('isValidUrl', () => {
  it('accepts valid https URL', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
  });

  it('accepts valid http URL', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  it('rejects ftp URL by default', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false);
  });

  it('accepts ftp URL when protocol is allowed', () => {
    expect(isValidUrl('ftp://example.com', ['ftp', 'http', 'https'])).toBe(true);
  });

  it('rejects invalid URL', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidUrl('')).toBe(false);
  });

  it('rejects javascript: URL', () => {
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });
});

describe('sanitizeLogoUrl', () => {
  it('returns trimmed valid URL', () => {
    expect(sanitizeLogoUrl('  https://example.com/logo.png  ')).toBe('https://example.com/logo.png');
  });

  it('returns empty for invalid URL', () => {
    expect(sanitizeLogoUrl('invalid')).toBe('');
  });

  it('returns empty for empty string', () => {
    expect(sanitizeLogoUrl('')).toBe('');
  });

  it('rejects javascript: URL', () => {
    expect(sanitizeLogoUrl('javascript:alert(1)')).toBe('');
  });
});
