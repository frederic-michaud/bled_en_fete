"""Les bruitages, fabriqués par le programme (pas de fichiers son)."""
import array
import math
import random

import pygame


def creer_sons():
    """Les bruitages, par nom (vide s'il n'y a pas de son)."""
    try:
        if not pygame.mixer.get_init():
            pygame.mixer.init()
        freq, _, canaux = pygame.mixer.get_init()
    except pygame.error:
        return {}

    def ton(notes, volume=0.09):
        buf, phase = array.array("h"), 0.0
        for f0, f1, duree in notes:
            n = int(freq * duree)
            for i in range(n):
                u = i / n
                phase += (f0 + (f1 - f0) * u) / freq
                v = int((1 if phase % 1 < 0.5 else -1) * (1 - u) ** 0.5 * volume * 32767)
                buf.extend([v] * canaux)
        return pygame.mixer.Sound(buffer=buf.tobytes())

    def fusee():
        """Le sifflement doux d'une fusée qui monte (un souffle qui glisse vers l'aigu)."""
        n, buf, phase, y = int(freq * 0.8), array.array("h"), 0.0, 0.0
        for i in range(n):
            u = i / n
            phase += (700 + 900 * u) / freq
            y += 0.3 * (random.uniform(-1, 1) - y)
            v = (0.5 * math.sin(math.tau * phase) + 0.5 * y) * math.sin(math.pi * u) ** 2
            buf.extend([int(v * 0.035 * 32767)] * canaux)
        return pygame.mixer.Sound(buffer=buf.tobytes())

    def detonation():
        """La détonation : un claquement, un grondement sourd, puis un crépitement."""
        n, buf = int(freq * 1.6), array.array("h")
        grave = clair = etincelle = 0.0
        for i in range(n):
            u = i / n
            x = random.uniform(-1, 1)
            grave += 0.04 * (x - grave)               # le bruit, très adouci : un grondement
            clair += 0.5 * (x - clair)
            if u > 0.15 and random.random() < 0.0025 * (1 - u):
                etincelle = 1.0                        # une étincelle qui crépite
            etincelle *= 0.993
            v = (3.2 * grave * (1 - u) ** 3 + clair * max(0.0, 1 - i / (freq * 0.06))
                 + 0.5 * x * etincelle)
            buf.extend([int(max(-1.0, min(1.0, v * 0.5)) * 32767)] * canaux)
        return pygame.mixer.Sound(buffer=buf.tobytes())

    return {
        "fusee": fusee(),
        "detonation": detonation(),
        "saut": ton([(380, 620, 0.11)]),
        "clic": ton([(300, 300, 0.05), (450, 450, 0.09)]),
        "magie": ton([(660, 660, 0.06), (830, 830, 0.06), (990, 990, 0.06), (1320, 1320, 0.14)]),
        "sort": ton([(900, 1600, 0.10)], 0.05),
        "bouh": ton([(330, 160, 0.30)]),
        "croa": ton([(720, 480, 0.12), (660, 400, 0.18)], 0.08),
        "bonbon": ton([(880, 1320, 0.08)]),
        "vide": ton([(200, 150, 0.12)]),
        "crac": ton([(320, 110, 0.18)]),
        "couteau": ton([(1500, 2600, 0.07)], 0.05),
        "tchac": ton([(600, 180, 0.07)]),
        "bravo": ton([(523, 523, 0.12), (659, 659, 0.12), (784, 784, 0.12),
                      (1047, 1047, 0.35)]),
    }
