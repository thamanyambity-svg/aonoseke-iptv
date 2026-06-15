# Plan Écosystème Aonoseke — du Player IPTV à Alpha Import Exchange

> Document de cadrage. Sert aussi de **brief** à transmettre aux agents Com & Marketing.
> Règle d'or fixée : **on ne déploie rien tant que les objectifs (gate ci-dessous) ne sont pas atteints.**

---

## 1. La thèse — pourquoi les deux projets ne font qu'un

| Projet | Rôle dans l'écosystème | Tech |
|---|---|---|
| **IPTV Web Player** (`Desktop/iptv-web-player`) | **Canal d'acquisition** : audience gratuite, francophone & Afrique / diaspora. Haut de l'entonnoir. | React + Vite, Supabase, Flutterwave |
| **Alpha Import Exchange B2B** (`Downloads/Orchids-alpha-import-master`) | **Moteur de revenus** : facilitation d'import B2B RDC (Chine, Dubaï, Turquie, Thaïlande, Japon), modèle 60/40, partenaires certifiés. | Next.js 15, Supabase, Stripe, Resend, n8n |

Le player **n'est pas une fin en soi** : c'est l'aimant à audience qui alimente la plateforme import. L'objectif global n'est pas « les chaînes jouent » — c'est **« le player génère des demandes d'import qualifiées et des dépôts, de façon mesurable »**.

Domaine cible : `https://aonosekehouseinvestmentdrc.site`

---

## 2. L'entonnoir (funnel) & les KPIs

```
Impressions pub (player)
   → Clics tracés (UTM)
      → Visites landing import
         → Inscriptions BUYER
            → Demandes d'import (PENDING)
               → Dépôt 60% (FUNDED)
                  → Commande livrée (CLOSED)
```

**North Star :** nombre de demandes qualifiées + montant des dépôts 60% / mois **attribuables au player**.

| Étape | Métrique | Cible (run-rate de sortie M12 — plancher · base · stretch) |
|---|---|---|
| Inscriptions BUYER (leads) | comptes via player/spots | ~80 · 145 · 260 /mois |
| Demandes d'import | requests `PENDING` attribuées | ~30 · 50 · 90 /mois |
| Dépôts 60% (commandes financées) | `FUNDED` (Stripe) | **~9 · 15 · 27 /mois** |
| Revenu plateforme | commission ~10 % × AOV 12 k$ | **~11 k · 18 k · 32 k $/mois** |

---

## 3. Définition de « objectifs atteints » = porte de déploiement (GATE)

On déploie **uniquement quand les 4 sont vrais** :

1. **Tracking bout-en-bout opérationnel** — un clic sur une pub du player est traçable jusqu'à une inscription/demande côté import.
2. **La plateforme convertit** — un visiteur froid venu du player peut comprendre l'offre, s'inscrire, et déposer une 1re demande sans friction.
3. **Créas + brief prêts** — ≥ 3 spots finalisés et un one-pager exécutable par les agents marketing.
4. **Dashboard funnel** — un chiffre hebdo unique : leads & dépôts attribuables au player.

Tant qu'une seule case est rouge → **pas de prod**.

---

## 4. Phases 0 → 5

### Phase 0 — Cadrage & objectifs ✅ *verrouillée (2026-06-15)*
- **Objectif (fourchette plancher → stretch)** : run-rate de sortie M12 = **~9 → ~15 → ~27 commandes financées/mois** (~75 k / 120 k / 215 k $ de revenu an 1). AOV 12 k$ marchandise, commission ~10 % → ~1 200 $/commande.
- **Marchés** : RDC locale **+** diaspora. **Analytics** : Supabase. **Budget** : ~40 k$ an 1 (base) ; tranche stretch ≤ ~65 k$ débloquée seulement si CAC pilote prouvé (≤ ~400 $/commande).
- **Ramp** : M1–3 pilote (prouver funnel+attribution) → M4–6 ramp → M7–12 scale.
- **DoD :** ✅ tableau KPI validé.

