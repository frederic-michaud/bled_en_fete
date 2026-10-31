"""Le Bled vu de la cour, la nuit : l'accueil (le vampire arrive dans la cour) et le
voyage d'une salle à l'autre (on recule jusqu'à la fenêtre de la salle, le vampire vole
vers la suivante, on plonge dedans)."""
import math
import random

import pygame

from decors import MELEZE, RIDEAU, citrouille, montagnes
from outils import (BLANC, FESTIF, H, L, OR, ZOOM, _z, anime, degrade, dessin,
                    melange, poser)

# --------------------------------------------------------------------------
# Le Bled vu de dehors : l'accueil, et le voyage d'une salle à l'autre
# --------------------------------------------------------------------------

# Le Bled est dessiné avec des mesures « de base », puis agrandi de GRAND autour de CENTRE
# (le pied du bâtiment) : on change sa taille à l'écran sans toucher à ses proportions.
GRAND, CENTRE = 1.1, (540, 492)


def agrandi(x, y):
    return CENTRE[0] + (x - CENTRE[0]) * GRAND, CENTRE[1] + (y - CENTRE[1]) * GRAND


def rect_agrandi(r):
    x, y = agrandi(r[0], r[1])
    return pygame.Rect(round(x), round(y), round(r[2] * GRAND), round(r[3] * GRAND))


class _Agrandi:
    """Comme outils.dessin, mais en mesures de base (agrandies de GRAND autour de CENTRE)."""

    @staticmethod
    def rect(s, couleur, r, width=0, border_radius=0):
        x, y = agrandi(r[0], r[1])
        dessin.rect(s, couleur, (x, y, r[2] * GRAND, r[3] * GRAND), width and max(1, round(width * GRAND)),
                    round(border_radius * GRAND))

    @staticmethod
    def circle(s, couleur, centre, rayon, width=0):
        dessin.circle(s, couleur, agrandi(*centre), rayon * GRAND, width and max(1, round(width * GRAND)))

    @staticmethod
    def ellipse(s, couleur, r, width=0):
        x, y = agrandi(r[0], r[1])
        dessin.ellipse(s, couleur, (x, y, r[2] * GRAND, r[3] * GRAND), width)

    @staticmethod
    def line(s, couleur, a, b, width=1):
        dessin.line(s, couleur, agrandi(*a), agrandi(*b), max(1, round(width * GRAND)))

    @staticmethod
    def polygon(s, couleur, points):
        dessin.polygon(s, couleur, [agrandi(*pt) for pt in points])


d = _Agrandi

# La fenêtre de chaque salle dans le Bled (une par salle de NIVEAUX) : la Bricotine sous
# terre (en coupe), le foyer et la Tanière au rez, la terrasse du 5e sur le toit de l'aile
# basse. En mesures de base (_BASE), puis à l'écran.
FENETRES_BASE = [pygame.Rect(560, 504, 140, 72), pygame.Rect(140, 402, 160, 84),
                 pygame.Rect(336, 402, 160, 84), pygame.Rect(170, 200, 300, 52)]
