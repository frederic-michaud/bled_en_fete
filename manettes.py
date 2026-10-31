"""Lecture des manettes (et du clavier en secours), pour un ou deux joueurs.
Seul, toutes les manettes branchées pilotent le joueur ; à deux, la manette 1 est au
joueur 1 et la manette 2 au joueur 2."""
import json
import os
from pathlib import Path

# Sans ça, macOS cache à SDL les manettes HID génériques (ex. Logitech Precision).
os.environ.setdefault("SDL_JOYSTICK_MFI", "0")
os.environ.setdefault("SDL_JOYSTICK_ALLOW_BACKGROUND_EVENTS", "1")
os.environ.setdefault("PYGAME_HIDE_SUPPORT_PROMPT", "1")

import pygame  # noqa: E402

# Les actions, nommées comme dans « Les Deux Amis ». Dans ce jeu, chacune est un bouton
# du losange : saut = bas, action = droite (bonbon), coucou = haut (couteau), pause = gauche.
ACTIONS = ("gauche", "droite", "haut", "bas", "saut", "action", "coucou", "pause")
FICHIER = Path(__file__).with_name("manettes.json")

# Le clavier marche toujours, en plus des manettes. À deux, chacun sa moitié du clavier.
CLAVIER_DUO = (
    {"gauche": (pygame.K_LEFT,), "droite": (pygame.K_RIGHT,), "haut": (), "bas": (pygame.K_DOWN,),
     "saut": (pygame.K_UP, pygame.K_RSHIFT), "action": (pygame.K_p,),
     "coucou": (pygame.K_o,), "pause": ()},
    {"gauche": (pygame.K_q, pygame.K_a), "droite": (pygame.K_d,), "haut": (), "bas": (pygame.K_s,),
     "saut": (pygame.K_z, pygame.K_w, pygame.K_SPACE), "action": (pygame.K_e,),
     "coucou": (pygame.K_x,), "pause": ()},
)
CLAVIER = {a: CLAVIER_DUO[0][a] + CLAVIER_DUO[1][a] for a in ACTIONS}
NOM_CLAVIER = "Clavier : flèches, espace, P, O"
NOMS_CLAVIER_DUO = ("clavier : flèches, P, O", "clavier : Z Q S D, espace, E, X")


class Commande:
    """État des commandes du joueur pour une image."""

    def __init__(self):
        for a in ACTIONS:
            setattr(self, a, False)
            setattr(self, a + "_presse", False)


def liaisons_par_defaut(joy):
    """Réglages devinés d'après la forme de la manette. Une liaison est
    ["b", bouton], ["h", croix, composante, signe] ou ["a", axe, signe, repos]."""
    n = joy.get_numbuttons()
    gauche, droite, haut, bas = [], [], [], []
    if joy.get_numaxes() > 0:
        gauche.append(["a", 0, -1, 0.0])
        droite.append(["a", 0, 1, 0.0])
    if joy.get_numaxes() > 1:
        haut.append(["a", 1, -1, 0.0])
        bas.append(["a", 1, 1, 0.0])
    for h in range(joy.get_numhats()):
        gauche.append(["h", h, 0, -1])
        droite.append(["h", h, 0, 1])
        haut.append(["h", h, 1, 1])
        bas.append(["h", h, 1, -1])
    if n >= 15 and joy.get_numhats() == 0:
        # Disposition « manette standard » de SDL : croix sur les boutons 12/13/14,
        # boutons 0 = bas, 1 = droite, 2 = gauche, 3 = haut, Start = 6.
        gauche.append(["b", 13])
        droite.append(["b", 14])
        haut.append(["b", 11])
        bas.append(["b", 12])
        saut, action, coucou, pause = [0], [1], [3], [2, 6]
    else:
        # Manette Logitech à 4 boutons en losange : 1 = gauche, 2 = bas, 3 = droite, 4 = haut.
        saut, action, coucou, pause = [1], [2], [3], [0, 8, 9]
    boutons = {"saut": saut, "action": action, "coucou": coucou, "pause": pause}
    resultat = {"gauche": gauche, "droite": droite, "haut": haut, "bas": bas}
    for nom, liste in boutons.items():
        resultat[nom] = [["b", i] for i in liste if i < n]
    return resultat


DIRECTIONS = ("gauche", "droite", "haut", "bas")


