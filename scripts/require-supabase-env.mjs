#!/usr/bin/env node
// Garde-fou avant de construire l'application native : sans VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY,
// le client Supabase est désactivé dans le bundle et l'app affiche « Service indisponible » à la connexion
// (et ne charge plus les campagnes publicitaires). Ces variables sont lues par Vite depuis l'environnement ou .env.local.
import { loadEnv } from 'vite';

const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env };
const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter((k) => !env[k]);
if (missing.length > 0) {
  console.error(`\n✖ Variables manquantes : ${missing.join(', ')}`);
  console.error('  Créez .env.local (voir .env.example) ou exportez-les avant « npm run android:apk ».');
  console.error('  Sans elles, l’APK affichera « Service indisponible » à la connexion.\n');
  process.exit(1);
}
console.log('✔ Configuration Supabase trouvée pour la compilation native.');
