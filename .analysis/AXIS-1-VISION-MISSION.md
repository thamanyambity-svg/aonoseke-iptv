# AXIS 1: Vision & Mission — Clarté du Projet

## Executive Summary

**Projet**: IPTV Web Player — lecteur de chaînes TV en direct via HLS/DASH  
**Raison d'être**: Canal d'acquisition (funnel haut) pour l'écosystème Aonoseke (plateforme import B2B RDC)  
**Audience cible**: Francophones & Diaspora africaine (RDC, Afrique, France)  
**Modèle de revenu**: Premium subscription (2.5k FC/mois) + publicités preroll/banners  

---

## 1. Clarté de la Valeur Proposition

### Énoncé officiel (README)
> "A professional, modern, and feature-rich **IPTV streaming player** built with React, TypeScript, and Vite. Watch live TV channels with favorites management, search capabilities, and offline support via PWA."

### Analyse
- ✅ **Clair et concis**: Positionne le lecteur comme outil de streaming légitime
- ✅ **Valeur articulée**: Gestion des favoris, recherche, offline PWA
- ⚠️ **Contexte écosystème absent du README**: N'explicite PAS que c'est un **funnel d'acquisition** pour import B2B
- ❌ **Risque de confusion produit**: Les utilisateurs peuvent croire que le player est un standalone, pas un catalyst

### Finding
**Le README met en avant les features du player mais cache sa vraie raison d'être : être un aimant à audience qualifiée pour la plateforme import.**

---

## 2. Alignement Vision & Réalité (Ecosystem Gap)

### Vision Document (PLAN-ECOSYSTEME-AONOSEKE.md)

**Objective global**:
```
Impressions pub (player)
   → Clics tracés (UTM)
      → Visites landing import
         → Inscriptions BUYER
            → Demandes d'import (PENDING)
               → Dépôts 60% (FUNDED)
                  → Commande livrée (CLOSED)
```

**North Star Metrics**:
- Leads (inscriptions BUYER via player): ~80–260/mois
- Demandes d'import qualifiées: ~30–90/mois
- Dépôts 60% financés: ~9–27/mois
- Revenu plateforme (commission ~10% × AOV 12k$): **~11k–32k $/mois**

### Réalité Observée

#### Gate 1: Tracking bout-en-bout ✅ IMPLÉMENTÉ (partiellement)
- [useAnalytics.ts](useAnalytics.ts): Event tracking `channel_view`, `ad_impression`, `ad_click`
- Schema Supabase: Table `view_events` avec indexation
- **MAIS**: Pas de tracking UTM clair vers la landing import; pas de lien intégré player → import

#### Gate 2: La plateforme convertit ? ❌ BLOQUANT
- **Problème**: Le player n'a PAS de lien direct vers la plateforme import
- Pas de CTA intégré pour passer du player à l'import
- Les annonces preroll/banners (PreRollAd.tsx, BannerAd.tsx) ne sont pas configurées pour rediriger vers l'import
- **Impact**: Une audience regardant du contenu n'a aucun pont vers l'offre B2B

#### Gate 3: Créas + Brief ❌ NON MENTIONNÉ
- Aucun artifact dans le codebase
- Pas de folder dédié aux materials marketing

#### Gate 4: Sécurité et conformité ✅ PARTIELLEMENT
- RLS (Row-Level Security) sur Supabase: ✅ Implémenté
- GDPR notice (privacy.html): ✅ Présent
- CSP headers: ⚠️ À vérifier

### Finding
**CRITIQUE**: Le player existe techniquement mais la chaîne de valeur vers le revenu B2B est **incomplète**. Le funnel s'arrête à "regarder du contenu", pas de conversion vers l'import platform.

---

## 3. Cohérence des Principes Directeurs

### Principes implicites (extraits du code et docs)

1. **Accessibilité**: WCAG 2.1 AA (déclaré dans README)
   - ✅ Keyboard navigation implemented (App.tsx: `useFocusedIdx`)
   - ⚠️ Pas de tests d'accessibilité automatisés

2. **Performance**: Virtual scrolling pour 2000+ chaînes
   - ✅ Implémenté (virtualScroll.ts)
   - ✅ Code-splitting HLS.js & React (vite.config.ts)
   - ⚠️ Bundle size non mesuré

3. **Sécurité**: XSS protection, CSP, input validation
   - ✅ URL validation (validation.ts: `isValidUrl()`, `sanitizeLogoUrl()`)
   - ✅ Error boundaries & safe error messages
   - ⚠️ CSP headers pas documentés; CORS strategy ad-hoc

4. **Francophonie**: Localisation FR, pays francophones
   - ✅ i18n pour pays africains (COUNTRY_NAMES en App.tsx)
   - ✅ Scripts ciblant sources FR (build-fr.mjs, build-noyau.mjs)
   - ✅ Currency: CDF (Franc Congolais) pour pricing (Paywall.tsx)

