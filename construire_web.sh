#!/bin/zsh
# Fabrique la version web (dans un navigateur, avec pygbag) dans site/build/web :
# index.html et l'archive du jeu. On ne copie que les fichiers du jeu.
cd "$(dirname "$0")"
rm -rf site && mkdir -p site/bled_en_fete
cp animations.py decors.py dehors.py jeu.py main.py manettes.py musique.py niveaux.py \
   outils.py palmares.py partie.py sons.py site/bled_en_fete/
# chaque image aussi en PNG, au cas où le navigateur ne saurait pas lire les SVG
mkdir -p site/bled_en_fete/images
JEU_ZOOM=1 SDL_VIDEODRIVER=dummy .venv/bin/python - <<'FIN'
import pygame, manettes, outils, animations
pygame.init()
for nom, (_, n, _) in animations.ANIMES.items():
    for k in range(n):
        pygame.image.save(outils.image(f"{nom}@{k}"), f"site/bled_en_fete/images/{nom}@{k}.png")
FIN
.venv/bin/python -m pygbag --build --title "Halloween au Bled" site/bled_en_fete
