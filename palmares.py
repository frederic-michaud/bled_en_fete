"""Le tableau d'honneur : tous ceux qui ont mis tout le Bled en fête, avec leur
temps total (le temps passé dans les salles, sans les pauses ni les voyages)."""
import json
import time
from pathlib import Path

FICHIER = Path(__file__).with_name("palmares.json")


def lire():
    try:
        return json.loads(FICHIER.read_text())
    except (OSError, ValueError):
        return []


def ajouter(noms, mode, temps):
    """Enregistre une réussite et la renvoie."""
    entree = {"noms": noms, "mode": mode, "temps": round(temps, 1),
              "date": time.strftime("%Y-%m-%d")}
    liste = lire() + [entree]
    try:
        FICHIER.write_text(json.dumps(liste, indent=1, ensure_ascii=False))
    except OSError:
        pass
    return entree


def classement(mode):
    """Les réussites d'une façon de jouer, la plus rapide d'abord."""
    return sorted((e for e in lire() if e["mode"] == mode), key=lambda e: e["temps"])


def duree(secondes):
    m, s = divmod(int(secondes), 60)
    return f"{m} min {s:02d} s" if m else f"{s} s"
