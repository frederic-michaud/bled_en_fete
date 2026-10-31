"""Vérifications automatiques, sans écran ni son :  .venv/bin/python verifier.py

- chaque salle se charge et se dessine ;
- le corbeau est toujours attrapable : sous chaque décoration il y a un endroit d'où un
  saut touche le corbeau quand il s'y pose ;
- les règles de chaque créature marchent (couteau, deux sauts, bonbons…) ;
- à deux, personne ne sort de l'écran ; parent et enfant, la laisse ramène l'enfant ;
- on enchaîne tableau d'honneur, nom, Bled, voyage, salles, grande fête, tableau ;\n- une équipe reprend où elle en était ; une équipe qui a fini peut recommencer ;
- le jeu reste assez rapide (moins de 16 ms par image pour 60 images par seconde).
"""
import os
import sys
import tempfile
import time
from pathlib import Path

os.environ["SDL_VIDEODRIVER"] = "dummy"
os.environ["SDL_AUDIODRIVER"] = "dummy"

import manettes  # noqa: E402  (avant pygame)
import jeu  # noqa: E402
import palmares  # noqa: E402
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


def a_deux():
    p = pa.Partie(0, mode="duo")
    v1, v2 = p.vampires
    for _ in range(60 * 8):  # le joueur 1 file à droite, le joueur 2 ne bouge pas
        p.maj([presse(droite=True), C()])
    ecran = [v.x - p.camera for v in p.vampires]
    verifier(v1.x - v2.x <= pa.ECART_MAX + 1 and all(0 <= x <= jeu.L - v1.W for x in ecran),
             f"à deux : on ne peut pas laisser l'autre hors de l'écran (écart {v1.x - v2.x:.0f})")
    avant = v2.x
    for _ in range(60 * 3):
        p.maj([C(), presse(droite=True)])
    verifier(v2.x > avant + 400, "à deux : l'autre peut toujours avancer")

    p = pa.Partie(1, mode="parent")
    parent, enfant = p.vampires
    depart = enfant.x
    for _ in range(60 * 6):  # le parent part à droite, l'enfant reste (ou essaie de partir à gauche)
        p.maj([presse(droite=True), presse(gauche=True)])
    d = abs(parent.x - enfant.x)
    verifier(d < pa.LAISSE + 120 and enfant.x > depart + 50,
             f"parent et enfant : la laisse, élastique, traîne l'enfant (écart {d:.0f})")
    parent.x, parent.y = 30 * pa.T, 4 * pa.T  # le parent est tout là-haut : l'enfant s'envole
    parent.vy = 0
    for _ in range(60 * 3):
        p.maj([C(), C()])
    d = abs(parent.x - enfant.x) + abs(parent.y + parent.H - enfant.y - enfant.H)
    verifier(d < 60 and not enfant.vole, f"parent et enfant : l'enfant trop loin s'envole vers le parent ({d:.0f})")


def taper(j, noms):
    """Écrit les noms à la manette, sur le clavier de l'écran."""
    for nom in noms:
        for lettre in nom:
            ligne = next(i for i, l in enumerate(jeu.GRILLE) if lettre.upper() in l)
            col = jeu.GRILLE[ligne].index(lettre.upper())
            while j.curseur[0] != ligne:
                j.image(presse(bas=True))
                j.image(C())
            while j.curseur[1] != col:
                j.image(presse(droite=True))
                j.image(C())
            j.image(presse(saut=True))
            j.image(C())
        while j.curseur != [3, 1]:
            j.image(presse(bas=True) if j.curseur[0] != 3 else presse(droite=True))
            j.image(C())
        j.image(presse(saut=True))
        j.image(C())


