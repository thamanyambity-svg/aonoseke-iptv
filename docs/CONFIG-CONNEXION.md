# Configuration de la connexion (Google, Facebook, téléphone)

Le code de l'application est prêt ; il reste à activer les fournisseurs **dans les consoles** (je n'y ai pas accès).
Projet Supabase : `aonoseke-iptv` (réf. `cvuhvppsdzrjtvrtvrlv`).

**URL de retour Supabase à copier chez Google et Facebook :**
`https://cvuhvppsdzrjtvrtvrlv.supabase.co/auth/v1/callback`

## 1. Supabase → Authentication → URL Configuration

- **Site URL** : l'adresse de production du site (Vercel).
- **Redirect URLs** (ajouter les 4) :
  - `https://<votre-site>.vercel.app/**`
  - `https://*-<votre-equipe>.vercel.app/**` (aperçus)
  - `http://localhost:5173/**` (développement)
  - `com.aonoseke.iptv://auth/callback` (**application Android**, obligatoire)

## 2. Google (Authentication → Providers → Google)

1. Google Cloud Console → APIs & Services → Credentials → _OAuth client ID_ de type **Web application**.
2. _Authorized redirect URIs_ : l'URL de retour Supabase ci-dessus.
3. Copier _Client ID_ et _Client secret_ dans Supabase, activer le fournisseur.
4. **OAuth consent screen → Publishing status : « In production »**. En mode _Testing_, seuls les « test users » peuvent se connecter (cause fréquente de « ça ne marche plus »).

## 3. Facebook (Authentication → Providers → Facebook)

1. developers.facebook.com → créer une app _Consumer_ + produit **Facebook Login**.
2. _Valid OAuth Redirect URIs_ : l'URL de retour Supabase. Permissions : `email`, `public_profile`.
3. Settings → Basic : _Privacy Policy URL_ = `https://<votre-site>/privacy.html`, _Terms_ = `/terms.html`, _Data Deletion_ (URL ou instructions).
4. Copier _App ID_ et _App Secret_ dans Supabase, activer.
5. **Passer l'app en mode « Live »** (en mode _Development_, seuls les administrateurs/testeurs peuvent se connecter).

## 4. Téléphone (Authentication → Providers → Phone)

1. Activer _Phone_ puis choisir un fournisseur SMS (Twilio / Twilio Verify, MessageBird, Vonage, TextLocal).
2. Vérifier que le fournisseur couvre vos pays (RDC `+243`, Congo `+242`, Côte d'Ivoire `+225`…) et le coût par SMS.
3. Alternative pour l'Afrique (Africa's Talking, WhatsApp…) : _Auth Hooks → Send SMS hook_ vers une Edge Function.

## Vérifier

- Web : « Continuer avec Google/Facebook » redirige vers le fournisseur puis revient connecté.
- Android : le navigateur s'ouvre, puis l'application se rouvre connectée (lien `com.aonoseke.iptv://auth/callback`).
- Téléphone : saisir le numéro → SMS reçu → code à 6 chiffres.
