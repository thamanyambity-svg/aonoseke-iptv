import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Garde-fou : une requête supabase-js (`.from(...).insert()`, `.rpc(...)`, etc.) n'est envoyée que si on
 * l'attend (`await`) ou si on appelle `.then()`. `void supabase.from(...).insert(...)` seul n'envoie rien :
 * c'est ce défaut qui laissait view_events vide (statistiques d'audience à zéro).
 */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === '__tests__' ? [] : sources(p);
    return /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f) ? [p] : [];
  });
}

describe('requêtes supabase-js jamais envoyées', () => {
  it('aucun « void supabase…from()/rpc() » sans .then()', () => {
    const fautes: string[] = [];
    for (const file of sources('src')) {
      const code = readFileSync(file, 'utf8');
      // Instructions commençant par « void <client>.from( » ou « void <client>.rpc( », jusqu'au « ; »
      for (const m of code.matchAll(/void\s+\w+!?\s*\.\s*(?:from|rpc)\s*\([^;]*;/g)) {
        if (!/\.then\s*\(/.test(m[0])) fautes.push(`${file} : ${m[0].slice(0, 80).replace(/\s+/g, ' ')}…`);
      }
    }
    expect(fautes).toEqual([]);
  });
});
