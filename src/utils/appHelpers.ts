/**
 * Helpers partagés de l'application (extraits de App.tsx pour réduire sa taille).
 *
 * @module appHelpers
 */
import { useState, useEffect } from 'react';

// ─── Drapeaux et noms de pays ────────────────────────────────────────────────

export function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '🌐';
  const codePoints = [...code.toUpperCase()].map(
    (c) => 0x1f1e6 - 0x41 + c.charCodeAt(0),
  );
  return String.fromCodePoint(...codePoints);
}

export const COUNTRY_NAMES: Record<string, string> = {
  FR: 'France', BE: 'Belgique', CH: 'Suisse', CA: 'Canada',
  MA: 'Maroc', DZ: 'Algérie', TN: 'Tunisie', SN: 'Sénégal',
  CD: 'Congo RDC', CI: "Côte d'Ivoire", CM: 'Cameroun', GA: 'Gabon',
  TG: 'Togo', BJ: 'Bénin', ML: 'Mali', BF: 'Burkina Faso',
  US: 'USA', GB: 'UK', DE: 'Allemagne', IT: 'Italie',
  ES: 'Espagne', PT: 'Portugal', RU: 'Russie', TR: 'Turquie',
  SA: 'Arabie Saoudite', AE: 'Émirats', QA: 'Qatar', EG: 'Égypte',
  IN: 'Inde', CN: 'Chine', JP: 'Japon', KR: 'Corée',
  BR: 'Brésil', MX: 'Mexique', AR: 'Argentine', AU: 'Australie',
};

export function countryLabel(code: string): string {
  return `${countryFlag(code)} ${COUNTRY_NAMES[code] ?? code}`;
}

// ─── useDebounce ────────────────────────────────────────────────────────────

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
