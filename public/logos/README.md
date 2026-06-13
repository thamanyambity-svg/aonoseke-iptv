# Logos de marque (annuaire)

Dépose ici les vrais logos des plateformes, au format **PNG transparent**,
nommés par l'**id** du site (voir `public/sites.json`).

Exemples :
- `pluto-tv.png`
- `tubi.png`
- `france-tv.png`
- `crunchyroll.png`

Recommandations :
- carré, ~128×128 px, fond transparent
- logo centré avec une petite marge

## Activer un logo

1. Dépose le PNG : `public/logos/pluto-tv.png`
2. Ajoute son **id** dans `public/logos/manifest.json` :
   ```json
   ["pluto-tv", "tubi", "france-tv"]
   ```

Seuls les ids listés dans le manifest chargent leur PNG (évite tout flash).
Si un id n'y est pas, l'app affiche un **monogramme coloré** (initiale) —
donc aucun logo manquant ne casse l'affichage.
