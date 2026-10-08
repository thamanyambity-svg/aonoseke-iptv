# Rapport — correctifs du lecteur et nouvelles sources (8 oct. 2026)

## Correctifs (branche `claude/vibrant-planck-e0fosj`)

| #   | Problème                                                               | Correction                                                   | Preuve                                                      |
| --- | ---------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| 1   | Fausse erreur 5 s après une coupure réseau, chaîne masquée 24 h à tort | Minuteur annulé dès que la lecture reprend (`Player.tsx`)    | Test de non-régression : échoue avant, passe après          |
| 2   | Le flux pouvait redémarrer à chaque rendu du parent                    | `onError` lu via une ref, l'effet HLS ne dépend que de `url` | Idem                                                        |
| 3   | La liste des chaînes se refermait à chaque clic sur ordinateur         | Liste ancrée à partir de 1100 px, tiroir conservé sur mobile | Test navigateur : desktop = zapping direct, mobile = tiroir |

## Sources ajoutées

- Origine : index public iptv-org (flux diffusés publiquement par leurs éditeurs).
- Filtres : chaînes fermées, NSFW ou sur liste de blocage exclues ; flux exigeant un en-tête spécial exclus ; HTTPS uniquement ; flux marqués « geo-blocked » exclus.
- Contrôles : manifeste → variante → premier segment, **deux passages espacés** ; CORS ouvert pour la lecture dans un navigateur ; piste vidéo présente.
- Entonnoir : 10 546 flux HTTPS candidats → 1 224 testés (Afrique + info internationale) → 794 lisibles dans un navigateur → 128 retenus après curation → 120 après le 2e passage → 8 flux `http` retirés (bloqués en HTTPS).

## Résultat

- Playlist : 226 → **335 chaînes**, 52 pays.
- Afrique : 16 → **91 chaînes dans 31 pays** (RDC : 1, Congo-Brazzaville : 2).
- Info internationale : 45 chaînes (France 24, Euronews, Al Jazeera, DW, Africanews, NHK World, TRT World, CGTN, etc.).
- Tests : 67/67 passent. Fichiers `.m3u` régénérés (335 chaînes).

## Limites connues

- La lecture vidéo réelle n'a pas pu être vérifiée dans le navigateur de test (pas de décodeur H.264) : à confirmer sur vos appareils.
- Les sources gratuites publiques sont peu nombreuses pour la RDC : un accord direct avec des chaînes congolaises serait plus fiable que n'importe quel index.
- Les flux libres changent : prévoir le test hebdomadaire (`node scripts/verify-channels.mjs --prune --dedupe`).