### Phase 1 — Tracking & attribution *(le trou actuel)*
- Ajouter des **UTM** à chaque URL de `ads.json` (`utm_source=iptv-player`, `utm_medium=preroll|banner`, `utm_campaign`, `utm_content=<id>`).
- **Deep-link** vers la bonne page au lieu de l'accueil nu : « Découvrir » → `/how-it-works`, « Commencer » → `/register`, bannière → accueil.
- Capturer l'UTM côté import (analytics + champ `source` sur l'inscription/la demande).
- **DoD :** un clic pub → une ligne identifiable dans l'analytics import.
- **Responsable :** Moi.

### Phase 2 — Conversion-readiness d'Alpha Import Exchange
- Vérifier que les pages publiques de l'entonnoir convertissent : accueil, `/how-it-works`, `/countries`, `/register`.
- Capture de lead pour visiteurs « pas prêts » (email / WhatsApp +243).
- Éléments de confiance : RCCM, mentions légales, partenaires par pays, explication 60/40.
- Smoke-test du parcours Stripe (dépôt 60%).
- **DoD :** un visiteur froid s'inscrit et soumet une 1re demande.
- **Responsable :** Moi (technique) + toi (faits partenaires/légaux).

### Phase 3 — Créas & spots *(instructions aux agents Com & Marketing)*
- Inventaire publicitaire : scripts pré-roll (5–12 s), bannière, + spots sociaux.
- **Brief one-pager** (section 5) que les agents exécutent sans revenir poser de questions.
- Canaux : in-player (fait) + WhatsApp, Facebook, TikTok, (radio Kinshasa ?).
- **DoD :** chaque agent reçoit une fiche par spot et produit l'asset seul.
- **Responsable :** Moi (brief) → agents (production) → toi (validation).

### Phase 4 — Instrumentation & dashboard
- Player : le dashboard admin (déjà existant) affiche les clics UTM / funnel.
- Import : reporting admin existant + attribution `source` sur les demandes.
- **DoD :** un chiffre hebdo : leads & dépôts attribuables au player.
- **Responsable :** Moi.

### Phase 5 — Gate & go-live
- Vérifier les 4 cases de la section 3.
- Déployer player + plateforme, lancer la campagne, monitorer.
- **Responsable :** Moi (déploiement) sur ton GO explicite.

---

## 5. Brief réutilisable — agents Com & Marketing

**Produit promu :** Alpha Import Exchange — facilitation d'import B2B sécurisée pour la RDC.
**Promesse :** « Importez depuis la Chine, Dubaï, la Turquie, la Thaïlande et le Japon — sans les risques de la distance. Paiement 60/40, partenaires certifiés, traçabilité totale. »

- **Personas :** importateurs/commerçants RDC (Kinshasa), PME cherchant du sourcing, diaspora congolaise investissant au pays.
- **Ton :** souverain, premium, rassurant (confiance > hype). Or sur fond sombre.
- **Langues :** Français (principal). Option Lingala pour le social local.
- **CTA par spot :** « Découvrir la plateforme » / « Comment ça marche » / « Commencer maintenant ».
- **Destinations produit :** Chine · Dubaï · Turquie · Thaïlande · Japon.
- **Mentions légales obligatoires :** A.Onoseke House Investment RDC · RCCM CD/KNM/RCCM/21-A-01949 · Av. Haut Congo n°13, Ngaliema, Kinshasa · contact@aonosekehouseinvestmentdrc.site · +243 999 894 788.
- **Charte :** emblème A, dégradés or/noir (voir `public/ads/`), pas de promesses de prix, pas de délais garantis non validés.
- **KPI par spot :** CTR ≥ 2–5 %, puis inscriptions et demandes attribuées (UTM `utm_content`).

---

## 6. Ce qu'il me faut de toi pour verrouiller la Phase 0

1. **Objectif chiffré** : combien de demandes d'import / mois (et/ou € de dépôts) vise-t-on, et sous quel délai ?
2. **Budget marketing** (même approximatif) pour les spots payants.
3. **Marché prioritaire** : RDC locale, diaspora, ou les deux ?
4. **Analytics import** : tu veux que je branche le tracking sur l'outil déjà en place (Supabase) ou un autre (Plausible/GA) ?

> En attendant tes réponses, je peux exécuter **la Phase 1 (tracking + deep-links)** dès maintenant : c'est sans risque, réversible, et c'est précisément le trou que tu as pointé.
