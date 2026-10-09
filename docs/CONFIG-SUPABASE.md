# Supabase — pages où intervenir

Projet : **aonoseke-iptv** (réf. `cvuhvppsdzrjtvrtvrlv`). Tableau de bord : https://supabase.com/dashboard/project/cvuhvppsdzrjtvrtvrlv

| #   | Page Supabase                             | Pour quoi                                                                             |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | **Authentication → URL Configuration**    | Autoriser les retours de connexion (site + appli Android)                             |
| 2   | **Authentication → Providers → Google**   | Connexion Google                                                                      |
| 3   | **Authentication → Providers → Facebook** | Connexion Facebook                                                                    |
| 4   | **Authentication → Providers → Phone**    | Connexion par SMS                                                                     |
| 5   | **Storage → ad-media**                    | Images des publicités                                                                 |
| 6   | **SQL Editor**                            | Créer les campagnes Alpha Import (fichier `supabase/seed-alpha-import-campaigns.sql`) |
| 7   | **Table Editor → profiles**               | Vous donner le rôle `admin` (accès « Gestion publicitaire »)                          |

Détail des pages 1 à 4 : voir `docs/CONFIG-CONNEXION.md`.

## 5. Storage → ad-media (images des pubs)

1. Menu de gauche **Storage** → bucket **ad-media** (il doit être _Public_ ; sinon `⋯` → _Edit bucket_ → cocher _Public bucket_).
2. **Create folder** → nom : `sectors`.
3. Ouvrir `sectors` → **Upload files** → sélectionner les **42 fichiers** du dossier `public/ads/sectors/` du dépôt (`*-preroll.jpg`, `*-portrait.jpg` et `*-banner.jpg`).
4. Contrôle : cliquer sur un fichier → **Get URL** doit donner `…/storage/v1/object/public/ad-media/sectors/sourcing-preroll.jpg` et s'afficher dans le navigateur.

## 6. SQL Editor (campagnes)

1. Menu **SQL Editor** → **New query**.
2. Coller tout le contenu de `supabase/seed-alpha-import-campaigns.sql` → **Run**.
3. Résultat attendu : le tableau final affiche **28 lignes** (14 prerolls + 14 bannières), statut `active`.
4. Relancer le script ne crée pas de doublons.
5. Dès qu'il y a des campagnes actives en base, **l'application les utilise à la place du fichier `ads.json`** (qui reste le secours si la base est vide ou injoignable).

## 7. Table Editor → profiles (rôle admin)

1. **Table Editor** → table **profiles** → trouver votre ligne (votre email).
2. Colonne **role** → saisir `admin` → Entrée.
3. Dans l'application : se déconnecter puis se reconnecter → avatar → **Gestion publicitaire** pour modifier/ajouter des campagnes, téléverser des images et voir impressions/clics.

## Sécurité

- Ne collez jamais de clé `service_role` dans l'application ni dans un chat.
- Activer **Authentication → Policies → Leaked password protection**.
