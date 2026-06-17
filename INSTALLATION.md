# 📦 Guide d'installation — Aonoseke IPTV V2

Ce ZIP contient toutes les modifications apportées au projet Aonoseke IPTV Web Player dans le cadre du pivot stratégique vers un modèle 100% gratuit + publicité multi-annonceurs.

## 📋 Contenu

### Fichiers modifiés (16)
- `.env.example` — Variable Flutterwave retirée
- `README.md` — Feature "100% Free" + note modèle commercial
- `package.json` — Scripts `test:e2e` + dépendances Playwright
- `package-lock.json` — Lock des dépendances
- `vite.config.ts` — Exclusion tests E2E de vitest
- `src/App.css` — CSS Admin unifié + onglets + AdMgmt (+329 lignes)
- `src/App.tsx` — Refactoring + intégration AdMgmt + UTM
- `src/main.tsx` — Capture UTM au démarrage
- `src/components/AdminDashboard.tsx` — Onglets + Realtime + heatmap pro
- `src/components/Heatmap.tsx` — Refonte pro (5 paliers + légende)
- `src/components/Profile.tsx` — Bouton "Gestion publicitaire"
- `src/hooks/useAds.ts` — Rotation multi-annonceurs + anti-fraude + UTM
- `supabase/schema.sql` — 8 tables + 24 RPC + RLS + UTM (970 lignes)

### Fichiers supprimés (3, archivés dans `archive/`)
- `src/components/Paywall.tsx` → `archive/components/Paywall.tsx`
- `src/hooks/useTrial.ts` → `archive/hooks/useTrial.ts`
- `src/lib/payment.ts` → `archive/lib/payment.ts`

### Fichiers créés (11)
- `api/track-ad.js` — Endpoint anti-fraude (HMAC + dédup + rate limit)
- `archive/components/Paywall.tsx` — Sauvegarde historique
- `archive/hooks/useTrial.ts` — Sauvegarde historique
- `archive/lib/payment.ts` — Sauvegarde historique
- `playwright.config.ts` — Config tests E2E
- `src/components/AdManagementDashboard.tsx` — Dashboard multi-annonceurs
- `src/hooks/useAdvertisers.ts` — CRUD annonceurs
- `src/hooks/useCampaigns.ts` — CRUD campagnes
- `src/utils/appHelpers.ts` — Helpers extraits de App.tsx
- `src/utils/utmTracking.ts` — Capture UTM Phase 1
- `tests/e2e/player.spec.ts` — 10 tests Playwright (7 parcours critiques)

## 🚀 Procédure d'installation

### Étape 1 — Extraire le ZIP

```bash
# Sur votre machine, dans votre dépôt local existant
cd chemin/vers/votre/aonoseke-iptv

# Extraire le ZIP (après l'avoir téléchargé)
unzip ~/Downloads/aonoseke-projet-complet.zip -d /tmp/aonoseke-new/

# Copier le contenu par-dessus votre dépôt
cp -rf /tmp/aonoseke-new/. .
```

### Étape 2 — Vérifier les changements

```bash
git status
git diff --stat HEAD
```

Vous devez voir :
- 16 fichiers modifiés
- 11 fichiers nouveaux (untracked)
- 3 fichiers supprimés (Paywall.tsx, payment.ts, useTrial.ts)

### Étape 3 — Installer les nouvelles dépendances

```bash
npm install
```

Cela installera Playwright et ses dépendances.

### Étape 4 — Installer Chromium pour Playwright

```bash
npx playwright install chromium
```

### Étape 5 — Valider en local

```bash
# Type-check
npm run type-check

# Tests unitaires
npm run test -- --run

# Build
npm run build

# Tests E2E (optionnel, démarre Vite automatiquement)
npm run test:e2e
```

Vous devez obtenir :
- ✅ Type-check sans erreur
- ✅ 18 tests unitaires passent
- ✅ Build OK (294 KB / 77 KB gzippé)
- ✅ 10 tests E2E passent

### Étape 6 — Committer et pousser

```bash
git add .

git commit -m "feat: pivot 100% gratuit + plateforme pub multi-annonceurs + UTM + E2E

- Suppression code premium (Paywall, payment, useTrial) → archive/
- Plateforme publicitaire multi-annonceurs (advertisers, campaigns, ad_events)
- Endpoint anti-fraude /api/track-ad.js (HMAC + dédup + rate limit)
- Dashboard admin unifié avec onglets Audience/Publicité
- Heatmap pro (5 paliers + légende + synthèse)
- Présence temps réel (Supabase Realtime + polling intelligent)
- UTM tracking Phase 1 (capture + propagation aux clics pub)
- Suite E2E Playwright (10 tests, 7 parcours critiques)
- Refactoring helpers (appHelpers.ts)
- Schéma SQL étendu (970 lignes, 24 RPC, 8 tables)
- 9 anomalies admin corrigées"

git push origin main
```

Vercel déploie automatiquement après le push.

### Étape 7 — Configurer les variables d'environnement sur Vercel

Allez sur **Vercel Dashboard → votre projet → Settings → Environment Variables**.

#### Variables obligatoires (côté serveur)

| Variable | Valeur | Où la trouver |
|----------|--------|---------------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_SERVICE_KEY` | `eyJhbGc...` (clé **service_role**, pas anon) | Supabase Dashboard → Settings → API → service_role key |
| `AD_TRACKING_SECRET` | Une chaîne aléatoire de 32+ caractères | À générer (voir ci-dessous) |
| `CRON_SECRET` | Une chaîne aléatoire | À générer |

#### Variables côté client (préfixe `VITE_`, probablement déjà présentes)

| Variable | Valeur |
|----------|--------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` (clé **anon public**) |
| `VITE_MAPBOX_TOKEN` | `pk.eyJ...` (optionnelle) |

