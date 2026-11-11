export function mergeCandidates(
  playlist: Array<Record<string, any>>,
  results: Array<{ name: string; url: string; country: string; group: string; logo?: string; source?: string; status: 'ok' | 'geo' | 'dead'; reason?: string }>,
  now: string,
): { playlist: Array<Record<string, any>>; added: Array<Record<string, any>>; skipped: { dead: number; known: number } };
