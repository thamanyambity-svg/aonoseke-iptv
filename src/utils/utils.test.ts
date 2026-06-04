import { describe, it, expect, beforeEach } from 'vitest';
import { calculateVisibleItems, getVisibleSlice } from '../utils/virtualScroll.ts';
import { isValidUrl, sanitizeLogoUrl } from '../utils/validation.ts';

describe('Virtual Scroll Utils', () => {
  it('calculates visible items with no scroll', () => {
    const result = calculateVisibleItems(100, 56, 400, 0);
    expect(result.offset).toEqual(0);
    expect(result.limit).toBeGreaterThan(0);
  });

  it('returns empty slice for invalid params', () => {
    const items: string[] = [];
    const result = getVisibleSlice(items, 0, 10);
    expect(result.items.length).toEqual(0);
  });
});

describe('URL Validation', () => {
  it('validates http URLs', () => {
    expect(isValidUrl('http://example.com/logo.png')).toBe(true);
  });

  it('validates https URLs', () => {
    expect(isValidUrl('https://example.com/logo.png')).toBe(true);
  });

  it('rejects invalid URLs', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
  });
});

describe('Logo Sanitization', () => {
  it('sanitizes valid URLs', () => {
    const url = 'https://example.com/logo.png';
    const result = sanitizeLogoUrl(url);
    expect(result).toBe(url);
  });

  it('returns empty for invalid URLs', () => {
    expect(sanitizeLogoUrl('javascript:alert("xss")')).toBe('');
  });

  it('handles empty input', () => {
    expect(sanitizeLogoUrl('')).toBe('');
  });
});