def fusionner(defaut, regle):
    """Les réglages enregistrés (touche C) remplacent ceux devinés, sauf pour se déplacer :
    la croix ET le joystick marchent toujours tous les deux."""
    liaisons = {**defaut, **regle}
    for a in DIRECTIONS:
        enregistre = regle.get(a, [])
        liaisons[a] = enregistre + [l for l in defaut.get(a, []) if l not in enregistre]
    return liaisons


def liaison_active(joy, l):
    try:
        if l[0] == "b":
            return bool(joy.get_button(l[1]))
        if l[0] == "h":
            return joy.get_hat(l[1])[l[2]] == l[3]
        return (joy.get_axis(l[1]) - l[3]) * l[2] > 0.5
    except (pygame.error, IndexError):
        return False


def instantane(joy):
    return ([joy.get_button(i) for i in range(joy.get_numbuttons())],
            [joy.get_hat(i) for i in range(joy.get_numhats())],
            [joy.get_axis(i) for i in range(joy.get_numaxes())])


def detecter(joy, repos, exclues=()):
    """Première liaison actionnée par rapport à l'état de repos (boutons d'abord)."""
    boutons, croix, axes = instantane(joy)
    trouvees = [["b", i] for i, v in enumerate(boutons) if v]
    for i, (hx, hy) in enumerate(croix):
        if hx:
            trouvees.append(["h", i, 0, hx])
        if hy:
            trouvees.append(["h", i, 1, hy])
    for i, v in enumerate(axes):
        d = v - repos[2][i]
        if abs(d) > 0.6:
            trouvees.append(["a", i, 1 if d > 0 else -1, round(repos[2][i], 2)])
    for l in trouvees:
        if l not in exclues:
            return l
    return None


def au_repos(joy, reference):
    boutons, croix, axes = instantane(joy)
    return (not any(boutons) and all(h == (0, 0) for h in croix)
            and all(abs(a - b) < 0.05 for a, b in zip(axes, reference[2])))


class Entrees:
    def __init__(self):
        pygame.joystick.init()
        try:
            self.config = json.loads(FICHIER.read_text())
        except (OSError, ValueError):
            self.config = {}
        self.joys = []
        self.precedent = [dict.fromkeys(ACTIONS, False) for _ in range(2)]
        self.rescanner()

    def rescanner(self):
        self.joys = [pygame.joystick.Joystick(i) for i in range(pygame.joystick.get_count())]
        self.liaisons = [fusionner(liaisons_par_defaut(j), self.config.get(j.get_guid(), {}))
                         for j in self.joys]

    def nom(self, joueur=None):
        """Les manettes (seul), ou ce qui pilote ce joueur (à deux)."""
        if joueur is None:
            return ", ".join(j.get_name() for j in self.joys) or NOM_CLAVIER
        if joueur < len(self.joys):
            return self.joys[joueur].get_name()
        return NOMS_CLAVIER_DUO[joueur]

    def enregistrer(self, i, liaisons):
        self.config[self.joys[i].get_guid()] = liaisons
        self.liaisons[i] = fusionner(liaisons_par_defaut(self.joys[i]), liaisons)
        FICHIER.write_text(json.dumps(self.config, indent=1))

    def lire(self, joueurs=1, clavier=True):
        """Une Commande par joueur (clavier=False : les manettes seulement, pendant
        qu'on tape son nom au clavier)."""
        touches = pygame.key.get_pressed()
        resultat = []
        for i in range(joueurs):
            if joueurs == 1:
                touches_, manettes = CLAVIER, list(zip(self.joys, self.liaisons))
            else:
                touches_, manettes = CLAVIER_DUO[i], list(zip(self.joys, self.liaisons))[i:i + 1]
            c = Commande()
            for a in ACTIONS:
                actif = (clavier and any(touches[k] for k in touches_[a])) or any(
                    liaison_active(joy, l) for joy, liaisons in manettes for l in liaisons.get(a, ()))
                setattr(c, a, actif)
                setattr(c, a + "_presse", actif and not self.precedent[i][a])
                self.precedent[i][a] = actif
            resultat.append(c)
        return resultat


def ensemble(commandes):
    """Une Commande où chaque bouton est appuyé si un des joueurs l'appuie (pour les menus)."""
    c = Commande()
    for a in ACTIONS:
        for nom in (a, a + "_presse"):
            setattr(c, nom, any(getattr(x, nom) for x in commandes))
    return c