def enchainement(mode, noms):
    j = jeu.Jeu()
    verifier(j.etat == "honneur", "au lancement : le tableau d'honneur")
    while jeu.MODES[j.choix[0]][0] != mode:
        j.image(presse(droite=True))
        j.image(C())
    j.image(presse(saut=True))  # « nouveau »
    verifier(j.etat == "nom", f"« {mode} » : nouvelle équipe, on écrit son nom")
    taper(j, noms)
    verifier(j.etat == "titre" and j.noms[:len(noms)] == noms, f"noms écrits, puis le Bled : {j.noms[:len(noms)]}")
    for _ in range(30):
        j.image(C())
    j.image(presse(droite=True))
    j.image(presse(gauche=True))
    verifier(j.niveau == 0, "le Bled : les salles pas encore atteintes sont fermées")
    j.image(presse(saut=True))
    for _ in range(200):
        j.image(C())
    verifier(j.etat == "jeu" and j.partie.i_niveau == 0 and len(j.partie.vampires) == len(noms),
             "voyage jusqu'à la salle 1, avec le bon nombre de personnages")
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
        if i == 1:  # en cours de partie, on revient au tableau : tout est gardé
            enregistre = palmares.lire()
            e = next(e for e in enregistre if e["mode"] == mode and e["noms"] == noms)
            verifier(e["ouvertes"] == 3 and not e["fini"], f"la progression est enregistrée : {e['ouvertes']} salles")
    e = j.equipe
    verifier(e["fini"] and e["meilleur"] and e["meilleur"] > 1, f"fini : meilleur temps {e['meilleur']}")
    j.image(presse(saut=True))
    j.image(C())
    verifier(j.etat == "honneur" and j.colonne()[j.choix[1] - 1] is e, "après la fête : le tableau, sur l'équipe")
    meilleur = e["meilleur"]
    j.image(presse(saut=True))
    verifier(j.etat == "confirmer", "une équipe qui a fini : on demande avant de recommencer")
    j.image(presse(saut=True))  # « non » est choisi d'abord
    verifier(j.etat == "honneur" and e["fini"], "« non » : rien ne change")
    j.image(presse(saut=True))
    j.image(presse(gauche=True))
    j.image(presse(saut=True))
    verifier(j.etat == "titre" and j.ouvertes == 1 and not j.salles and e["meilleur"] == meilleur,
             "« oui » : elle repart de la première salle et garde son meilleur temps")
    temps.sort()
    moyen, pire = sum(temps) / len(temps) * 1000, temps[int(len(temps) * 0.99)] * 1000
    verifier(pire < 16, f"vitesse : {moyen:.1f} ms par image en moyenne, {pire:.1f} ms au pire (99 %)")


def reprise():
    """Une équipe en cours de partie reprend avec exactement ses salles atteintes."""
    palmares.enregistrer([palmares.nouvelle("duo", ["Ana", "Bo"]) | {"ouvertes": 3, "chrono": 75.0}])
    j = jeu.Jeu()
    while jeu.MODES[j.choix[0]][0] != "duo":
        j.image(presse(droite=True))
    j.image(presse(bas=True))
    j.image(presse(saut=True))
    verifier(j.etat == "titre" and j.ouvertes == 3 and j.niveau == 2 and sorted(j.salles) == [0, 1]
             and j.chrono == 75.0, "reprise : salles 1 et 2 en fête, on choisit parmi les 3 atteintes")
    j.image(presse(pause=True))
    verifier(j.etat == "honneur", "le bouton de gauche ramène au tableau d'honneur")


if __name__ == "__main__":
    print("Le corbeau est-il toujours attrapable ?")
    corbeau_attrapable()
    print("Les règles des créatures")
    regles()
    print("À deux, parent et enfant")
    a_deux()
    palmares.FICHIER = Path(tempfile.mkdtemp()) / "palmares.json"  # pas le vrai tableau
    for mode, noms in (("solo", ["Lou"]), ("duo", ["Lea", "Tom"]), ("parent", ["Papa", "Zoe"])):
        print(f"Du tableau d'honneur à la grande fête ({mode})")
        enchainement(mode, noms)
    print("Reprendre une partie")
    reprise()
    print("\nTout va bien !" if not erreurs else f"\n{len(erreurs)} problème(s).")
    sys.exit(1 if erreurs else 0)
