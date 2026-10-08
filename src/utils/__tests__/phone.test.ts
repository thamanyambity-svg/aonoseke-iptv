import { describe, it, expect } from 'vitest';
import { toE164, cleanOtp } from '../phone';

describe('toE164', () => {
  it('ajoute l’indicatif et retire le 0 national', () => {
    expect(toE164('+243', '081 234 56 78')).toBe('+243812345678');
    expect(toE164('+243', '812345678')).toBe('+243812345678');
  });
  it('accepte un numéro déjà international (+ ou 00)', () => {
    expect(toE164('+243', '+225 07 01 02 03 04')).toBe('+225070102030' + '4');
    expect(toE164('+243', '0033612345678')).toBe('+33612345678');
  });
  it('ignore tirets, points et parenthèses', () => {
    expect(toE164('+33', '06.12.34.56.78')).toBe('+33612345678');
    expect(toE164('+1', '(514) 555-0199')).toBe('+15145550199');
  });
  it('refuse les numéros trop courts, trop longs ou vides', () => {
    expect(toE164('+243', '123')).toBeNull();
    expect(toE164('+243', '')).toBeNull();
    expect(toE164('+243', '1'.repeat(20))).toBeNull();
  });
});

describe('cleanOtp', () => {
  it('garde 6 chiffres au plus', () => {
    expect(cleanOtp('12 34-56 78')).toBe('123456');
    expect(cleanOtp('abc')).toBe('');
  });
});
