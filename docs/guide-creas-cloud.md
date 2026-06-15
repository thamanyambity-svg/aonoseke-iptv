# Guide créas cloud — Alpha Import Exchange

Voie « cloud guidée ». Je ne peux pas créer de compte ni payer à ta place → tu exécutes les étapes avec **tes** comptes, tu me renvoies les fichiers, je les branche dans le player.

**Charte à respecter partout :** fond sombre `#0d0a04`, or signature `#c9a84c`, ton premium/rassurant, pas de « prix cassés ».

---

## A. Images photoréalistes — Ideogram (recommandé)

Pourquoi Ideogram : meilleur rendu, et bon avec le texte. **Astuce pro :** fais générer la **photo de fond** seulement, et laisse-moi superposer le texte de marque en SVG (accents FR parfaits, charte exacte).

**Étapes**
1. [ideogram.ai](https://ideogram.ai) → connexion (ton compte).
2. Aspect ratio **16:9**, style **Realistic**.
3. Colle un prompt ci-dessous → génère → télécharge le **PNG**.
4. Dépose le PNG dans `public/ads/` (ou envoie-le-moi) → je le branche dans `ads.json` + j'ajoute l'habillage texte.

**Prompts prêts à coller**
- *Port / conteneurs (hero)* :
  `Wide cinematic photograph of a modern container port at golden hour, stacked shipping containers, harbor cranes, a cargo ship departing, warm gold rim light, deep black sky, premium corporate mood, large empty dark area on the left for text overlay, color palette black and gold, photorealistic, 16:9`
- *Confiance / poignée de main* :
  `Cinematic close-up of two business people shaking hands over a desk with import documents and a world map, warm gold lighting, dark premium background, shallow depth of field, trust and partnership mood, copy space on the right, photorealistic, 16:9`
- *Carte / corridor commercial* :
  `Elegant dark world map with glowing gold trade routes connecting Kinshasa to China, Dubai, Turkey, Thailand and Japan, glowing gold nodes, premium fintech aesthetic, black background, subtle, 16:9`

---

## B. Vidéo — spot 6–15 s (Veo 3 ou Runway)

> ⚠️ **Important** : le pré-roll du player affiche aujourd'hui une **image** uniquement. Pour diffuser une **vidéo** dans le player, j'ajoute une branche `<video>` au composant `PreRollAd` (petit changement, je le fais quand tu as le clip). En attendant, la vidéo te sert pour réseaux sociaux / landing.

**Étapes**
1. [Google Veo](https://gemini.google.com) (Veo 3) ou [Runway](https://runwayml.com) (Gen-4) → ton compte.
2. Format **16:9**, durée 8–12 s.
3. Colle le prompt → génère → télécharge le **MP4**.

**Prompt vidéo (copier-coller)**
`Cinematic 10-second ad: aerial shot gliding over a container port at golden hour, gold light, then a smooth transition to a glowing world map with gold routes from Kinshasa to Asia and the Middle East. Premium, trustworthy, corporate. Dark and gold palette. No text.`

**Script du spot (12 s) — pour la voix off / le montage**
| t | Visuel | Texte à l'écran / VO |
|---|--------|----------------------|
| 0–3 s | Port, conteneurs, lumière or | « Importer depuis la Chine, Dubaï, la Turquie… » |
| 3–7 s | Carte + routes or depuis Kinshasa | « …sans les risques de la distance. » |
| 7–10 s | Logo + mention 60/40 | « Paiement sécurisé 60/40. Partenaires certifiés. » |
| 10–12 s | Carton final or + URL | **Alpha Import Exchange** · aonosekehouseinvestmentdrc.site |

---

## C. Intégration dans le player
- **Image** : `public/ads/<nom>.png` → je mets le chemin dans `ads.json` (`image`) + habillage texte SVG.
- **Vidéo** : je passe `PreRollAd` en mode vidéo (ajout d'un champ `video` dans `ads.json`) — sur ta demande, quand le MP4 est prêt.
