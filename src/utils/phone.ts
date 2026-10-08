/** Indicatifs proposés (Afrique francophone en tête). */
export const COUNTRY_CODES: ReadonlyArray<{ code: string; label: string }> = [
  { code: '+243', label: '🇨🇩 RDC (+243)' },
  { code: '+242', label: '🇨🇬 Congo (+242)' },
  { code: '+225', label: "🇨🇮 Côte d'Ivoire (+225)" },
  { code: '+221', label: '🇸🇳 Sénégal (+221)' },
  { code: '+237', label: '🇨🇲 Cameroun (+237)' },
  { code: '+226', label: '🇧🇫 Burkina Faso (+226)' },
  { code: '+223', label: '🇲🇱 Mali (+223)' },
  { code: '+228', label: '🇹🇬 Togo (+228)' },
  { code: '+229', label: '🇧🇯 Bénin (+229)' },
  { code: '+241', label: '🇬🇦 Gabon (+241)' },
  { code: '+212', label: '🇲🇦 Maroc (+212)' },
  { code: '+213', label: '🇩🇿 Algérie (+213)' },
  { code: '+216', label: '🇹🇳 Tunisie (+216)' },
  { code: '+33', label: '🇫🇷 France (+33)' },
  { code: '+32', label: '🇧🇪 Belgique (+32)' },
  { code: '+41', label: '🇨🇭 Suisse (+41)' },
  { code: '+1', label: '🇨🇦 Canada / 🇺🇸 USA (+1)' },
];

/**
 * Construit un numéro au format international E.164 (ex. +243812345678).
 * - ignore espaces, points, tirets et parenthèses ;
 * - retire le « 0 » national de tête (081… → 81…) ;
 * - accepte un numéro déjà saisi avec « + » ou « 00 ».
 * Renvoie null si le résultat n'a pas 8 à 15 chiffres.
 */
export function toE164(countryCode: string, input: string): string | null {
  let digits = input.replace(/[\s.\-()]/g, '');
  let full: string;
  if (digits.startsWith('+')) {
    full = '+' + digits.slice(1).replace(/\D/g, '');
  } else if (digits.startsWith('00')) {
    full = '+' + digits.slice(2).replace(/\D/g, '');
  } else {
    digits = digits.replace(/\D/g, '').replace(/^0+/, '');
    full = countryCode + digits;
  }
  const n = full.slice(1);
  return /^[1-9]\d{7,14}$/.test(n) ? full : null;
}

/** Garde uniquement les chiffres d'un code SMS (6 chiffres max). */
export function cleanOtp(input: string): string {
  return input.replace(/\D/g, '').slice(0, 6);
}
