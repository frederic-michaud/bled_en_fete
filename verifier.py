"""Vérifications automatiques, sans écran ni son :  .venv/bin/python verifier.py

- chaque salle se charge et se dessine ;
- le corbeau est toujours attrapable : sous chaque décoration il y a un endroit d'où un
  saut touche le corbeau quand il s'y pose ;
- les règles de chaque créature marchent (couteau, deux sauts, bonbons…) ;
- on enchaîne accueil, voyage, salles et grande fête finale ;
- le jeu reste assez rapide (moins de 16 ms par image pour 60 images par seconde).
"""
import os
import sys
import time

os.environ["SDL_VIDEODRIVER"] = "dummy"
os.environ["SDL_AUDIODRIVER"] = "dummy"

import manettes  # noqa: E402  (avant pygame)
import jeu  # noqa: E402
import partie as pa  # noqa: E402
from niveaux import NIVEAUX, RANGS  # noqa: E402
from outils import T  # noqa: E402

C = manettes.Commande
erreurs = []


def verifier(condition, message):
    print(("  ok    " if condition else "  ERREUR ") + message)
    if not condition:
        erreurs.append(message)


def presse(**boutons):
    c = C()
    for nom in boutons:
        setattr(c, nom, True)
        setattr(c, nom + "_presse", True)
    return c


def corbeau_attrapable():
    saut = pa.SAUT ** 2 / (2 * pa.GRAVITE)
    for i, niv in enumerate(NIVEAUX):
        p = pa.Partie(i)
        surfaces = [(c * T, (c + 1) * T, r * T) for r in range(pa.PLAFOND, RANGS)
                    for c in range(p.cols) if p.grille[r][c] in "#-" and p.grille[r - 1][c] != "#"]
        perdus = []
        for ch in p.choses:
            ch.transformer()
            bas = max(pa.CORBEAU_PERCHE, ch.y - ch.h / 2 - 14) + 22
            if not any(g - 40 <= ch.x <= d + 40 and haut - p.vampire.H - saut <= bas
                       for g, d, haut in surfaces):
                perdus.append((ch.genre, int(ch.x // T), int(ch.y // T)))
        verifier(not perdus, f"salle {i + 1} « {niv['nom']} » : corbeau attrapable partout {perdus or ''}")


def regles():
    def tomber_sur(p, ch):
        v = p.vampire
        v.x, v.y, v.vy, v.au_sol = ch.x - v.W / 2, ch.rect().top - v.H - 30, 300, False
        for _ in range(20):
            p.maj(C())

    p = pa.Partie(0)
    s = next(ch for ch in p.choses if ch.genre == "s")
    tomber_sur(p, s)
    verifier(s.tas > 0 and not s.fetee, "squelette : un saut le fait tomber en tas d'os")
    tomber_sur(p, s)
    verifier(s.fetee, "squelette : le deuxième saut le transforme")

    p = pa.Partie(0)
    c = next(ch for ch in p.choses if ch.genre == "c")
    tomber_sur(p, c)
    verifier(not c.fetee, "courge : sauter dessus ne fait rien")
    v = p.vampire
    v.x, v.y = c.x - 50 - v.W / 2, c.y + c.h / 2 - v.H
    for _ in range(5):
        p.maj(C())
    p.maj(presse(coucou=True))
    for _ in range(60):
        p.maj(C())
    verifier(c.fetee, "courge : le couteau (bouton du haut) en fait de la soupe")

    p = pa.Partie(0)
    f = next(ch for ch in p.choses if ch.genre == "f")
    tomber_sur(p, f)
    verifier(not f.fetee, "fantôme : sauter dessus ne marche pas")
    v = p.vampire
    v.x, v.y, v.dir = f.x - 200, f.y - 26, 1
    p.lancer_bonbon()
    for _ in range(90):
        p.maj(C())
    verifier(f.fetee, "fantôme : un bonbon lancé le transforme")

    p = pa.Partie(2)
    deco = p.choses[0]
    deco.transformer()
    p.corbeau = cb = pa.Corbeau(p, deco)
    for _ in range(60 * 12):
        p.maj(C())
    verifier(not deco.fetee and p.corbeau is cb, "corbeau : il défait les décorations et reste")
    v = p.vampire
    for k in range(40):  # on saute dessus par en dessous
        v.x, v.y, v.vy, v.au_sol = cb.x - v.W / 2, cb.y + 40 - 4 * k, -300, False
        p.maj(C())
        if cb.fetee:
            break
    verifier(cb.fetee, "corbeau : le toucher (même par en dessous) le chasse")


def enchainement():
    j = jeu.Jeu()
    for _ in range(200):
        j.image(C())
    j.image(presse(droite=True))
    j.image(presse(gauche=True))
    verifier(j.niveau == 0, "accueil : les salles pas encore atteintes sont fermées")
    j.image(presse(saut=True))
    for _ in range(200):
        j.image(C())
    verifier(j.etat == "jeu" and j.partie.i_niveau == 0, "accueil puis voyage jusqu'à la salle 1")
    temps = []
    for i in range(len(NIVEAUX)):
        for _ in range(30):
            t = time.perf_counter()
            j.image(C())
            temps.append(time.perf_counter() - t)
        for ch in j.partie.choses:
            ch.transformer()
        for _ in range(200):
            t = time.perf_counter()
            j.image(C())
            temps.append(time.perf_counter() - t)
        j.image(presse(saut=True))
        for _ in range(300):
            t = time.perf_counter()
            j.image(C())
            temps.append(time.perf_counter() - t)
        attendu = ("jeu", i + 1) if i + 1 < len(NIVEAUX) else ("fin", None)
        obtenu = (j.etat, j.partie.i_niveau if j.etat == "jeu" else None)
        verifier(obtenu == attendu, f"salle {i + 1} finie : on arrive à {attendu}")
    verifier(j.ouvertes == len(NIVEAUX), "toutes les salles finies : on peut toutes les choisir")
    temps.sort()
    moyen, pire = sum(temps) / len(temps) * 1000, temps[int(len(temps) * 0.99)] * 1000
    verifier(pire < 16, f"vitesse : {moyen:.1f} ms par image en moyenne, {pire:.1f} ms au pire (99 %)")


if __name__ == "__main__":
    print("Le corbeau est-il toujours attrapable ?")
    corbeau_attrapable()
    print("Les règles des créatures")
    regles()
    print("De l'accueil à la grande fête")
    enchainement()
    print("\nTout va bien !" if not erreurs else f"\n{len(erreurs)} problème(s).")
    sys.exit(1 if erreurs else 0)
