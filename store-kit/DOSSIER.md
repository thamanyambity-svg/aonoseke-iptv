# Dossier de soumission app-stores — AMBITY.A IPTV PLAYER

> Modèle : **BYO-playlist** (l'app ne fournit AUCUNE chaîne ; l'utilisateur importe sa propre liste M3U).
> Éditeur : A.Onoseke House Investment RDC (RCCM, Kinshasa). App : web app Vite/React, live sur Vercel.
> Recherche vérifiée sur les portails développeurs officiels — juin 2026.

---

## 0. 🔴 PRÉREQUIS BLOQUANTS (à faire AVANT toute soumission)

| # | Prérequis | Pourquoi | Statut |
|---|---|---|---|
| 1 | **Retirer la playlist bundlée** (`public/playlist.json` + `sites.json`) du build livré | Tant que l'app ship des chaînes pré-remplies, elle N'EST PAS BYO-playlist → **rejet IP garanti** (Google/Apple/Amazon). | ❌ à faire |
| 2 | **Ajouter le PWA** : `manifest.webmanifest` + service worker + icônes 192/512 (absents aujourd'hui) | Requis pour Google Play (TWA), Microsoft Store, et l'installation navigateur. | ❌ à faire |
| 3 | **Assainir les assets** : aucun logo de chaîne/marque tierce dans l'icône, le nom ou les captures. Démo = flux **libre de droits** (Big Buck Bunny / flux test HLS public), éditeur de playlist **vide**. | Un seul logo beIN/Canal+/Netflix dans un screenshot = rejet immédiat. | ❌ à faire |
| 4 | **Réécrire `terms.html` §3 + la description** : « lecteur neutre, ne fournit/héberge/indexe aucun contenu » | C'est la formulation qui fait passer la revue (précédents : VLC, iPlayTV). | ❌ à faire |
| 5 | **Déclarer la collecte de données** (analytics d'audience + IP via `track_presence` + pre-roll `ads.json`) dans Data-safety / App Privacy | Incohérence déclaration↔comportement = rejet/retrait. | ❌ à faire |

**→ Tant que #1 à #5 ne sont pas faits, ne soumettre nulle part.** Ce sont surtout des changements de packaging/texte, pas une refonte.

---

## 1. Ordre de soumission recommandé (solo, cost-conscious)

1. **Maintenant, gratuit, zéro risque** — promouvoir l'app comme **PWA installable** depuis le navigateur (Add to Home Screen). Pas besoin de store pour ça.
2. **Microsoft Store** — via **PWABuilder** (gratuit, emballe le PWA directement). Le plus facile, bon pour roder le dossier.
3. **Google Play** (25 $ unique, compte **Organisation**) **+ Amazon Appstore/Fire TV** (gratuit) — la vraie portée.
4. **LG webOS** — **hosted web app** (pointe vers l'URL Vercel, pas de rebuild).
5. **Apple** (99 $/an) — quand le dossier est rodé (revue stricte).
6. **Samsung Tizen / Hisense VIDAA** — via **contrat partenaire** (pas de self-service hors USA) — piste B2B plus tard. **Roku** — seulement si réécriture native acceptée.

---

## 2. Procédure par store

### 🟢 Google Play (Android mobile/tablette + Android TV) — prio HAUTE
- **Compte** : développeur Google Play, **25 USD unique** (pas de frais annuel). Choisir **compte Organisation** (au nom de A.Onoseke) → **évite la règle des 12 testeurs / 14 jours** imposée aux comptes personnels post-13/11/2023. Peut exiger un **numéro D-U-N-S** (gratuit, Dun & Bradstreet, ~1-2 sem). Vérif identité (pièce + carte de crédit internationale au nom légal — **le vrai obstacle pratique en RDC = la carte de crédit acceptée**).
- **Packaging** : PWA → **TWA via Bubblewrap** (ou PWABuilder). Déposer `.well-known/assetlinks.json` (SHA-256 de la clé Play) sur Vercel. **Target API 35** obligatoire. Android TV : Capacitor + manifeste `LEANBACK_LAUNCHER`, navigation **D-pad**.
- **Contenu** : positionner en **« lecteur de playlist utilisateur »**. App livre 0 chaîne, screenshots = éditeur vide + démo libre.
- **Pièges** : logos de chaînes dans les captures = rejet ; bannière TV **1280×720 sans canal alpha** ; Data-safety cohérent ; tout élément non atteignable au D-pad = rejet TV quality.
- **Délai** : compte qqs h–2 j ; revue app qqs h–qqs j (renforcée pour IPTV).

### 🟢 LG webOS (Smart TV) — prio HAUTE
- **Compte** : LG **Seller Lounge** (seller.lgappstv.com), Individual ou **Corporate Seller** (A.Onoseke).
- **Packaging** : le plus simple = **HOSTED WEB APP** (officiellement supporté). Tu ne rebuild PAS : un mini « dummy app » local redirige vers ton **URL Vercel**.
- **Contenu** : modèle BYO-playlist **accepté** — précédent vivant « IPTV Stream Player » dont la fiche dit explicitement *« does not provide or include any content (channels) »*.
- **Pièges** : **Self-Checklist** obligatoire et complète (absente = **rejet auto** sans QA) ; navigation magic-remote/D-pad.
- **Délai** : QA 5–10 j ouvrés/cycle, prévoir 2–3 cycles.

### 🟢 Amazon Appstore + Fire TV — prio HAUTE
- **Compte** : Amazon Developer, **GRATUIT** (0 frais).
- **Packaging** : **wrap Android (APK)** via **Capacitor** (`npm i @capacitor/core @capacitor/android` → `npx cap init` → `npm run build` → `npx cap add android`). Télécommande Fire TV.
- **Contenu** : BYO-playlist accepté (précédents : IPTV Smarters Pro, Purple Player — lecteurs génériques sans flux fourni).
- **Pièges** : ⚠️ **anti-piratage ACE** (depuis oct. 2025, Amazon + 50 ayants droit) bloque activement les apps donnant accès à du contenu protégé — d'où l'importance du modèle 100 % neutre.
- **Délai** : ~1–3 j (souvent <48 h). Coûts récurrents : 0.

### 🟡 Apple App Store (iOS/iPadOS) + tvOS — prio MOYENNE
- **Compte** : Apple Developer Program **99 USD/an** (récurrent), org au nom de A.Onoseke (D-U-N-S requis).
- **Packaging** : **Capacitor (WKWebView)** → `npx cap add ios` → build Xcode.
- **Contenu** : BYO-playlist passe (précédents live : « IPTV Player Live: M3U & Xtream », iPlayTV — *« neither the app or developer provides content »*).
- **Pièges** : **Guideline 4.2** « minimum functionality » = plus gros risque pour un wrap web → ajouter de **vraies features natives** (favoris locaux, EPG, lecture hors-ligne d'historique, gestes…) pour ne pas être « juste un site web ». **5.2** contenu/droits quasi systématiquement examiné.
- **Délai** : ~24–48 h, mais plusieurs allers-retours pour une app IPTV.

### 🔴 Samsung Tizen — prio BASSE
- Web app native (`.wgt`, Tizen Studio). Signup **gratuit** MAIS **statut Public Seller = USA uniquement** → hors USA il faut un **contrat Partner** (négocié, montant non public). **C'est le mur, pas la technique.** → piste partenaire plus tard.

### 🔴 Hisense VIDAA (« V Home OS ») — prio BASSE (mais stratégique Afrique)
- Web HTML5 natif (idéal techniquement), mais **aucun self-service** : accès uniquement par **partenariat contractuel** (NDA), VIDAA pousse l'app. Hisense **très répandu en Afrique** → vaut une **candidature partenaire** en parallèle (jeu B2B), pas une soumission rapide.

### 🔴 Roku — prio BASSE
- **Pas de web app** : réécriture **native BrightScript/SceneGraph** obligatoire. Gratuit mais coût = développement natif. BYO-playlist viable (précédents lecteurs M3U) — à garder pour plus tard si réécriture justifiée.

---

## 3. Textes de fiche prêts (BYO-safe)

**Titre** : `AMBITY.A IPTV PLAYER` (≤30 car. — OK Google Play)

**Description courte (≤80 car.)** :
`Lecteur HLS/M3U. Importez VOTRE playlist. L'app ne fournit aucune chaîne.`

**Description longue (FR)** :
> AMBITY.A est un **lecteur multimédia** (HLS / M3U). L'application **ne fournit, n'héberge, n'indexe et ne recommande aucun contenu, chaîne ou flux** : vous importez **votre propre** liste de lecture (URL ou fichier M3U), exactement comme un lecteur de fichiers.
> Fonctions : import de playlist, lecture HLS, favoris, recherche, interface TV/mobile, multi-écrans.
> Vous êtes seul responsable de la légalité et des droits des flux que vous importez. L'éditeur ne contrôle ni ne fournit aucune source.

**Description longue (EN)** :
> AMBITY.A is a **media player** (HLS / M3U). The app **provides, hosts, indexes and recommends no content, channels or streams** — you import **your own** playlist (M3U URL or file), like any file player. You are solely responsible for the legality and rights of the streams you import. Neither the app nor the developer provides any source.

**Mots-clés** : `media player, m3u, hls, playlist player, video player` (PAS « IPTV channels », « live TV free », « sports », noms de bouquets).

---

## 4. Légal (à mettre à jour)

**`terms.html` §3 — remplacer tout aveu d'agrégation par** :
> L'application est un **lecteur**. Elle ne fournit, n'héberge, n'indexe ni ne distribue aucun contenu, chaîne ou flux. L'utilisateur importe sa propre liste de lecture et est seul responsable de sa légalité et des droits afférents. L'éditeur applique une procédure de retrait sur notification (DMCA / notice-and-takedown) pour toute réclamation d'ayant droit.

**`privacy.html`** : déjà conforme RGPD — **ajouter** une ligne : *« L'application ne collecte ni ne transmet le contenu des playlists importées. »* Et **déclarer** la collecte analytics/IP (`track_presence`) + présence de publicité (`ads.json`).

---

## 5. Assets requis (specs officielles)

- **Icône** : master 1024×1024 PNG → Google Play 512×512 PNG 32-bit alpha (≤1 Mo). **Aucun logo tiers.**
- **Feature graphic** Google Play : 1024×500 (JPEG/PNG 24-bit **sans** alpha).
- **Captures téléphone** : 2–8, ratio 16:9 ou 9:16 — **éditeur de playlist vide + flux démo libre uniquement**.
- **Android TV** : bannière **1280×720 JPEG/PNG 24-bit SANS alpha** (obligatoire) + ≥1 capture TV 16:9.
- **Classification** : questionnaire **IARC** (lecteur neutre = bas, ~3+).
- **Privacy URL** publique (déjà : `…/privacy.html`).
- **Data-safety** : déclarer IP/analytics + « contient des annonces ».

---

## 6. Checklist (cocher)

- [ ] Retirer `playlist.json`/`sites.json` du build livré (BYO réel)
- [ ] `public/manifest.webmanifest` + service worker + icônes 192/512
- [ ] Icône & captures **sans logo tiers** ; démo = flux libre de droits
- [ ] Réécrire `terms.html` §3 + descriptions store (textes §3 ci-dessus)
- [ ] Préparer assets (icône 512, feature 1024×500, bannière TV 1280×720, captures)
- [ ] Compte Google Play **Organisation** (25 $) + D-U-N-S
- [ ] Compte Amazon Developer (gratuit) + build Capacitor APK
- [ ] Microsoft Store via PWABuilder (gratuit) — rodage
- [ ] LG Seller Lounge + hosted web app + Self-Checklist
- [ ] (plus tard) Apple Developer 99 $ + features natives anti-4.2
- [ ] (B2B) candidatures partenaire Samsung / VIDAA

---

## 7. Risques (honnêteté)

- **Retraits 2026** : ~36 apps IPTV (XCIPTV, IPTV Smarters Pro, Televizo…) retirées de Google Play **et** iOS sur pression ayants droit. Même un BYO-playlist parfait peut être retiré **plus tard** si l'app se met à curer des sources, ou sur simple association au mot « IPTV ».
- **Mitigation** : rester un **lecteur 100 % neutre** (zéro source fournie), garder le mot « IPTV » au minimum, procédure de takedown active, ne jamais montrer de bouquet réel dans le marketing.
- **Carte de crédit RDC** : obstacle pratique n°1 pour ouvrir les comptes payants (Google/Apple) — prévoir une carte internationale au nom légal.
