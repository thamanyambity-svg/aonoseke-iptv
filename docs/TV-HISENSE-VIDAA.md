# Aonoseke sur téléviseur Hisense (VIDAA) et Android TV

Votre téléviseur (firmware V02.09.61D, identifiant Netflix « HISETVN… ») fonctionne sous **VIDAA OS**, pas sous Android :
l'APK Android ne s'y installe pas. Sur VIDAA, les applications sont des **applications web hébergées** (le téléviseur charge
une adresse, il n'installe rien). L'application Aonoseke est justement une application web : la « version télé » est
donc **le même site, en mode TV**.

## Utiliser tout de suite (sans publication)

1. Ouvrir le **navigateur** du téléviseur (icône « Navigateur » / « Web »).
2. Aller sur `https://<adresse-de-production>/tv` (l'adresse Vercel de l'application, suivie de `/tv`) et l'ajouter aux favoris.
3. Le mode TV est alors mémorisé : interface agrandie, focus doré, navigation à la télécommande.

Télécommande : **flèches** = se déplacer · **OK** = lancer · **Retour** = revenir à l'accueil (annule aussi une pub en attente).

## Publier dans la boutique VIDAA (icône dans le menu d'accueil)

Condition : un compte développeur sur le portail VIDAA (validation par VIDAA, comme pour une fiche Play Store).

1. Créer le compte sur le portail développeur VIDAA et déclarer l'application (nom, icônes, captures 1920×1080).
2. Indiquer l'adresse hébergée `https://<adresse-de-production>/tv` comme point d'entrée.
3. Fournir les justificatifs demandés (éditeur, politique de confidentialité — déjà publiée, contenu légal).
4. Passer la certification VIDAA (tests de navigation à la télécommande, touche Retour, lecture vidéo).
   Les exigences exactes évoluent : à vérifier sur le portail au moment du dépôt.

## Ce qui est prêt dans le code

- `/tv` et `?tv=1` forcent le mode TV (mémorisé) ; il s'active aussi tout seul sur les navigateurs de TV reconnus.
- Navigation spatiale à la télécommande (accueil en rangées), touche Retour gérée (Échap, BrowserBack, codes 10009/461).
- Zone de sécurité (surbalayage) et textes agrandis pour la lecture à 3 m.

## À vérifier sur le téléviseur lui-même

Je n'ai pas pu tester sur un vrai Hisense : la lecture HLS (hls.js), les codes de la touche Retour et le rendu 1080p
doivent être confirmés sur l'appareil. Les flux `http://` (non https) sont bloqués par le navigateur du téléviseur comme sur le web.

## Android TV / box Android

L'application Android 1.0.5 est déjà déclarée compatible Android TV (écran d'accueil « Leanback ») : même APK.
