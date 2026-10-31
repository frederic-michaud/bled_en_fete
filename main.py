"""La version web : le navigateur lance ce fichier (avec pygbag). Le jeu est le même que
sur ordinateur ; la boucle rend juste la main au navigateur à chaque image."""
import asyncio

import pygame  # noqa: F401  (pygbag prépare pygame d'après les import de main.py)

import jeu


async def main():
    j = jeu.Jeu()
    while True:
        j.image()
        j.afficher()
        await asyncio.sleep(0)  # le navigateur affiche l'image et attend la suivante


asyncio.run(main())
