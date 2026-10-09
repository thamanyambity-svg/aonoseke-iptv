# Deux projets Supabase : production et test

| Rôle               | Projet                 | Utilisé par                                              |
| ------------------ | ---------------------- | -------------------------------------------------------- |
| **Production**     | `cvuhvppsdzrjtvrtvrlv` | le site Vercel, `npm run android:apk` (via `.env.local`) |
| **Test (staging)** | `aekmxhcfdqsvlpkycpsn` | `npm run android:apk:staging` (via `.env.staging.local`) |

Les deux projets ont leurs **propres utilisateurs, campagnes et réglages de connexion** : un compte créé dans l'un n'existe pas dans l'autre.

## Compiler l'APK

- Production : `.env.local` contient `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` de `cvuhvppsdzrjtvrtvrlv`, puis `npm run android:apk`.
- Test : `.env.staging.local` contient les deux variables de `aekmxhcfdqsvlpkycpsn`, puis `npm run android:apk:staging`.
- La compilation s'arrête avec un message clair si les variables du mode choisi manquent (sinon l'app affiche « Service indisponible »).
- La clé `sb_publishable_…` est publique par conception ; ne jamais mettre une clé `service_role` dans ces fichiers.

## Préparer un projet Supabase (chaque projet, une fois)

1. SQL Editor : `supabase/schema.sql`, puis les migrations de `supabase/migrations/` dans l'ordre des noms (les deux dernières : `20261009100000_…`, `20261009110000_…`).
2. SQL Editor : `supabase/seed-alpha-import-campaigns.sql` (campagnes ; images servies par le site).
3. Authentication → Providers : activer Google / Facebook / Phone ; Authentication → URL Configuration : ajouter `com.aonoseke.iptv://auth/callback`.
4. Après une première connexion : `update public.profiles set role = 'admin' where email = '<votre e-mail>';`.

## Site web

Le site Vercel lit ses variables dans Vercel → Settings → Environment Variables. Pour qu'il pointe sur l'autre projet, changer ces deux variables et redéployer ; rien n'est à modifier dans le code (la CSP autorise tous les `*.supabase.co`).
