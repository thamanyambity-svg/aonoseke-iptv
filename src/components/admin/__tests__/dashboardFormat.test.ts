import { describe, it, expect } from 'vitest';
import {
  csvEscape, fmtCtr, fmtShare, fmtTimeAgo, isOnline, flagEmoji, deviceLabel, fmtNumber, ONLINE_THRESHOLD_MS,
} from '../dashboardFormat';

describe('csvEscape', () => {
  it('neutralise les formules (= + - @) avec une apostrophe, même quand la valeur est entre guillemets', () => {
    expect(csvEscape('=1+1')).toBe("'=1+1");
    expect(csvEscape('+33 6 12')).toBe("'+33 6 12");
    expect(csvEscape('-5')).toBe("'-5");
    expect(csvEscape('@cmd')).toBe("'@cmd");
    expect(csvEscape('=HYPERLINK("http://x","clic")')).toBe(`"'=HYPERLINK(""http://x"",""clic"")"`);
  });
  it('met entre guillemets les virgules, guillemets et retours à la ligne', () => {
    expect(csvEscape('Kinshasa, RDC')).toBe('"Kinshasa, RDC"');
    expect(csvEscape('dit "oui"')).toBe('"dit ""oui"""');
    expect(csvEscape('a\nb')).toBe('"a\nb"');
  });
  it('laisse les valeurs simples intactes et gère null / nombres', () => {
    expect(csvEscape('jean')).toBe('jean');
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(42)).toBe('42');
  });
});

describe('fmtCtr', () => {
  it('formate en pourcentage français à 2 décimales', () => {
    expect(fmtCtr(1, 80).replace(/\s/g, ' ')).toBe('1,25 %');
    expect(fmtCtr(0, 10).replace(/\s/g, ' ')).toBe('0,00 %');
  });
  it('affiche un tiret quand il n’y a aucune impression (pas de faux 0 %)', () => {
    expect(fmtCtr(0, 0)).toBe('—');
    expect(fmtCtr(3, 0)).toBe('—');
  });
});

describe('fmtShare / fmtNumber', () => {
  it('calcule une part entière et protège la division par zéro', () => {
    expect(fmtShare(1, 3).replace(/\s/g, ' ')).toBe('33 %');
    expect(fmtShare(5, 0).replace(/\s/g, ' ')).toBe('0 %');
  });
  it('formate les nombres à la française', () => {
    expect(fmtNumber(1234.56, 1).replace(/\s/g, ' ')).toBe('1 234,6');
  });
});

describe('présence et temps relatif', () => {
  const now = Date.parse('2026-10-09T12:00:00Z');
  it('« en ligne » = dernier signe de vie < 90 s (même seuil que la base)', () => {
    expect(ONLINE_THRESHOLD_MS).toBe(90_000);
    expect(isOnline('2026-10-09T11:58:45Z', now)).toBe(true);   // 75 s
    expect(isOnline('2026-10-09T11:58:20Z', now)).toBe(false);  // 100 s
    expect(isOnline('pas une date', now)).toBe(false);
  });
  it('« il y a … » est cohérent et ne devient jamais négatif', () => {
    expect(fmtTimeAgo('2026-10-09T11:59:58Z', now)).toBe("à l'instant");
    expect(fmtTimeAgo('2026-10-09T11:59:30Z', now)).toBe('il y a 30 s');
    expect(fmtTimeAgo('2026-10-09T11:50:00Z', now)).toBe('il y a 10 min');
    expect(fmtTimeAgo('2026-10-09T09:00:00Z', now)).toBe('il y a 3 h');
    expect(fmtTimeAgo('2026-10-07T12:00:00Z', now)).toBe('il y a 2 j');
    expect(fmtTimeAgo('2026-10-09T12:05:00Z', now)).toBe("à l'instant");
  });
});

describe('libellés', () => {
  it('drapeaux et appareils', () => {
    expect(flagEmoji('CD')).toBe('🇨🇩');
    expect(flagEmoji(null)).toBe('🌍');
    expect(flagEmoji('XYZ')).toBe('🌍');
    expect(deviceLabel('desktop')).toBe('Ordinateur');
    expect(deviceLabel('tv')).toBe('TV');
    expect(deviceLabel(null)).toBe('—');
  });
});
