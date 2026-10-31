"""Le Bled vu de la cour, la nuit : l'accueil (le vampire arrive dans la cour) et le
voyage d'une salle à l'autre (on recule jusqu'à la fenêtre de la salle, le vampire vole
vers la suivante, on plonge dedans)."""
import math
import random

import pygame

from decors import MELEZE, RIDEAU, citrouille
from outils import (BLANC, FESTIF, H, L, OR, ZOOM, _z, anime, degrade, dessin, ecrire,
                    melange, poser)

# --------------------------------------------------------------------------
# Le Bled vu de dehors : l'accueil, et le voyage d'une salle à l'autre
# --------------------------------------------------------------------------

# La fenêtre de chaque salle dans le Bled (une par salle de NIVEAUX) : la Bricotine au
# sous-sol, le foyer et la Tanière au rez, la terrasse du 5e sur le toit de l'aile basse.
FENETRES = [pygame.Rect(530, 498, 120, 58), pygame.Rect(240, 402, 160, 84),
            pygame.Rect(720, 402, 160, 84), pygame.Rect(190, 190, 160, 84)]
NOMS_FENETRES = ["Bricotine", "Foyer", "Tanière", "Terrasse"]
ARRIVEE = (110, 610)                 # où le vampire se pose dans la cour, à l'accueil
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
    """Le Bled la nuit, vu de la cour : l'aile basse (avec la terrasse du 5e sur son toit)
    et l'aile haute, en mélèze, avec leurs balcons filants et leurs rideaux bleus ; le
    rez en béton ; derrière, les Alpes. Dans chaque fenêtre de salle, un aperçu :
    assombri tant qu'elle fait peur, en fête une fois finie. Plus le Bled est en fête,
    plus il y a de fenêtres allumées, de guirlandes et de citrouilles sur les balcons."""

    SOL = 562                     # le sol de la cour, au pied du bâtiment
    REZ, ETAGE = 392, 28          # le haut du rez, la hauteur d'un étage
    BASSE = (110, 600, 4)         # l'aile basse : x de gauche, x de droite, étages
    HAUTE = (600, 1170, 8)        # l'aile haute
    BETON, BETON_SOMBRE = (78, 78, 88), (58, 58, 68)

    def __init__(self):
        self.fond = degrade((L, H), (8, 8, 28), (46, 26, 60))
        dessin.circle(self.fond, (40, 36, 66), (1210, 80), 52)
        dessin.circle(self.fond, (236, 230, 200), (1210, 80), 36)
        dessin.circle(self.fond, (218, 212, 184), (1198, 70), 6)
        des = random.Random(7)
        self.etoiles = [(des.uniform(0, L), des.uniform(0, 330), des.uniform(0.6, 1.6)) for _ in range(80)]
        # les fenêtres et les rideaux des étages (allumés, agités par le vent quand ça bouge)
        self.fenetres, self.rideaux, self.balcons = [], [], []
        for x0, x1, n in (self.BASSE, self.HAUTE):
            for k in range(n):
                bas = self.REZ - k * self.ETAGE
                self.balcons.append((x0, x1, bas))
                for x in range(x0 + 14, x1 - 24, 38):
                    self.fenetres.append((x, bas - self.ETAGE + 6, 20, self.ETAGE - 12, des.random()))
                for x in range(x0 + 40, x1 - 20, 76):
                    self.rideaux.append((x + des.uniform(-8, 8), bas - self.ETAGE + 2, des.uniform(0, 6)))
        self.devant = pygame.Surface((L * ZOOM, H * ZOOM), pygame.SRCALPHA)
        self.dessiner_bled(self.devant)

    # ---- ce qui ne bouge pas : les Alpes, le bâtiment, la cour, dessinés une fois ----

    def dessiner_bled(self, s):
        alpes = [(0, 300), (70, 250), (130, 272), (210, 226), (290, 262), (370, 214), (450, 258),
                 (530, 232), (600, 280), (1170, 280), (1210, 246), (1250, 264), (L, 240), (L, 330), (0, 330)]
        dessin.polygon(s, (30, 26, 52), alpes)
        for x, y in ((70, 250), (210, 226), (370, 214), (530, 232), (1210, 246)):
            dessin.polygon(s, (110, 110, 140), [(x, y), (x - 14, y + 12), (x + 14, y + 12)])
        haut_basse = self.REZ - self.BASSE[2] * self.ETAGE
        haut_haute = self.REZ - self.HAUTE[2] * self.ETAGE
        bois = melange(MELEZE, (20, 14, 30), 0.62)                # le mélèze, la nuit
        for (x0, x1, _), haut in ((self.BASSE, haut_basse), (self.HAUTE, haut_haute)):
            dessin.rect(s, bois, (x0, haut, x1 - x0, self.REZ - haut))
            for x in range(x0, x1, 9):  # les lames de bois
                dessin.line(s, melange(bois, (0, 0, 0), 0.2), (x, haut), (x, self.REZ), 1)
            dessin.rect(s, (96, 96, 108), (x0 - 12, haut - 6, x1 - x0 + 24, 6))  # l'avant-toit
        dessin.rect(s, melange(bois, (0, 0, 0), 0.3), (self.HAUTE[0], haut_haute, 14, self.REZ - haut_haute))
        for x0, x1, bas in self.balcons:  # les balcons filants : dalle blanche et garde-corps
            dessin.rect(s, (110, 110, 122), (x0 - 12, bas - 5, x1 - x0 + 24, 5))
            dessin.line(s, (96, 96, 108), (x0 - 12, bas - 15), (x1 + 12, bas - 15), 1)
            for x in range(x0 - 12, x1 + 12, 5):
                dessin.line(s, (88, 88, 100), (x, bas - 15), (x, bas - 5), 1)
        # la terrasse du 5e, sur le toit de l'aile basse : la pergola en bois
        poutre = melange((190, 144, 88), (20, 14, 30), 0.5)
        for x in (150, 395, 580):
            dessin.rect(s, poutre, (x, 178, 8, haut_basse - 178))
        dessin.rect(s, poutre, (130, 174, 470, 8))
        for x in range(140, 600, 22):
            dessin.rect(s, melange(poutre, (0, 0, 0), 0.2), (x, 168, 6, 8))
        dessin.line(s, (120, 120, 132), (104, haut_basse - 14), (606, haut_basse - 14), 2)  # sa balustrade
        for x in range(104, 606, 6):
            dessin.line(s, (106, 106, 118), (x, haut_basse - 14), (x, haut_basse - 6), 1)
        # le rez et le sous-sol, en béton, avec de grandes vitres
        dessin.rect(s, self.BETON, (self.BASSE[0], self.REZ, self.HAUTE[1] - self.BASSE[0], self.SOL - self.REZ))
        dessin.rect(s, self.BETON_SOMBRE, (self.BASSE[0], 492, self.HAUTE[1] - self.BASSE[0], self.SOL - 492))
        dessin.line(s, (98, 98, 110), (self.BASSE[0], 492), (self.HAUTE[1], 492), 2)
        for x in (130, 430, 920, 1010, 1100):  # des vitres du rez (l'épicerie, les bureaux…)
            dessin.rect(s, (24, 26, 40), (x, 410, 56 if x != 430 else 66, 74))
        dessin.rect(s, (20, 20, 30), (450, 420, 26, 72))  # la porte d'entrée
        for x in (180, 720, 900, 1060):  # des soupiraux de la vélostation
            dessin.rect(s, (18, 20, 30), (x, 504, 70, 26))
        # la cour, devant : le gravier, les pins, l'abri à vélos, un banc, les ganivelles
        dessin.rect(s, (30, 26, 36), (0, self.SOL, L, H - self.SOL))
        dessin.rect(s, (40, 36, 48), (0, self.SOL, L, 6))
        des = random.Random(5)
        for _ in range(160):
            dessin.circle(s, (46, 42, 54), (des.uniform(0, L), des.uniform(self.SOL + 8, H)), 1)
        for x, h in ((40, 230), (1240, 250), (1000, 150), (330, 120)):  # des pins
            dessin.rect(s, (30, 22, 20), (x - 4, self.SOL + 40 - h * 0.2, 8, h * 0.2))
            for k in range(3):
                y = self.SOL + 40 - h * 0.2 - k * h * 0.25
                w = h * (0.32 - k * 0.07)
                dessin.polygon(s, (16, 30, 26), [(x - w, y), (x, y - h * 0.4), (x + w, y)])
        dessin.rect(s, (70, 72, 80), (760, 586, 180, 6))  # l'abri à vélos
        for x in (770, 930):
            dessin.line(s, (60, 62, 70), (x, 592), (x, 648), 3)
        for x in (800, 860, 900):
            dessin.circle(s, (40, 40, 46), (x, 636), 12, 2)
            dessin.circle(s, (40, 40, 46), (x + 22, 636), 12, 2)
        dessin.rect(s, (70, 52, 40), (560, 640, 110, 8))  # un banc
        for x in (566, 656):
            dessin.rect(s, (50, 40, 34), (x, 648, 6, 16))
        for x in range(0, L, 9):  # les ganivelles, tout devant
            dessin.line(s, (58, 46, 40), (x, 690), (x + 2, 720), 3)
        dessin.line(s, (48, 38, 34), (0, 700), (L, 700), 2)

    # ---- ce qui bouge ----

    def dessiner(self, e, t, vignettes, allumees, cible=None):
        fete = len(allumees) / len(FENETRES)
        e.blit(self.fond, (0, 0))
        for x, y, r in self.etoiles:
            dessin.circle(e, (230, 230, 255), (x, y), r * (0.6 + 0.4 * math.sin(t * 2 + x)))
        for k in range(3):  # des nuages passent
            x = (k * 520 + t * 14) % (L + 400) - 200
            dessin.ellipse(e, (30, 22, 46), (x, 60 + k * 50, 260, 40))
            dessin.ellipse(e, (30, 22, 46), (x + 60, 46 + k * 50, 150, 36))
        e.blit(self.devant, (0, 0))
        for x, y, w, h, hasard in self.fenetres:  # elles s'allument avec la fête
            allume = hasard < 0.12 + 0.75 * fete
            dessin.rect(e, (255, 204, 110) if allume else (22, 24, 38), (x, y, w, h))
        bleu = melange(melange(RIDEAU, (20, 14, 30), 0.55), RIDEAU, fete)
        for x, y, decal in self.rideaux:  # les rideaux bleus flottent au vent
            onde = 3 * math.sin(t * 1.7 + decal)
            dessin.polygon(e, bleu, [(x, y), (x + 8, y), (x + 8 + onde, y + self.ETAGE - 8),
                                     (x + onde, y + self.ETAGE - 8)])
        if fete > 0:  # des guirlandes et des citrouilles sur les balcons
            n = round(fete * len(self.balcons))
            for k, (x0, x1, bas) in enumerate(self.balcons[::-1][:n]):
                for i, x in enumerate(range(x0, x1, 24)):
                    c = FESTIF[(i + k) % 5] if int(t * 3 + i) % 4 else BLANC
                    dessin.circle(e, c, (x + 12, bas - self.ETAGE + 5 + 3 * math.sin(i)), 2)
                citrouille(e, x0 + 30 + (k * 97) % (x1 - x0 - 60), bas - 5, 6, True)
        for i, r in enumerate(FENETRES):
            if i in vignettes:
                e.blit(vignettes[i], (_z(r.x), _z(r.y)))
            else:
                dessin.rect(e, (18, 16, 30), r)
            dessin.rect(e, (34, 34, 42), r.inflate(6, 6), 4, border_radius=4)
            ecrire(e, NOMS_FENETRES[i], 20, OR if i in allumees else (200, 200, 210),
                   centre=(r.centerx, r.y - 11 if i != 0 else r.bottom + 10))
            if i == cible:
                g = 10 + 4 * math.sin(t * 6)
                dessin.rect(e, OR, r.inflate(g, g), 3, border_radius=8)
        if fete > 0:  # des lampions sous la pergola
            for k, x in enumerate(range(160, 590, 36)):
                y = 186 + 4 * math.sin(t * 2 + k)
                dessin.circle(e, FESTIF[k % 5], (x, y), 5)
        for k in range(round(4 * (1 - fete))):  # les chauves-souris s'en vont avec la fête
            x = (k * 370 + t * (60 + k * 15)) % (L + 200) - 100
            y = 150 + 40 * math.sin(t * 1.3 + k) + k * 40
            poser(e, anime("chauve_souris", t + k), x, y, echelle=0.5)