#### Générer des secrets aléatoires

```bash
# AD_TRACKING_SECRET (32 caractères hex)
openssl rand -hex 32

# CRON_SECRET (16 caractères hex)
openssl rand -hex 16
```

⚠️ Cochez bien les 3 environnements (Production, Preview, Development) pour chaque variable.

#### Redéployer après ajout des variables

Sur Vercel Dashboard → onglet « Deployments » → 3 points du dernier déploiement → **Redeploy**.

### Étape 8 — Appliquer le schéma SQL sur Supabase

1. Allez sur **Supabase Dashboard → votre projet → SQL Editor → New query**
2. Ouvrez le fichier `supabase/schema.sql` de ce ZIP
3. Copiez-collez l'intégralité (970 lignes) dans l'éditeur
4. Cliquez sur **Run** (Ctrl+Enter)

Les `create table if not exists`, `create or replace function`, et `alter table add column if not exists` sont **idempotents** — vous pouvez exécuter le script sans risque.

### Étape 9 — Activer Realtime sur la table `profiles`

1. Supabase Dashboard → Database → Replication
2. Trouvez la table `profiles`
3. Activez le toggle `supabase_realtime`
4. Sauvegardez

### Étape 10 — Tester en production

1. Visitez votre URL Vercel (ex : `https://aonoseke-iptv.vercel.app`)
2. Vérifiez la landing page + badge « 100% gratuit »
3. Cliquez sur « Aperçu démo » → le player doit se charger
4. Inscrivez-vous, puis dans Supabase Table Editor → `profiles` → mettez `role` = `admin` pour votre user
5. Rechargez l'app → avatar → Profil → « Gestion publicitaire »
6. Créez un annonceur test + une campagne → elle doit apparaître

## 🆘 Dépannage

| Symptôme | Cause probable | Solution |
|----------|---------------|----------|
| Build Vercel échoue | Erreur TypeScript | Vérifiez les logs Vercel, lancez `npm run type-check` en local |
| Dashboard admin « Backend non configuré » | Variables Supabase client manquantes | Vérifiez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` |
| RPC « fonction n'existe pas » | Schéma SQL non appliqué | Exécutez `schema.sql` dans Supabase SQL Editor |
| Clicks pub non trackés | Endpoint `/api/track-ad` sans variables serveur | Vérifiez `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `AD_TRACKING_SECRET` |
| Realtime ne marche pas | Table `profiles` pas en replication | Activez dans Database → Replication |
| Utilisateur non admin | Rôle pas mis à jour | Table Editor → profiles → colonne `role` → `admin` |

## 📊 Statistiques

- 4 425 lignes ajoutées
- 2 103 lignes supprimées
- 16 fichiers modifiés
- 11 fichiers créés
- 3 fichiers supprimés (archivés)
- Bundle final : 294 KB (77 KB gzippé)
- 18 tests unitaires + 10 tests E2E

## 📁 Structure du ZIP

```
aonoseke-projet-complet/
├── .env.example
├── README.md
├── INSTALLATION.md          ← Ce fichier
├── package.json
├── package-lock.json
├── vite.config.ts
├── playwright.config.ts     ← Nouveau
├── api/
│   ├── cron-uptime.js
│   └── track-ad.js          ← Nouveau
├── archive/                 ← Nouveau (historique)
│   ├── components/Paywall.tsx
│   ├── hooks/useTrial.ts
│   └── lib/payment.ts
├── docs/
├── public/
├── scripts/
├── src/
│   ├── App.css
│   ├── App.tsx
│   ├── App.test.tsx
│   ├── Landing.tsx
│   ├── Landing.css
│   ├── main.tsx
│   ├── index.css
│   ├── config.ts
│   ├── types.ts
│   ├── types-exports.ts
│   ├── components/
│   │   ├── AdminDashboard.tsx
│   │   ├── AdManagementDashboard.tsx  ← Nouveau
│   │   ├── AlphaLogo.tsx
│   │   ├── AlphaLogoAnimated.tsx
│   │   ├── AlphaLogoAnimated.css
│   │   ├── BannerAd.tsx
│   │   ├── CinematicBg.tsx
│   │   ├── CinematicBg.css
│   │   ├── Directory.tsx
│   │   ├── Heatmap.tsx
│   │   ├── MapboxMap.tsx
│   │   ├── Player.tsx
│   │   ├── PreRollAd.tsx
│   │   ├── Profile.tsx
│   │   └── WorldMap.tsx
│   ├── hooks/
│   │   ├── useAds.ts
│   │   ├── useAdvertisers.ts           ← Nouveau
│   │   ├── useAnalytics.ts
│   │   ├── useAuth.ts
│   │   ├── useCampaigns.ts             ← Nouveau
│   │   ├── useDeadChannels.ts
│   │   ├── useFavorites.ts
│   │   └── useSites.ts
│   ├── lib/
│   │   └── supabaseClient.ts
│   └── utils/
│       ├── appHelpers.ts               ← Nouveau
│       ├── errors.ts
│       ├── logger.ts
│       ├── validation.ts
│       ├── utmTracking.ts               ← Nouveau
│       ├── virtualScroll.ts
│       └── utils.test.ts
├── supabase/
│   └── schema.sql
└── tests/
    └── e2e/
        └── player.spec.ts              ← Nouveau
```
