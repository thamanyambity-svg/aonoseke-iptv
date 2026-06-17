# ⚡ Solution Rapide — Activer l'Accès Admin (5 min)

## Le Problème
Dashboard affiche un écran noir = vous n'êtes pas marqué `admin` dans Supabase

## La Solution en 3 Étapes

### 📍 Étape 1 — Ouvrir Supabase Table Editor

1. Allez sur: https://app.supabase.com/
2. Sélectionnez votre projet
3. Cliquez sur **Table Editor** (panneau gauche)
4. Cliquez sur la table **`profiles`**

**Vous devez voir une liste d'utilisateurs avec colonnes:**
```
id | email | username | role | age_range | geo | device | ...
```

### 🔍 Étape 2 — Trouver Votre Utilisateur

1. Scroll horizontal pour voir la colonne **`role`**
2. Trouvez votre email dans la liste
3. Regardez la valeur de la colonne `role`

**Résultat**:
- ✅ Si elle dit `admin` → Allez à l'Étape 3
- ❌ Si elle est vide ou dit `user` → Vous devez la modifier

### 📝 Étape 3 — Modifier le Rôle

Si votre rôle n'est pas `admin`:

1. Cliquez sur la cellule `role` de votre ligne
2. Une boîte d'édition apparaît
3. Effacez le contenu (s'il y a quelque chose)
4. Tapez: `admin`
5. Appuyez sur **Enter**
6. La cellule doit maintenant afficher `admin` (couleur grise)

**✅ Sauvegarde automatique** — pas besoin de cliquer sur un bouton save

### 🔄 Étape 4 — Recharger l'App

Maintenant que vous êtes admin dans la DB:

1. Allez sur votre app Vercel
2. **Rafraîchissez complètement**:
   - macOS: Cmd+Shift+R (vide le cache)
   - Windows: Ctrl+Shift+R
   - Ou Cmd+Option+I → Application → Clear site data
3. **Déconnectez-vous** complètement
4. **Reconnectez-vous** (formulaire de login)
5. Cliquez sur votre avatar → **Gestion publicitaire**

**✅ Le dashboard devrait s'afficher normalement!**

---

## 🆘 Si Ça Ne Marche Pas

### Vérification #1 — Console du navigateur

1. Ouvrez les outils dev: Cmd+Option+I (macOS) ou F12 (Windows)
2. Onglet **Console**
3. Cherchez des erreurs en ROUGE

**Messages possibles:**

```
❌ "AdminDashboard accès refusé"
→ Vous n'êtes toujours pas admin
→ Revenez à Supabase et re-vérifiez la colonne role

❌ "function admin_stats does not exist"
→ Schéma SQL non appliqué
→ Allez à https://[votre-projet].supabase.co/editor
→ New Query → Copiez supabase/schema.sql → Run

❌ "Cannot read property 'from' of undefined"
→ Supabase non configurée
→ Vercel → Settings → Vérifiez VITE_SUPABASE_* variables
```

### Vérification #2 — Confirmer dans Supabase

Allez sur Supabase → Table Editor → profiles → votre ligne:

```
Colonne `role` = "admin"  ← DOIT être admin
```

Si ce n'est pas `admin`, refaites l'Étape 3 ci-dessus.

### Vérification #3 — Forcer un Redeploy

Parfois Vercel a mis en cache une vieille version:

1. Vercel Dashboard → votre projet
2. Onglet **Deployments**
3. Cliquez sur les **3 points** du dernier déploiement
4. Sélectionnez **Redeploy**
5. Attendez ~2-3 min
6. Testez à nouveau

---

## ✅ Checklist

- [ ] Ouvert Supabase Table Editor
- [ ] Trouvé ma ligne dans la table `profiles`
- [ ] Colonne `role` = `admin`
- [ ] Rafraîchi l'app (Cmd+Shift+R)
- [ ] Déconnecté/reconnecté
- [ ] Cliqué sur "Gestion publicitaire"
- [ ] Dashboard s'affiche ✅

**Si tout est ✅, le problème est résolu!**

Si une des étapes ne marche pas, consultez le fichier `DIAGNOSTIC-ECRAN-NOIR.md` pour des solutions plus avancées.
