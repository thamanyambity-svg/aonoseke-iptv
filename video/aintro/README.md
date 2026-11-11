# Film d'intro du A (HyperFrames)

Sources du film joué à l'ouverture de l'application (`public/intro-a.mp4`). Projet [HyperFrames](https://hyperframes.heygen.com) :
du HTML + GSAP rendu en vidéo, image par image, donc identique à chaque rendu.

- `compositions/aintro.html` : le film (lettre A en rubans rouges, poussée 3D, rideau de lumière, ligne rouge finale).
- `index.html` : la composition racine (4,2 s, 1920×1080, 30 i/s) + la piste son.
- `assets/aintro.wav` : le son, généré par `make-sound.py` (original, aucun extrait extérieur).

## Modifier et prévisualiser

```bash
cd video/aintro
npx hyperframes@0.9.33 preview     # aperçu dans le navigateur
npx hyperframes@0.9.33 check       # vérifie la composition
```

## Produire le fichier de l'application

```bash
npx hyperframes@0.9.33 render -o /tmp/intro-a-1080.mp4 --quality delivery
ffmpeg -y -i /tmp/intro-a-1080.mp4 -vf "scale=1280:720:flags=lanczos" \
  -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -profile:v high -level 4.0 -movflags +faststart \
  -c:a aac -b:a 96k -ar 48000 ../../public/intro-a.mp4
```

Le film fait ~200 Ko en 720p. Si vous changez sa durée, mettez à jour `INTRO_FILM_SECONDS` dans `src/components/IntroSplash.tsx`.

## Couleur

Le A est rouge (`#e50914` → `#7a0408`). Pour une version or, remplacez les dégradés de `#aintro-legL`, `#aintro-legR`
et `#aintro-bar` dans `compositions/aintro.html`, puis refaites le rendu.

## Dessin et son

Le dessin de la lettre et le son sont originaux. Seule la mécanique du mouvement (lettre en rubans → colonne → rideau de lumière → ligne) s'inspire d'une intro de référence.