FENETRES = [rect_agrandi(r) for r in FENETRES_BASE]
CAVE = pygame.Rect(430, 496, 290, 92)  # la Bricotine dans la terre, sous la cour (base)
ARRIVEE = agrandi(84, 492)           # où les personnages se posent dans la cour, à l'accueil
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

    SOL = 492                     # le sol de la cour, au pied du rez
    REZ, ETAGE = 392, 28          # le haut du rez, la hauteur d'un étage
    BASSE = (110, 600, 4)         # l'aile basse : x de gauche, x de droite, étages
    HAUTE = (600, 962, 8)         # l'aile haute
    BETON, BETON_SOMBRE = (78, 78, 88), (58, 58, 68)

    def __init__(self):
        self.fond = degrade((L, H), (8, 8, 28), (46, 26, 60))
        self.dessiner_lune(self.fond, (1190, 84))
        des = random.Random(7)
        self.etoiles = [(des.uniform(0, L), des.uniform(0, 330), des.uniform(0.6, 1.6)) for _ in range(80)]
        # chaque étage : des panneaux de mélèze et de grandes portes vitrées, avec un long
        # rideau bleu à côté de chaque porte (il flotte au vent)
        self.fenetres, self.rideaux, self.balcons = [], [], []
        for x0, x1, n in (self.BASSE, self.HAUTE):
            for k in range(n):
                bas = self.REZ - k * self.ETAGE
                self.balcons.append((x0, x1, bas))
                for x in range(x0 + 8, x1 - 30, 52):
                    ferme = des.random() < 0.25  # le rideau est tiré devant la vitre
                    self.fenetres.append((x + 28, bas - self.ETAGE + 4, 22, self.ETAGE - 9, des.random(), ferme))
                    if not ferme and des.random() < 0.6:
                        self.rideaux.append((x + 22, bas - self.ETAGE + 2, des.uniform(0, 6)))
        self.devant = pygame.Surface((L * ZOOM, H * ZOOM), pygame.SRCALPHA)
        self.dessiner_bled(self.devant)

    # ---- ce qui ne bouge pas : la lune, les Alpes, le bâtiment, la cour, dessinés une fois ----

    @staticmethod
    def dessiner_lune(s, centre):
        """Un croissant de lune, avec un halo doux et transparent autour."""
        taille = 64
        halo = pygame.Surface((taille, taille), pygame.SRCALPHA)
        for y in range(taille):
            for x in range(taille):
                d = math.hypot(x - taille / 2 + 0.5, y - taille / 2 + 0.5) / (taille / 2)
                halo.set_at((x, y), (255, 236, 190, round(70 * max(0.0, 1 - d) ** 2)))
        halo = pygame.transform.smoothscale(halo, (_z(220), _z(220)))
        s.blit(halo, halo.get_rect(center=(_z(centre[0]), _z(centre[1]))))
        r = _z(30)
        lune = pygame.Surface((2 * r + 4, 2 * r + 4), pygame.SRCALPHA)
        pygame.draw.circle(lune, (246, 236, 200), (r + 2, r + 2), r)
        pygame.draw.circle(lune, (226, 214, 176), (r - r // 3, r + r // 2), r // 6)  # des taches
        pygame.draw.circle(lune, (226, 214, 176), (r - r // 2, r - r // 3), r // 9)
        pygame.draw.circle(lune, (0, 0, 0, 0), (r + 2 + r * 0.55, r + 2 - r * 0.3), r * 0.92)  # le croissant
        lune = pygame.transform.rotate(lune, -15)
        s.blit(lune, lune.get_rect(center=(_z(centre[0]), _z(centre[1]))))

    def dessiner_bled(self, s):
        alpes = [(0, 300), (70, 250), (130, 272), (210, 226), (290, 262), (370, 214), (450, 258),
                 (530, 232), (600, 280), (962, 280), (1040, 244), (1130, 270), (1210, 228), (L, 252), (L, 330),
                 (0, 330)]
        montagnes(s, alpes[:-2], 330, False)
        haut_basse = self.REZ - self.BASSE[2] * self.ETAGE
        haut_haute = self.REZ - self.HAUTE[2] * self.ETAGE
        bois = melange(MELEZE, (20, 14, 30), 0.6)                 # le mélèze, la nuit
        dalle, garde_corps = (150, 150, 160), (176, 176, 186)     # béton clair, garde-corps blancs
        for (x0, x1, _), haut in ((self.BASSE, haut_basse), (self.HAUTE, haut_haute)):
            d.rect(s, bois, (x0, haut, x1 - x0, self.REZ - haut))
            for x in range(x0, x1, 6):  # les lames de bois verticales
                d.line(s, melange(bois, (0, 0, 0), 0.22), (x, haut), (x, self.REZ), 1)
        # l'aile haute fait un angle avec l'aile basse : son côté, dans l'ombre
        d.rect(s, melange(bois, (0, 0, 0), 0.35), (self.HAUTE[0], haut_haute, 18, haut_basse - haut_haute))
        for x0, x1, bas in self.balcons:  # les balcons filants, qui débordent aux angles
            d.rect(s, dalle, (x0 - 16, bas - 5, x1 - x0 + 32, 5))
            d.line(s, garde_corps, (x0 - 16, bas - 17), (x1 + 16, bas - 17), 1)
            for x in range(x0 - 16, x1 + 17, 4):
                d.line(s, melange(garde_corps, (0, 0, 0), 0.25), (x, bas - 17), (x, bas - 5), 1)
        for x0, x1, haut in ((self.BASSE[0], self.BASSE[1], haut_basse), (self.HAUTE[0], self.HAUTE[1], haut_haute)):
            d.rect(s, dalle, (x0 - 18, haut - 7, x1 - x0 + 36, 7))  # le toit, épais
        # la terrasse du 5e, sur le toit de l'aile basse : la pergola, large et basse, à
        # l'écart de l'aile haute (la fête qui s'y passe se voit dessous)
        poutre = melange((190, 144, 88), (20, 14, 30), 0.45)
        r = FENETRES_BASE[3]
        for x in (r.x - 22, r.centerx - 4, r.right + 14):
            d.rect(s, poutre, (x, r.y - 12, 8, haut_basse - 7 - (r.y - 12)))
        d.rect(s, poutre, (r.x - 30, r.y - 16, r.w + 60, 8))
        for x in range(r.x - 30, r.right + 30, 14):  # les lattes de la pergola
            d.rect(s, melange(poutre, (0, 0, 0), 0.2), (x, r.y - 22, 5, 6))
        # puis sa balustrade, tout le long du bord, devant la pergola
        y0, y1 = haut_basse - 22, haut_basse - 7
        d.line(s, garde_corps, (self.BASSE[0] - 18, y0), (self.BASSE[1], y0), 2)
        for x in range(self.BASSE[0] - 18, self.BASSE[1] + 1, 4):
            d.line(s, melange(garde_corps, (0, 0, 0), 0.25), (x, y0), (x, y1), 1)
        # le rez, en béton clair, en retrait sous le premier balcon, posé sur le sol
        rez = (96, 96, 106)
        x0, x1 = self.BASSE[0] + 10, self.HAUTE[1] - 10
        d.rect(s, rez, (x0, self.REZ, x1 - x0, self.SOL - self.REZ))
        d.rect(s, (60, 60, 70), (x0, self.REZ, x1 - x0, 6))
        for x in (596, 686, 776, 866):  # des vitres du rez (l'épicerie, les bureaux…)
            d.rect(s, (24, 26, 40), (x, 410, 56, 74))
            d.line(s, (60, 62, 74), (x + 28, 410), (x + 28, 484), 2)
        # la porte d'entrée : un auvent, une lampe, deux battants vitrés, un paillasson
        d.rect(s, (130, 130, 140), (512, 400, 64, 6))
        d.rect(s, (60, 60, 70), (512, 406, 64, 3))
        d.circle(s, (255, 220, 150), (544, 414), 3)
        d.rect(s, (120, 120, 130), (518, 418, 52, 74))
        for x in (522, 545):
            d.rect(s, (28, 40, 64), (x, 422, 21, 70))
            d.line(s, (70, 90, 120), (x + 4, 432), (x + 12, 422), 2)   # un reflet
            d.line(s, (70, 90, 120), (x + 4, 446), (x + 18, 428), 1)
        d.line(s, (190, 190, 200), (541, 446), (541, 466), 2)          # les poignées
        d.line(s, (190, 190, 200), (549, 446), (549, 466), 2)
        d.rect(s, (70, 50, 40), (514, 489, 60, 4))
        # sous la cour, la terre, en coupe ; dedans, la Bricotine
        terre = (44, 32, 30)
        d.rect(s, terre, (0, self.SOL, L, H - self.SOL))
        des = random.Random(5)
        for _ in range(220):  # des cailloux dans la terre
            x, y = des.uniform(0, L), des.uniform(self.SOL + 10, H)
            d.ellipse(s, melange(terre, (90, 76, 66), des.uniform(0.2, 0.6)), (x, y, des.uniform(3, 7), 3))
        for y in (560, 630, 690):  # les couches de terre
            d.line(s, melange(terre, (0, 0, 0), 0.25), (0, y), (L, y + des.uniform(-6, 6)), 1)
        d.rect(s, melange(terre, (0, 0, 0), 0.3), (x0, self.SOL, x1 - x0, 10))  # les fondations
        c = CAVE
        d.rect(s, (110, 110, 120), c, border_radius=4)                # les murs de béton de la cave
        d.rect(s, (30, 28, 36), c.inflate(-12, -12), border_radius=2)
        for x in (c.x + 22, c.x + 70):  # des vélos de la vélostation, à côté de l'atelier
            d.circle(s, (76, 76, 86), (x, c.bottom - 20), 9, 2)
            d.circle(s, (76, 76, 86), (x + 24, c.bottom - 20), 9, 2)
            d.line(s, (110, 70, 70), (x, c.bottom - 20), (x + 12, c.bottom - 34), 2)
            d.line(s, (110, 70, 70), (x + 12, c.bottom - 34), (x + 24, c.bottom - 20), 2)
        # le sol de la cour : une bande de gravier et d'herbe
        d.rect(s, (62, 60, 66), (0, self.SOL, L, 6))
        for x in range(0, L, 7):
            if not x0 - 6 < x < x1 + 6:
                d.line(s, (40, 60, 40), (x, self.SOL), (x + 2, self.SOL - 5), 1)
        for x, h in ((66, 210), (1180, 230)):  # deux grands pins
            d.rect(s, (30, 22, 20), (x - 4, self.SOL - h * 0.2, 8, h * 0.2))
            for k in range(3):
                y = self.SOL - h * 0.2 - k * h * 0.25
                w = h * (0.32 - k * 0.07)
                d.polygon(s, (16, 30, 26), [(x - w, y), (x, y - h * 0.4), (x + w, y)])
        for x, h in ((1100, 100),):  # un jeune arbre
            d.line(s, (40, 30, 26), (x, self.SOL), (x, self.SOL - h), 4)
            for dx, dy, rr in ((0, -h, 28), (-18, -h + 16, 20), (18, -h + 14, 22)):
                d.circle(s, (24, 40, 30), (x + dx, self.SOL + dy), rr)
        for x, y in ((1050, 480), (1124, 484)):  # des rondins
            d.rect(s, (82, 64, 46), (x, y, 14, 12), border_radius=3)
            d.ellipse(s, (130, 104, 72), (x, y - 3, 14, 6))

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
        rideau = melange(melange(RIDEAU, (20, 14, 30), 0.55), RIDEAU, fete)
        for x, y, w, h, hasard, ferme in self.fenetres:  # elles s'allument avec la fête
            allume = hasard < 0.12 + 0.75 * fete
            if ferme:  # le rideau tiré, éclairé par derrière si on est là
                d.rect(e, melange(rideau, (255, 214, 140), 0.45) if allume else melange(rideau, (0, 0, 0), 0.3),
                            (x, y, w, h))
                for k in (5, 11, 17):
                    d.line(e, melange(rideau, (0, 0, 0), 0.3), (x + k, y), (x + k, y + h), 1)
            else:
                d.rect(e, (255, 204, 110) if allume else (22, 24, 38), (x, y, w, h))
        bleu = melange(melange(RIDEAU, (20, 14, 30), 0.55), RIDEAU, fete)
        for x, y, decal in self.rideaux:  # les rideaux bleus flottent au vent
            onde = 3 * math.sin(t * 1.7 + decal)
            d.polygon(e, bleu, [(x, y), (x + 6, y), (x + 6 + onde, y + self.ETAGE - 7),
                                     (x + onde, y + self.ETAGE - 7)])
        if fete > 0:  # des guirlandes et des citrouilles sur les balcons
            n = round(fete * len(self.balcons))
            for k, (x0, x1, bas) in enumerate(self.balcons[::-1][:n]):
                for i, x in enumerate(range(x0, x1, 24)):
                    c = FESTIF[(i + k) % 5] if int(t * 3 + i) % 4 else BLANC
                    d.circle(e, c, (x + 12, bas - self.ETAGE + 5 + 3 * math.sin(i)), 2)
                citrouille(e, *agrandi(x0 + 30 + (k * 97) % (x1 - x0 - 60), bas - 5), 6 * GRAND, True)
        for i, r in enumerate(FENETRES):
            if i in vignettes:
                e.blit(vignettes[i], (_z(r.x), _z(r.y)))
            else:
                dessin.rect(e, (18, 16, 30), r)
            dessin.rect(e, (34, 34, 42), r.inflate(6, 6), 4, border_radius=4)
            if i == cible:
                g = 10 + 4 * math.sin(t * 6)
                dessin.rect(e, OR, r.inflate(g, g), 3, border_radius=8)
        if fete > 0:  # des lampions sous la pergola
            r = FENETRES_BASE[3]
            for k, x in enumerate(range(r.x - 20, r.right + 24, 30)):  # accrochés à la poutre
                y = r.y - 6 + 3 * math.sin(t * 2 + k)
                d.line(e, (60, 50, 40), (x, r.y - 10), (x, y), 1)
                d.circle(e, FESTIF[k % 5], (x, y), 5)
        for k in range(round(4 * (1 - fete))):  # les chauves-souris s'en vont avec la fête
            x = (k * 370 + t * (60 + k * 15)) % (L + 200) - 100
            y = 150 + 40 * math.sin(t * 1.3 + k) + k * 40
            poser(e, anime("chauve_souris", t + k), x, y, echelle=0.5)
