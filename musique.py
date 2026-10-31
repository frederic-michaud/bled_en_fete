"""La musique, fabriquée par le programme : quatre ambiances, de la plus lugubre à la
fête. Elles ont le même tempo et la même longueur et tournent toutes en même temps,
en boucle ; on passe de l'une à l'autre en baissant doucement le volume de l'une et
en montant celui de la suivante (elles restent donc toujours en rythme)."""
import array
import math
import random

import pygame

TEMPO = 104
FONDU = 2.0                 # secondes pour passer d'une ambiance à l'autre
LUGUBRE, MYSTERE, GAI, FETE = range(4)

# Huit mesures de huit croches. Accords (notes MIDI) : la mineur, puis la majeur.
MINEUR = [(69, 72, 76), (69, 72, 76), (65, 69, 72), (65, 69, 72),
          (62, 65, 69), (62, 65, 69), (64, 68, 71), (64, 68, 71)]
MAJEUR = [(69, 73, 76), (69, 73, 76), (66, 69, 73), (66, 69, 73),
          (62, 66, 69), (62, 66, 69), (64, 68, 71), (64, 68, 71)]


def _arpege(accords, motifs, octave=0):
    """Une mélodie de croches : chaque motif donne, pour chaque croche, la note de
    l'accord à jouer (0, 1, 2 ; 3 = la première une octave plus haut ; None = silence)."""
    notes = []
    for k, accord in enumerate(accords):
        for i in motifs[k % len(motifs)]:
            notes.append((None if i is None else accord[i % 3] + 12 * (i // 3) + 12 * octave, 1))
    return notes


def _basse_sautee(accords, motif):
    """Une basse en croches : écarts (demi-tons) au-dessus de la fondamentale, None = silence."""
    notes = []
    for accord in accords:
        racine = accord[0] - 24
        notes += [(None if e is None else racine + e, 1) for e in motif]
    return notes


def ambiances():
    """Les quatre ambiances. Chacune : liste de voix (notes, timbre, volume, tenue) ;
    une note = (MIDI ou None, durée en croches) ; la batterie : (coup ou None, 1)."""
    racines_m = [(a[0] - 24, 8) for a in MINEUR]
    lugubre = [
        (racines_m, "orgue", 0.10, 0.98),
        ([(76, 4), (72, 4), (69, 6), (None, 2), (77, 4), (76, 2), (74, 2), (72, 6), (None, 2),
          (74, 4), (77, 4), (69, 2), (68, 2), (69, 2), (71, 2), (68, 4), (71, 4), (64, 6), (None, 2)],
         "triangle", 0.08, 0.95),
        ([(88, 2), (None, 14)] * 4, "cloche", 0.05, 1.0),
    ]
    mystere = [
        (_basse_sautee(MINEUR, (0, None, 7, None, 12, None, 7, None)), "triangle", 0.14, 0.5),
        (_arpege(MINEUR, [(2, None, 1, 0, None, 1, 2, 1), (0, 1, 2, 3, 2, None, 1, None)]),
         "carre", 0.022, 0.6),
        ([(88, 2), (None, 14)] * 4, "cloche", 0.035, 1.0),
    ]
    gai = [
        (_basse_sautee(MAJEUR, (0, 12, 7, 12, 0, 12, 7, 12)), "triangle", 0.12, 0.6),
        (_arpege(MAJEUR, [(0, 1, 2, 1, 3, 2, 1, 2), (3, None, 2, 1, 2, None, 0, None)]),
         "carre", 0.028, 0.7),
        ([(None, 1), ("h", 1)] * 32, "batterie", 0.05, 1.0),
    ]
    fete = [
        (_basse_sautee(MAJEUR, (0, 12, 7, 12, 0, 12, 7, 12)), "triangle", 0.12, 0.6),
        (_arpege(MAJEUR, [(0, 2, 1, 3, 2, 3, 1, 2), (3, 2, 3, 4, 3, 2, 1, 2)], octave=1),
         "carre", 0.024, 0.7),
        ([("k", 1), ("h", 1), ("s", 1), ("h", 1)] * 16, "batterie", 0.07, 1.0),
    ]
    return [lugubre, mystere, gai, fete]


def creer():
    """Fabrique les sons : une liste (par ambiance) de sons (un par voix)."""
    reglage = pygame.mixer.get_init()
    if not reglage:
        return []
    freq, _, canaux = reglage
    croche = int(freq * 60 / TEMPO / 2)
    silence = array.array("h", [0] * canaux)

    def onde(forme, u):
        if forme == "carre":
            return 1 if u < 0.5 else -1
        if forme == "triangle":
            return 4 * u - 1 if u < 0.5 else 3 - 4 * u
        # l'orgue : un son doux avec son octave et sa quinte
        a = math.tau * u
        return 0.6 * math.sin(a) + 0.3 * math.sin(2 * a) + 0.15 * math.sin(3 * a)

    def coup(genre, volume):
        """Un coup de batterie : grosse caisse, caisse claire ou charleston."""
        n = int(freq * (0.12 if genre == "k" else 0.07 if genre == "s" else 0.03))
        buf, phase = array.array("h"), 0.0
        for i in range(n):
            u = i / n
            if genre == "k":
                phase += (110 - 70 * u) / freq
                v = math.sin(math.tau * phase)
            else:
                v = random.uniform(-1, 1) * (0.7 if genre == "s" else 0.4)
            buf.extend([int(v * (1 - u) ** 2 * volume * 32767)] * canaux)
        return buf

    def voix(notes, forme, volume, tenue):
        buf = array.array("h")
        coups = {g: coup(g, volume) for g in "ksh"} if forme == "batterie" else {}
        for note, duree in notes:
            n = croche * duree
            if note is None:
                buf.extend(silence * n)
            elif forme == "batterie":
                son = coups[note][:n * canaux]
                buf.extend(son)
                buf.extend(silence * (n - len(son) // canaux))
            elif forme == "cloche":  # une note qui s'éteint doucement
                f = 440 * 2 ** ((note - 69) / 12)
                for i in range(n):
                    a = math.sin(math.tau * f * i / freq) * (1 - i / n) ** 3
                    buf.extend([int(a * volume * 32767)] * canaux)
            else:
                periode = max(2, round(freq / (440 * 2 ** ((note - 69) / 12))))
                cycle = array.array("h")
                for i in range(periode):  # une seule vague, recopiée ensuite
                    cycle.extend([int(onde(forme, i / periode) * volume * 32767)] * canaux)
                tours = int(n * tenue) // periode
                buf.extend(cycle * tours)
                buf.extend(silence * (n - tours * periode))
        return pygame.mixer.Sound(buffer=buf.tobytes())

    return [[voix(*v) for v in ambiance] for ambiance in ambiances()]


class Musique:
    """Toutes les ambiances jouent en même temps ; seule celle voulue s'entend."""

    def __init__(self):
        try:
            self.sons = creer()
        except pygame.error:
            self.sons = []
        self.active = True        # touche M
        self.volumes = [0.0] * len(self.sons)
        self.canaux = []
        if self.sons:
            n = sum(len(a) for a in self.sons)
            pygame.mixer.set_num_channels(n + 8)
            pygame.mixer.set_reserved(n)
            k = 0
            for ambiance in self.sons:
                canaux = []
                for son in ambiance:
                    canal = pygame.mixer.Channel(k)
                    canal.play(son, loops=-1)
                    canal.set_volume(0.0)
                    canaux.append(canal)
                    k += 1
                self.canaux.append(canaux)

    def maj(self, ambiance, dt):
        """Rapproche les volumes de l'ambiance voulue (None : silence)."""
        for i, canaux in enumerate(self.canaux):
            cible = 1.0 if (i == ambiance and self.active) else 0.0
            v = self.volumes[i] + max(-dt / FONDU, min(dt / FONDU, cible - self.volumes[i]))
            if v != self.volumes[i]:
                self.volumes[i] = v
                for canal in canaux:
                    canal.set_volume(v)


def ambiance_de(fete):
    """L'ambiance qui va avec une proportion de fête (de 0 à 1)."""
    if fete >= 1:
        return FETE
    return LUGUBRE if fete < 0.25 else MYSTERE if fete < 0.55 else GAI if fete < 0.9 else FETE
