"""La version web : le navigateur lance ce fichier (avec pygbag). Le jeu est le même que
sur ordinateur ; la boucle rend juste la main au navigateur à chaque image."""
import asyncio
import time

import pygame  # noqa: F401  (pygbag prépare pygame d'après les import de main.py)

import jeu


async def main():
    j = jeu.Jeu()
    n, debut, calcul = 0, time.perf_counter(), 0.0
    avant = time.perf_counter()
    while True:
        t = time.perf_counter()
        j.avancer(t - avant)  # selon le temps réel : le jeu ne ralentit pas si ça rame
        avant = t
        j.afficher()
        calcul += time.perf_counter() - t
        n += 1
        if time.perf_counter() - debut > 3:  # toutes les 3 s, dans la console du navigateur
            duree = time.perf_counter() - debut
            mesure = f"{n / duree:.0f} images/s, {calcul / n * 1000:.1f} ms de calcul par image ({j.etat})"
            try:
                import platform
                platform.window.console.log(mesure)
            except Exception:
                print(mesure)
            n, debut, calcul = 0, time.perf_counter(), 0.0
        await asyncio.sleep(0)  # le navigateur affiche l'image et attend la suivante


asyncio.run(main())