### Finding
**Les principes sont cohérents mais partiellement implémentés. Absence de stratégie documentée pour la priorité des principes (ex: sécurité vs. vitesse?)**

---

## 4. Public Visé & Besoins Compatibles

### Segments identifiés

| Segment | Pays | Besoin primaire | État app |
|---------|------|---|---|
| **TV Lover** | RDC, Afrique | Regarder contenu FR/international sans paywall | ✅ Couvert |
| **Mobile-first** | RDC (Mobile Money) | Micropayment (2.5k FC) pour déverrouiller premium | ✅ Flutterwave intégré |
| **Import Buyer** | RDC, diaspora | Découvrir des sources d'import verifiées → déposer demande | ⚠️ **Pas implémenté** |
| **Admin/Opérateur** | Équipe | Dashboard de stats (users, engagement, geo) | ⚠️ Rudimentaire |
| **Annonceur** | Brands africaines | Placer pubs preroll/banners ciblées par pays | ⚠️ Pas de self-service |

### Compatibilité des besoins
- ✅ TV Lover & Mobile-first: Besoins alignés (même UX, même devise)
- ⚠️ Import Buyer: Segmenté différent (B2B vs. B2C), pas d'UX commune

### Finding
**Segmentation valide mais incomplète. L'Import Buyer (clé du funnel) n'a pas d'UX dédiée.**

---

## 5. Avantage Compétitif & Barrières

### Promesses vs. Concurrence (Kodi, IPTV Extreme, etc.)

| Aspect | IPTV Web Player | Concurrence |
|--------|---|---|
| **Plateforme** | Web (PWA) → multidevice | Desktop (Kodi) ou app fermée |
| **Géo-focus** | Francophonie/Afrique | Généraliste mondial |
| **Modèle** | Freemium + import link | Publicité ou piratage pur |
| **Conformité** | GDPR, RLS, légal | Souvent illégal ou ambigu |

### Barrières à défendre
1. **Sources fiables**: Scripts de vérification (build-fr.mjs, verify-cors.mjs)
   - ✅ Vérifie CORS + HLS playability
   - ❌ Vulnérable aux changements d'URL sources (hotlinks cassent)
2. **UX/Design**: Glassmorphism, dark theme moderne
   - ✅ Différenciant cosmétique
   - ❌ Pas d'UX research documenatée
3. **Import funnel lock-in**
   - ❌ **Pas encore implémenté**

### Finding
**Position concurrentielle moyennes. Avantage principal = intégration à l'écosystème import, mais cette intégration est incompète.**

---

## 6. Évaluation de l'Alignement Vision ↔ Réalité

### Grille d'évaluation (1-5 scale)

| Dimension | Score | Justification |
|-----------|-------|---|
| **Clarté de la raison d'être** | 3 | Vision écosystème claire en interne (PLAN doc), mais cachée au public (README) |
| **Priorisation utilisateurs** | 2 | Multiple personas mais aucun primairement ciblé (TV Lover = default) |
| **Implémentation des principes** | 3 | Sécurité/perf/accessibilité articulés mais tests/validation incomplets |
| **Cohérence stratégique** | 2 | **CRITIQUE**: La chaîne de valeur vers import est cassée. Player ≠ import bridge |
| **Écosystème integration readiness** | 1 | **BLOQUANT**: Aucun lien player → import platform. Peut tourner standalone forever. |

---

## Recommandations (Axis 1)

### Immédiat (semaines 1-2)
1. ✏️ Documenter explicitement dans [README.md](README.md) le rôle du player comme **funnel d'acquisition**
2. 🔗 Ajouter une section "Écosystème Aonoseke" expliquant le lien player → import
3. 🎯 Définir les **3 personas prioritaires** (ex: TV Lover primaire, Import Buyer secondaire)

### Court terme (mois 1)
1. 🔗 **Intégrer un CTA "Importer des produits"** dans le player (menu, popup, ou contextuel après sessions)
2. 📊 Connecter le tracking player → Supabase avec UTM params (pour mesurer conversion)
3. 🎨 Créer une "landing d'import light" accessible depuis le player

### Moyen terme (mois 2-3)
1. 📈 Mettre en place le **funnel tracking complet**: player impressions → import signups → demandes → dépôts
2. 🛂 Tester avec un groupe de 50-100 utilisateurs le "Import Buyer journey" du player
3. 📊 Mesurer la conversion réelle vs. objectif North Star (cibles du PLAN doc)

---

## Conclusion Axis 1

**État**: **2/5 — Faible** (Clarté OK en interne, mais intégration écosystème incomplète)

**Enjeu principal**: Le player est un excellent **aimant à audience**, mais le pont vers la **monétisation** (import funnel) n'existe pas encore. Il fonctionne comme standalone, pas comme catalyseur du modèle de revenu.

**Action clé**: Faire du player un **portail d'acquisition explicite** pour l'import platform, pas un produit autonome.

---

*Fin Axis 1 — Prêt pour Axis 2: Technical Health*
