"""Le château vu de dehors : l'accueil (le vampire arrive au château) et le voyage
d'une salle à l'autre (on recule jusqu'à la fenêtre de la salle, le vampire vole vers
la suivante, on plonge dedans)."""
import math
import random

import pygame

from outils import (H, L, OR, ORANGE, VIOLET, ZOOM, _z, anime, degrade, dessin,
                    melange, poser)

# --------------------------------------------------------------------------
# Le château vu de dehors : l'accueil, et le voyage d'une salle à l'autre
# --------------------------------------------------------------------------

# La fenêtre de chaque salle dans le château (une par salle de NIVEAUX).
FENETRES = [pygame.Rect(420, 440, 190, 110), pygame.Rect(670, 440, 190, 110),
            pygame.Rect(440, 300, 400, 110), pygame.Rect(590, 150, 100, 130)]
ARRIVEE = (290, 560)                 # où le vampire se pose sur la colline, à l'accueil
SORTIE, VOL, ENTREE = 1.2, 1.8, 1.2   # durées du voyage : on recule, il vole, on plonge


def bezier(a, b, u, hauteur=130):
    """Un point du vol en arc de a vers b (u de 0 à 1)."""
    cx, cy = (a[0] + b[0]) / 2, min(a[1], b[1]) - hauteur
    return ((1 - u) ** 2 * a[0] + 2 * (1 - u) * u * cx + u * u * b[0],
            (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * cy + u * u * b[1])


def doux(u):
    u = max(0.0, min(1.0, u))
    return u * u * (3 - 2 * u)


def zoomer(e, apercu, depart, arrivee, u):
    """Dessine l'écran d'une salle (apercu) dans un rectangle qui glisse de depart à
    arrivee : de tout l'écran à la fenêtre de la salle, ou l'inverse."""
    u = doux(u)
    r = [a + (b - a) * u for a, b in zip(depart, arrivee)]
    zone = pygame.Rect(_z(r[0]), _z(r[1]), max(1, _z(r[2])), max(1, _z(r[3])))
    w, h = apercu.get_size()
    k = max(zone.w / w, zone.h / h)  # l'image couvre tout le rectangle
    im = pygame.transform.scale(apercu, (max(1, round(w * k)), max(1, round(h * k))))
    e.set_clip(zone)
    e.blit(im, im.get_rect(center=zone.center))
    e.set_clip(None)


def vignette(source, r, sombre):
    """L'image d'une salle (source : tout l'écran) réduite pour remplir la fenêtre r ;
    assombrie si la salle n'est pas encore en fête."""
    w, h = _z(r.w), _z(r.h)
    k = max(w / source.get_width(), h / source.get_height())
    im = pygame.transform.smoothscale(source, (round(source.get_width() * k), round(source.get_height() * k)))
    v = pygame.Surface((w, h))
    v.blit(im, ((w - im.get_width()) // 2, (h - im.get_height()) // 2))
    if sombre:
        v.fill((100, 90, 140), special_flags=pygame.BLEND_RGB_MULT)
    return v


class Dehors:
    """Le château dans la nuit, sur sa colline. Dans chaque fenêtre, un aperçu de la
    salle : assombri tant qu'elle fait peur, en fête une fois finie. Tant que le château
    est lugubre, il y a des éclairs et des chauves-souris."""

    PIERRE, CLAIR, OMBRE, JOINT = (56, 50, 74), (76, 70, 98), (36, 32, 50), (44, 40, 60)
    TOIT, TOIT_OMBRE = (46, 32, 68), (32, 22, 50)
    PETITES = [(360, 300), (360, 410), (900, 300), (900, 410), (604, 92), (656, 92)]
    BANNIERES = [(345, 470), (895, 470)]
    TORCHES = [(596, 500), (684, 500)]

    def __init__(self):
        self.fond = degrade((L, H), (10, 6, 26), (56, 24, 50))
        dessin.circle(self.fond, (44, 34, 62), (1060, 130), 80)
        dessin.circle(self.fond, (236, 230, 200), (1060, 130), 58)
        dessin.circle(self.fond, (218, 212, 184), (1044, 116), 9)  # des cratères
        dessin.circle(self.fond, (218, 212, 184), (1078, 150), 6)
        des = random.Random(7)
        self.etoiles = [(des.uniform(0, L), des.uniform(0, 430), des.uniform(0.6, 1.7)) for _ in range(80)]
        self.devant = pygame.Surface((L * ZOOM, H * ZOOM), pygame.SRCALPHA)
        self.dessiner_chateau(self.devant)

    # ---- ce qui ne bouge pas : la colline et le château, dessinés une fois ----

    def briques(self, s, x, y, w, h):
        for k, yy in enumerate(range(int(y) + 14, int(y + h), 14)):
            dessin.line(s, self.JOINT, (x, yy), (x + w, yy), 1)
            for xx in range(int(x) + (14 if k % 2 else 0), int(x + w), 28):
                dessin.line(s, self.JOINT, (xx, yy), (xx, min(yy + 14, y + h)), 1)

    def creneaux(self, s, x, y, w):
        for xx in range(int(x), int(x + w), 32):
            dessin.rect(s, self.PIERRE, (xx, y - 18, 18, 18))
            dessin.line(s, self.CLAIR, (xx, y - 18), (xx + 18, y - 18), 2)

    def tour(self, s, x, y, w, h, sommet):
        dessin.rect(s, self.PIERRE, (x, y, w, h))
        dessin.rect(s, self.OMBRE, (x + w * 0.72, y, w * 0.28, h))  # le côté à l'ombre
        self.briques(s, x, y, w, h)
        dessin.rect(s, self.CLAIR, (x - 8, y - 6, w + 16, 12))      # la corniche
        for cx in range(int(x - 6), int(x + w + 6), 12):
            dessin.rect(s, self.OMBRE, (cx, y + 6, 6, 6))
        base, milieu = y - 4, x + w / 2
        dessin.polygon(s, self.TOIT, [(x - 14, base), (milieu, sommet), (x + w + 14, base)])
        dessin.polygon(s, self.TOIT_OMBRE, [(milieu, sommet), (x + w + 14, base), (milieu, base)])
        for k in range(1, 7):  # les rangées de tuiles
            u = k / 7
            yy, demi = base - (base - sommet) * u, (w / 2 + 14) * (1 - u)
            dessin.line(s, (28, 20, 44), (milieu - demi, yy), (milieu + demi, yy), 2)
        dessin.line(s, (40, 30, 60), (milieu, sommet), (milieu, sommet - 26), 2)  # le mât

    def dessiner_chateau(self, s):
        nuit = (22, 16, 30)
        dessin.polygon(s, nuit, [(0, H), (0, 600), (200, 572), (380, 556), (900, 556), (1080, 570),
                                 (L, 600), (L, H)])
        for x, y, sens in ((140, 594, 1), (1150, 600, -1)):  # deux arbres morts
            dessin.line(s, nuit, (x, y), (x, y - 110), 8)
            for h, l in ((-60, 50), (-85, 38), (-100, 26)):
                dessin.line(s, nuit, (x, y + h), (x + sens * l, y + h - 30), 4)
                dessin.line(s, nuit, (x, y + h + 12), (x - sens * l * 0.7, y + h - 14), 3)
        bas = 580                                            # les murs s'enfoncent dans la colline
        for x in (230, 960):  # les remparts, derrière
            dessin.rect(s, self.OMBRE, (x, 420, 100, bas - 420))
            self.briques(s, x, 420, 100, bas - 420)
            for xx in range(x, x + 100, 26):
                dessin.rect(s, self.OMBRE, (xx, 404, 14, 16))
        self.tour(s, 560, 120, 160, 200, 20)                 # le donjon
        self.tour(s, 722, 176, 28, 110, 128)                 # sa tourelle
        dessin.rect(s, self.PIERRE, (400, 280, 480, bas - 280))  # le corps du château
        dessin.rect(s, self.OMBRE, (800, 280, 80, bas - 280))
        self.briques(s, 400, 280, 480, bas - 280)
        self.creneaux(s, 400, 280, 480)
        dessin.line(s, self.CLAIR, (400, 425), (880, 425), 3)  # un bandeau de pierre
        self.tour(s, 330, 230, 80, bas - 230, 120)           # les deux grandes tours
        self.tour(s, 870, 230, 80, bas - 230, 120)
        for i, r in enumerate(FENETRES):                     # linteaux et appuis des fenêtres
            dessin.rect(s, self.CLAIR, (r.x - 10, r.y - 14, r.w + 20, 10), border_radius=3)
            dessin.rect(s, self.CLAIR, (r.x - 6, r.bottom + 3, r.w + 12, 6), border_radius=2)
        for x, y in self.PETITES:                            # cadres des petites fenêtres
            dessin.rect(s, self.CLAIR, (x - 4, y - 4, 28, 38), 2, border_radius=10)
        dessin.rect(s, self.CLAIR, (608, 480, 64, 90), border_radius=26)  # le portail
        dessin.rect(s, (20, 14, 26), (614, 486, 52, 84), border_radius=22)
        for x in range(620, 664, 9):                         # la herse
            dessin.line(s, (74, 66, 84), (x, 492), (x, 570), 2)
        for y in range(496, 570, 12):
            dessin.line(s, (74, 66, 84), (616, y), (664, y), 2)
        for x, y in self.TORCHES:
            dessin.line(s, (60, 50, 60), (x, y + 18), (x, y), 3)
        lierre = [(334, 566), (346, 520), (338, 490), (352, 460), (342, 430), (356, 400)]
        for (xa, ya), (xb, yb) in zip(lierre, lierre[1:]):   # du lierre sur la tour
            dessin.line(s, (28, 52, 34), (xa, ya), (xb, yb), 3)
            dessin.circle(s, (34, 70, 40), (xb + 5, yb + 4), 4)
            dessin.circle(s, (34, 70, 40), (xb - 5, yb + 10), 3)
        # l'ombre au pied des murs : le château est posé, pas suspendu
        ombre = pygame.Surface((_z(840), _z(40)), pygame.SRCALPHA)
        for k in range(_z(40)):
            ombre.fill((8, 4, 14, round(150 * k / _z(40))), (0, k, _z(840), 1))
        s.blit(ombre, (_z(225), _z(528)))
        # la butte, devant : elle recouvre le pied des murs, avec des rochers et de l'herbe
        butte = [(0, H), (0, 610), (120, 594), (200, 576), (232, 562), (262, 566), (296, 552),
                 (334, 558), (372, 552), (408, 562), (612, 572), (668, 572), (872, 562),
                 (906, 552), (946, 558), (984, 550), (1022, 564), (1060, 560), (1090, 578),
                 (1180, 596), (L, 606), (L, H)]
        dessin.polygon(s, (26, 19, 34), butte)
        for x, y, w, h in ((282, 548, 52, 24), (360, 550, 36, 18), (230, 556, 40, 18),
                           (896, 548, 50, 24), (970, 546, 44, 22), (1036, 556, 40, 18),
                           (520, 566, 30, 12), (760, 566, 34, 12)):
            dessin.ellipse(s, (44, 38, 54), (x, y, w, h))           # les rochers
            dessin.ellipse(s, (58, 52, 70), (x + 4, y + 2, w * 0.6, h * 0.4))
        des = random.Random(3)
        for _ in range(40):                                  # des touffes d'herbe sèche
            x = des.uniform(200, 1090)
            y = 562 + des.uniform(0, 12)
            for d in (-3, 0, 3):
                dessin.line(s, (40, 46, 38), (x, y), (x + d * 1.5, y - 7 - abs(d)), 1)
        for x in (240, 1050):  # les remparts finissent dans les rochers
            dessin.ellipse(s, (36, 30, 46), (x - 20, 568, 70, 20))
        dessin.polygon(s, (36, 28, 42), [(612, 570), (668, 570), (780, H), (500, H)])  # le chemin
        for k in range(6):
            y = 580 + k * 26
            dessin.line(s, (46, 36, 52), (640 - 22 - k * 22, y), (640 + 22 + k * 22, y), 1)

    # ---- ce qui bouge ----

    def dessiner(self, e, t, vignettes, allumees, cible=None):
        fete = len(allumees) / len(FENETRES)
        e.blit(self.fond, (0, 0))
        for x, y, r in self.etoiles:
            dessin.circle(e, (230, 230, 255), (x, y), r * (0.6 + 0.4 * math.sin(t * 2 + x)))
        for k in range(3):  # des nuages passent devant la lune
            x = (k * 520 + t * 14) % (L + 400) - 200
            dessin.ellipse(e, (32, 22, 46), (x, 110 + k * 70, 260, 44))
            dessin.ellipse(e, (32, 22, 46), (x + 60, 92 + k * 70, 150, 40))
        e.blit(self.devant, (0, 0))
        drapeau = melange((80, 70, 96), ORANGE, fete)
        for x, sommet in ((370, 120), (640, 20), (910, 120), (736, 128)):
            onde = 3 * math.sin(t * 4 + x)
            dessin.polygon(e, drapeau, [(x, sommet - 26), (x + 22, sommet - 20 + onde), (x, sommet - 14)])
        banniere = melange((70, 40, 90), VIOLET, fete)
        for x, y in self.BANNIERES:
            dessin.polygon(e, banniere, [(x, y), (x + 30, y), (x + 30, y + 56), (x + 15, y + 44), (x, y + 56)])
            if fete > 0:
                dessin.circle(e, OR, (x + 15, y + 20), 6)
        for k, (x, y) in enumerate(self.PETITES):  # elles s'allument avec la fête
            allume = k < round(fete * len(self.PETITES))
            dessin.rect(e, (255, 200, 90) if allume else (20, 18, 30), (x, y, 20, 30), border_radius=8)
        for x, y in self.TORCHES:  # les flammes vacillent
            h = 10 + 3 * math.sin(t * 13 + x)
            dessin.ellipse(e, (255, 120, 30), (x - 6, y - h, 12, h + 4))
            dessin.ellipse(e, (255, 230, 120), (x - 3, y - h * 0.6, 6, h * 0.6 + 2))
        for i, r in enumerate(FENETRES):
            if i in vignettes:
                e.blit(vignettes[i], (_z(r.x), _z(r.y)))
            else:
                dessin.rect(e, (18, 16, 30), r)
            dessin.rect(e, self.OMBRE, r.inflate(4, 4), 6, border_radius=6)
            if i == cible:
                g = 8 + 4 * math.sin(t * 6)
                dessin.rect(e, OR, r.inflate(g, g), 3, border_radius=10)
        for k in range(round(4 * (1 - fete))):  # les chauves-souris s'en vont avec la fête
            x = (k * 370 + t * (60 + k * 15)) % (L + 200) - 100
            y = 190 + 50 * math.sin(t * 1.3 + k) + k * 45
            poser(e, anime("chauve_souris", t + k), x, y, echelle=0.5)
        if fete < 0.5 and t % 7 < 0.12:  # un éclair
            e.fill((70, 70, 80), special_flags=pygame.BLEND_RGB_ADD)
