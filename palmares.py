"""Le tableau d'honneur : tous les joueurs (seuls, à deux, parent et enfant), où ils en
sont et leur meilleur temps. Chaque équipe : {"mode", "noms", "ouvertes" (salles
atteintes, de 1 à 4), "fini" (le Bled entier est en fête), "chrono" (le temps passé
dans les salles depuis qu'ils ont commencé, sans les pauses ni les voyages),
"meilleur" (le meilleur temps, ou None)}. Pas de mot de passe : on choisit son nom."""
import json
from pathlib import Path

FICHIER = Path(__file__).with_name("palmares.json")


def lire():
    try:
        donnees = json.loads(FICHIER.read_text())
    except (OSError, ValueError):
        return []
    if isinstance(donnees, list):  # l'ancien tableau : seulement des réussites
        equipes = {}
        for r in donnees:
            cle = (r["mode"], tuple(r["noms"]))
            if cle not in equipes or r["temps"] < equipes[cle]["meilleur"]:
                equipes[cle] = nouvelle(r["mode"], r["noms"], fini=True, meilleur=r["temps"])
        return list(equipes.values())
    return donnees.get("equipes", [])


def enregistrer(equipes):
    try:
        FICHIER.write_text(json.dumps({"equipes": equipes}, indent=1, ensure_ascii=False))
    except OSError:
        pass


def nouvelle(mode, noms, fini=False, meilleur=None):
    return {"mode": mode, "noms": list(noms), "ouvertes": 4 if fini else 1, "fini": fini,
            "chrono": 0.0, "meilleur": meilleur}


def classement(equipes, mode):
    """Les équipes d'une façon de jouer : d'abord celles qui ont un temps (la plus rapide
    d'abord), puis les autres (les plus avancées d'abord)."""
    return sorted((e for e in equipes if e["mode"] == mode),
                  key=lambda e: (e["meilleur"] is None, e["meilleur"] or 0, -e["ouvertes"]))


def duree(secondes):
    m, s = divmod(int(secondes), 60)
    return f"{m} min {s:02d} s" if m else f"{s} s"
