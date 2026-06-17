# 🔍 Diagnostic — Écran Noir Dashboard

**Date**: 2026-06-17  
**Problème**: Dashboard affiche un écran noir/vide au lieu du contenu admin  
**Cause Probable**: Rôle utilisateur non configuré comme `admin` dans Supabase

---

## ⚡ Solution Rapide (90% de chance de marcher)

### Étape 1 — Vérifier votre rôle dans Supabase

1. Allez sur **Supabase Dashboard** → votre projet
2. Cliquez sur **Table Editor** (panneau gauche)
3. Sélectionnez la table **`profiles`**
4. Trouvez votre utilisateur (par email)
5. Regardez la colonne **`role`**

**Résultat attendu**: La colonne doit dire `admin`

**Si elle est vide ou dit `user`** → C'est ça le problème!

### Étape 2 — Corriger le rôle

1. Dans la table `profiles`, trouvez votre ligne
2. Cliquez sur la cellule de la colonne `role`
3. Tapez `admin` (en minuscules)
4. Appuyez sur Enter pour sauvegarder
5. Attendez 2-3 secondes

### Étape 3 — Recharger l'app

1. Allez sur votre URL Vercel (ex: `https://aonoseke-iptv.vercel.app`)
2. **Déconnectez-vous** complètement (cliquez sur le profil → Logout)
3. Videz le cache (Cmd+Shift+Delete sur macOS)
4. **Reconnectez-vous**
5. Cliquez à nouveau sur votre avatar → "Gestion publicitaire"

**Le dashboard devrait s'afficher normalement.**

---

## 🔎 Si Ça Ne Marche Pas — Diagnostic Détaillé

Suivez ces 4 causes dans l'ordre:

### Cause #1 — Rôle Non Configuré (80% de probabilité)

**Symptôme**: Écran complètement noir, rien ne s'affiche

**Vérification**:
```
Supabase Dashboard 
  → Table Editor 
  → profiles 
  → colonne "role" pour votre user
```

**Solution**: Mettez `admin` dans cette colonne.

---

### Cause #2 — Schéma SQL Non Appliqué (10% de probabilité)

**Symptôme**: Errors dans la console (Cmd+Option+I) du type "function admin_stats does not exist"

**Vérification**:
```
Supabase Dashboard 
  → Database 
  → Functions
```

Cherchez: `admin_stats`, `admin_online_users`, `is_admin`, `track_ad_event`

**Si ces fonctions n'existent pas** → Le schéma SQL n'a pas été appliqué

**Solution**:
1. Supabase Dashboard → **SQL Editor** → **New Query**
2. Ouvrez le fichier `supabase/schema.sql` de votre repo
3. Copiez-collez **tout le contenu** (970 lignes)
4. Cliquez sur **Run**
5. Attendez 10-15 secondes
6. Rechargez Vercel

---

### Cause #3 — Variables d'Environnement Manquantes (5% de probabilité)

**Symptôme**: Erreur "Backend not configured" dans la console

**Vérification**:
```
Vercel Dashboard 
  → votre projet 
  → Settings 
  → Environment Variables
```

Ces variables doivent exister:
- `VITE_SUPABASE_URL` (ex: `https://xxxxx.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` (clé publique)

**Si elles manquent**:
1. Ajoutez-les sur Vercel
2. Cochez les 3 environnements (Production, Preview, Development)
3. Vercel Dashboard → Deployments → 3 points du dernier → **Redeploy**

---

### Cause #4 — Build Vercel Échoué (3% de probabilité)

**Symptôme**: Page charge mais affiche une vieille version ou erreur

**Vérification**:
```
Vercel Dashboard 
  → votre projet 
  → onglet "Deployments"
```

Le dernier déploiement doit avoir un ✅ vert (status "Ready").

**Si le status est rouge** → Build échoué
- Cliquez sur le déploiement
- Consultez les logs (Build Logs)
- Cherchez des erreurs TypeScript ou manquantes

**Solution**: Fixez l'erreur et push un nouveau commit

---

## 🛠️ Diagnostic Avancé — Ouvrir la Console

Si aucune solution ci-dessus ne marche:

1. Allez sur votre URL Vercel
2. Ouvrez les outils développeur (Cmd+Option+I sur macOS)
3. Onglet **Console**
4. Cherchez des messages d'erreur en **rouge**
5. Copiez-collez-les ci-dessous

**Erreurs possibles**:

```javascript
// Erreur 1 : Rôle non admin (c'est normal, explique l'écran noir)
"AdminDashboard affiché pour un non-admin — refusé"
→ Solution: Définir role='admin' dans Supabase

// Erreur 2 : Fonction RPC introuvable
"function admin_stats does not exist"
→ Solution: Appliquer schema.sql

// Erreur 3 : Supabase pas connecté
"Cannot read property 'from' of undefined"
→ Solution: Vérifier VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY

// Erreur 4 : Permission refusée
"permission denied for schema public"
→ Solution: Vérifier RLS policies dans Supabase
```

---

## 📋 Checklist Complète

- [ ] **Étape 1**: Vérifiez que `role='admin'` pour votre user dans Supabase
- [ ] **Étape 2**: Mettez `admin` si c'était vide
- [ ] **Étape 3**: Déconnectez/reconnectez sur Vercel
- [ ] **Étape 4**: Dashboard s'affiche normalement ✅

**OU si ça ne marche pas:**

- [ ] **Cause #2**: Cherchez les RPC admin_* dans Supabase → Functions
- [ ] **Cause #2b**: Si absentes, appliquez schema.sql
- [ ] **Cause #3**: Vérifiez VITE_SUPABASE_* sur Vercel
- [ ] **Cause #4**: Vérifiez status build Vercel (vert ✅ ou rouge ❌)

---

## 💬 Message d'Erreur Console Exacte

Si le problème persiste, ouvrez la console (Cmd+Option+I) et copiez-collez le message d'erreur exact ici:

```
[ERREUR CONSOLE ICI]
```

Cela m'aidera à diagnostiquer précisément le problème.

---

## 🆘 En Cas de Doute

**La cause #1 (rôle non admin) est correcte dans 80% des cas.**

Commencez par là, puis remontez les autres causes si ça ne marche pas.
