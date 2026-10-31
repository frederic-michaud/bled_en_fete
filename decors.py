"""Les décors des quatre salles du Bled, dessinés une fois pour toutes, chacun en deux
versions (lugubre et en fête) que la salle mélange selon sa fête :
- la Bricotine (l'atelier de bricolage du sous-sol, avec la vélostation) ;
- le foyer (au rez : boiseries en mélèze, bar, grandes vitres sur la cour) ;
- la Tanière (la salle polyvalente : murs noirs, rideaux, écran, gradins, projecteurs) ;
- la terrasse du 5e (dehors : pergola, bacs du potager, vue sur le lac et les Alpes).

Pour chaque décor : le mur du fond (MOTIF px de large, répété), la frise du plafond
(160 px de large, répétée) et les deux tuiles (le plein et la planche)."""
import math
import random

import pygame

from outils import FESTIF, H, OR, ROSE, T, VIOLET, _z, dessin, melange

MOTIF = 1920                # largeur du motif du mur du fond
HAUT_FRISE = 80
DECORS = ("bricotine", "foyer", "taniere", "terrasse")

CIEL_NUIT, CIEL_FETE = ((8, 10, 30), (34, 26, 66)), ((26, 16, 64), (110, 52, 96))
MELEZE = (176, 122, 66)     # le bois des façades et des boiseries du Bled
RIDEAU = (140, 190, 218)    # les rideaux bleus des balcons


def couleur(fete, nuit, jour):
    return jour if fete else nuit


def degrade_vertical(s, x, y, w, h, haut, bas, pas=4):
    for k in range(0, h, pas):
        dessin.rect(s, melange(haut, bas, k / h), (x, y + k, w, pas))


def fanions(s, a, b, fete, creux=24, n=10):
    """Une guirlande de fanions de a à b (en fête : en couleurs ; sinon : grise et déchirée)."""
    pts = [(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n + creux * math.sin(k / n * math.pi))
           for k in range(n + 1)]
    for (xa, ya), (xb, yb) in zip(pts, pts[1:]):
        dessin.line(s, (110, 100, 90) if fete else (60, 58, 62), (xa, ya), (xb, yb), 1)
    for k, ((xa, ya), (xb, yb)) in enumerate(zip(pts, pts[1:])):
        if not fete and k % 3 == 1:
            continue  # il en manque
        c = FESTIF[k % 5] if fete else (54, 52, 60)
        bout = 18 if fete else 12
        dessin.polygon(s, c, [(xa + 2, ya), (xb - 2, yb), ((xa + xb) / 2, (ya + yb) / 2 + bout)])


def citrouille(s, x, y, r, allumee):
    """Une citrouille posée (bas en y), côtelée : éteinte, ou lanterne qui brille."""
    if allumee:
        dessin.circle(s, (110, 56, 30), (x, y - r), r * 1.7)
    corps = (232, 122, 34) if allumee else (120, 74, 40)
    sombre = melange(corps, (0, 0, 0), 0.3)
    for dx, k in ((-0.75, 0.75), (0.75, 0.75), (-0.35, 0.95), (0.35, 0.95)):  # les côtes
        dessin.ellipse(s, sombre, (x + dx * r - r * 0.6, y - r * 2 * k, r * 1.2, r * 2 * k))
    dessin.ellipse(s, corps, (x - r * 0.7, y - r * 2, r * 1.4, r * 2))
    dessin.ellipse(s, melange(corps, (255, 255, 255), 0.25), (x - r * 0.45, y - r * 1.7, r * 0.25, r * 0.7))
    dessin.rect(s, (90, 74, 34), (x - 2, y - r * 2 - 6, 4, 8), border_radius=2)
    dessin.line(s, (90, 130, 50), (x + 2, y - r * 2 - 4), (x + r * 0.6, y - r * 2 - 8), 2)
    if allumee:
        oeil = (255, 220, 100)
        dessin.polygon(s, oeil, [(x - r * 0.7, y - r * 1.1), (x - r * 0.2, y - r * 1.1), (x - r * 0.45, y - r * 1.55)])
        dessin.polygon(s, oeil, [(x + r * 0.7, y - r * 1.1), (x + r * 0.2, y - r * 1.1), (x + r * 0.45, y - r * 1.55)])
        dessin.polygon(s, oeil, [(x - r * 0.75, y - r * 0.85), (x + r * 0.75, y - r * 0.85), (x + r * 0.45, y - r * 0.45),
                                 (x, y - r * 0.6), (x - r * 0.45, y - r * 0.45)])


def guirlande_lumineuse(s, a, b, fete, creux=20, n=14):
    """Une guirlande d'ampoules (éteintes, ou allumées en couleurs)."""
    pts = [(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n + creux * math.sin(k / n * math.pi))
           for k in range(n + 1)]
    for (xa, ya), (xb, yb) in zip(pts, pts[1:]):
        dessin.line(s, (50, 46, 50), (xa, ya), (xb, yb), 1)
    for k, (x, y) in enumerate(pts[1:-1]):
        if fete:
            c = FESTIF[k % 5]
            dessin.circle(s, melange(c, (0, 0, 0), 0.5), (x, y + 5), 7)
            dessin.circle(s, c, (x, y + 5), 4)
        else:
            dessin.circle(s, (70, 70, 76), (x, y + 5), 3)


# --------------------------------------------------------------------------
# La Bricotine : l'atelier et la vélostation, au sous-sol
# --------------------------------------------------------------------------

def velo(s, x, y, c, fete, r=26):
    """Un vélo de profil, roues posées sur y."""
    roue = (40, 40, 46)
    for cx in (x - 34, x + 34):
        dessin.circle(s, roue, (cx, y - r), r, 3)
        dessin.circle(s, (90, 90, 96), (cx, y - r), 3)
    a, b = (x - 34, y - r), (x + 34, y - r)
    selle, guidon = (x - 8, y - r - 30), (x + 24, y - r - 34)
    pedalier = (x, y - r)
    for p, q in ((a, pedalier), (pedalier, selle), (selle, a), (pedalier, guidon), (selle, (x + 20, y - r - 26)),
                 (guidon, b)):
        dessin.line(s, c, p, q, 3)
    dessin.line(s, (30, 30, 34), (selle[0] - 8, selle[1] - 3), (selle[0] + 8, selle[1] - 3), 4)
    dessin.line(s, (30, 30, 34), guidon, (guidon[0] - 6, guidon[1] - 6), 3)
    if fete:  # un ballon attaché au guidon
        bc = FESTIF[x % 5]
        dessin.line(s, (200, 200, 200), guidon, (guidon[0] + 6, guidon[1] - 60), 1)
        dessin.ellipse(s, bc, (guidon[0] - 6, guidon[1] - 86, 24, 30))


def petits_outils(s, x, y, fete):
    """Une rangée d'outils variés accrochés au panneau : clé à molette, pince, mètre,
    niveau, serre-joint, tournevis, clé plate, maillet."""
    acier = couleur(fete, (90, 92, 100), (196, 200, 208))
    rouge, jaune, bleu = (couleur(fete, (90, 40, 40), (220, 60, 50)), couleur(fete, (100, 90, 40), (250, 200, 40)),
                          couleur(fete, (40, 50, 90), (60, 120, 220)))
    # la clé à molette
    dessin.rect(s, acier, (x - 3, y + 4, 6, 50), border_radius=3)
    dessin.circle(s, acier, (x, y + 4), 9)
    dessin.rect(s, melange(acier, (0, 0, 0), 0.5), (x - 3, y - 6, 6, 8))
    # la pince
    x += 44
    dessin.line(s, rouge, (x - 6, y + 56), (x - 1, y + 18), 4)
    dessin.line(s, rouge, (x + 6, y + 56), (x + 1, y + 18), 4)
    dessin.polygon(s, acier, [(x - 4, y + 18), (x + 4, y + 18), (x + 2, y), (x - 2, y)])
    # le mètre ruban
    x += 44
    dessin.circle(s, jaune, (x, y + 22), 14)
    dessin.circle(s, melange(jaune, (0, 0, 0), 0.4), (x, y + 22), 5)
    dessin.rect(s, jaune, (x + 10, y + 32, 18, 4))
    # le niveau à bulle
    x += 38
    dessin.rect(s, bleu, (x, y + 10, 70, 12), border_radius=3)
    dessin.rect(s, couleur(fete, (60, 90, 60), (140, 240, 120)), (x + 28, y + 12, 14, 8), border_radius=3)
    # le serre-joint
    x += 96
    dessin.rect(s, acier, (x - 2, y, 5, 58))
    dessin.rect(s, rouge, (x - 2, y, 26, 8))
    dessin.rect(s, rouge, (x - 2, y + 40, 26, 8))
    dessin.rect(s, couleur(fete, (60, 40, 30), (150, 90, 40)), (x + 22, y + 46, 8, 16), border_radius=2)
    # des tournevis de couleur
    for k, c in enumerate((jaune, bleu, rouge)):
        xx = x + 50 + k * 18
        dessin.rect(s, c, (xx - 4, y, 8, 22), border_radius=3)
        dessin.line(s, acier, (xx, y + 22), (xx, y + 54), 2)
    # la clé plate et le maillet
    x += 120
    dessin.line(s, acier, (x, y + 6), (x, y + 54), 4)
    dessin.circle(s, acier, (x, y + 6), 6, 3)
    dessin.circle(s, acier, (x, y + 54), 5, 3)
    x += 34
    dessin.rect(s, couleur(fete, (80, 60, 40), (200, 160, 100)), (x - 2, y + 16, 5, 44))
    dessin.rect(s, couleur(fete, (60, 60, 64), (120, 120, 126)), (x - 12, y + 4, 24, 14), border_radius=3)


def mur_bricotine(fete):
    s = pygame.Surface((_z(MOTIF), _z(H)))
    beton = couleur(fete, (46, 48, 56), (128, 122, 116))
    s.fill(beton)
    trait = melange(beton, (0, 0, 0), 0.18)
    for y in range(140, H, 130):  # le béton brut : les joints de coffrage et les trous
        dessin.line(s, trait, (0, y), (MOTIF, y), 1)
    for x in range(60, MOTIF, 240):
        for y in range(200, 620, 130):
            dessin.circle(s, trait, (x, y), 3)
            dessin.circle(s, trait, (x + 120, y), 3)
    dessin.rect(s, couleur(fete, (60, 34, 40), (170, 80, 78)), (0, 640, MOTIF, 40))  # le sol rose
    # la vélostation : des râteliers à deux étages
    metal = couleur(fete, (70, 74, 82), (170, 176, 184))
    for y in (520, 650):
        dessin.rect(s, metal, (60, y, 560, 6))
    for x in range(80, 620, 120):
        dessin.line(s, metal, (x, 400), (x, 652), 4)
    for k, x in enumerate(range(120, 600, 110)):
        velo(s, x, 520, couleur(fete, (70, 40, 44), FESTIF[k % 5]), fete and k % 2 == 0)
        velo(s, x + 50, 650, couleur(fete, (50, 54, 64), FESTIF[(k + 2) % 5]), False)
    # le panneau à outils au-dessus de l'établi
    panneau = couleur(fete, (70, 60, 48), (196, 170, 128))
    dessin.rect(s, panneau, (720, 300, 420, 230))
    for x in range(730, 1140, 16):
        for y in range(310, 530, 16):
            dessin.circle(s, melange(panneau, (0, 0, 0), 0.25), (x, y), 1)
    manche = couleur(fete, (90, 40, 40), (220, 50, 50))
    acier = couleur(fete, (90, 92, 100), (190, 196, 204))
    for k, x in enumerate(range(760, 1120, 46)):  # marteaux, tournevis, clés, scie
        genre = k % 4
        if genre == 0:
            dessin.rect(s, manche, (x - 3, 340, 6, 70), border_radius=2)
            dessin.rect(s, acier, (x - 14, 330, 28, 14), border_radius=2)
        elif genre == 1:
            dessin.rect(s, manche, (x - 5, 330, 10, 34), border_radius=4)
            dessin.line(s, acier, (x, 364), (x, 420), 3)
        elif genre == 2:
            dessin.line(s, acier, (x, 332), (x, 420), 5)
            dessin.circle(s, acier, (x, 332), 9, 3)
        else:
            dessin.polygon(s, acier, [(x - 10, 330), (x + 20, 330), (x + 20, 380), (x - 10, 440)])
            dessin.rect(s, manche, (x - 18, 322, 14, 26), border_radius=4)
    petits_outils(s, 760, 444, fete)
    bois = couleur(fete, (70, 50, 36), (150, 104, 62))
    # l'étagère en bois avec des caisses de rangement
    for x in (1240, 1520):
        dessin.rect(s, bois, (x, 260, 14, 380))
    for y in (300, 420, 540):
        dessin.rect(s, bois, (1240, y, 294, 10))
        for k, x in enumerate((1262, 1352, 1442)):  # les caisses tiennent dans l'étagère
            c = couleur(fete, (56, 58, 66), FESTIF[(k + y // 120) % 5])
            dessin.rect(s, c, (x, y - 50, 70, 50), border_radius=4)
            dessin.rect(s, melange(c, (255, 255, 255), 0.3), (x + 23, y - 40, 24, 8), border_radius=3)
    # la scie circulaire verte et un tas de chutes de bois
    vert = couleur(fete, (40, 60, 50), (70, 130, 90))
    dessin.rect(s, vert, (1620, 560, 170, 30), border_radius=4)
    dessin.rect(s, melange(vert, (0, 0, 0), 0.3), (1660, 590, 90, 50))
    dessin.circle(s, acier, (1705, 556), 22)
    dessin.rect(s, vert, (1620, 560, 170, 8))
    des = random.Random(4)
    for _ in range(14):
        x, y = des.uniform(1810, 1900), des.uniform(600, 636)
        dessin.rect(s, couleur(fete, (90, 70, 50), (210, 170, 110)), (x, y, des.uniform(16, 34), 10))
    # l'affiche de l'atelier
    dessin.rect(s, couleur(fete, (110, 108, 104), (240, 236, 226)), (1630, 300, 110, 150))
    for y in range(330, 440, 18):
        dessin.line(s, couleur(fete, (60, 60, 66), (90, 90, 100)), (1645, y), (1725, y), 2)
    dessin.rect(s, couleur(fete, (100, 40, 40), (220, 60, 60)), (1645, 310, 80, 12))
    if fete:
        fanions(s, (40, 130), (680, 130), True)
        fanions(s, (1220, 130), (1880, 130), True)
    else:  # des toiles d'araignée dans les coins
        for x, y in ((700, 300), (1534, 260)):
            for a in range(0, 100, 22):
                u = math.radians(a)
                dessin.line(s, (90, 92, 100), (x, y), (x + 40 * math.cos(u), y + 40 * math.sin(u)), 1)
    return s


def frise_bricotine(fete):
    s = pygame.Surface((_z(160), _z(HAUT_FRISE)))
    s.fill(couleur(fete, (38, 40, 48), (104, 100, 96)))
    tuyau = couleur(fete, (70, 72, 80), (196, 198, 204))
    dessin.rect(s, tuyau, (0, 22, 160, 18), border_radius=9)       # la gaine de ventilation
    dessin.line(s, melange(tuyau, (255, 255, 255), 0.3), (0, 26), (160, 26), 2)
    dessin.rect(s, melange(tuyau, (0, 0, 0), 0.2), (60, 20, 8, 22))  # un collier
    dessin.rect(s, couleur(fete, (60, 40, 40), (200, 70, 60)), (0, 46, 160, 6))  # un câble rouge
    dessin.line(s, (60, 60, 66), (40, 52), (40, 66), 2)  # le néon pendu
    dessin.line(s, (60, 60, 66), (120, 52), (120, 66), 2)
    dessin.rect(s, (80, 80, 86), (24, 64, 112, 12), border_radius=4)
    dessin.rect(s, (255, 252, 230) if fete else (110, 112, 120), (28, 67, 104, 6), border_radius=3)
    return s


def tuiles_bricotine():
    plein = pygame.Surface((_z(T), _z(T)))
    plein.fill((112, 110, 108))
    dessin.rect(plein, (136, 134, 130), (0, 0, T, 4))
    dessin.rect(plein, (92, 90, 90), (0, T - 3, T, 3))
    dessin.circle(plein, (96, 94, 92), (T * 0.7, T * 0.6), 2)
    planche = pygame.Surface((_z(T), _z(14)), pygame.SRCALPHA)  # une étagère en pin
    dessin.rect(planche, (196, 156, 100), (0, 0, T, 14), border_radius=2)
    dessin.line(planche, (226, 190, 130), (2, 3), (T - 2, 3), 2)
    dessin.line(planche, (150, 110, 66), (T - 1, 0), (T - 1, 14), 2)
    return plein, planche


# --------------------------------------------------------------------------
# Le foyer : au rez, des boiseries en mélèze, le bar, les vitres sur la cour
# --------------------------------------------------------------------------

def cour_de_nuit(s, x, y, w, h, fete):
    """La cour du Bled vue par une grande vitre : l'aile d'en face, ses balcons, des pins
    (rien ne dépasse de la vitre)."""
    s.set_clip(pygame.Rect(_z(x), _z(y), _z(w), _z(h)))
    degrade_vertical(s, x, y, w, h, *(CIEL_FETE if fete else CIEL_NUIT))
    facade = couleur(fete, (52, 40, 32), (120, 82, 50))
    dessin.rect(s, facade, (x, y + 40, w, h - 40))
    des = random.Random(x)
    for k, yy in enumerate(range(y + 60, y + h - 20, 48)):
        dessin.rect(s, (150, 150, 150) if fete else (80, 80, 84), (x, yy + 30, w, 4))  # la dalle du balcon
        for xx in range(x + 10, x + w - 20, 40):
            allume = des.random() < (0.45 if fete else 0.15)
            dessin.rect(s, (255, 206, 120) if allume else (24, 26, 40), (xx, yy, 26, 26))
        for xx in range(x, x + w, 8):
            dessin.line(s, (110, 110, 116) if fete else (66, 66, 72), (xx, yy + 18), (xx, yy + 30), 1)
        for xx in range(x + 30, x + w, 90):  # les rideaux bleus
            dessin.rect(s, couleur(fete, (50, 66, 80), RIDEAU), (xx, yy - 6, 10, 36))
    for xx in range(x + 30, x + w, 150):  # des pins dans la cour
        dessin.polygon(s, couleur(fete, (14, 22, 20), (26, 50, 36)),
                       [(xx, y + h), (xx + 40, y + h - 150), (xx + 80, y + h)])
    s.set_clip(None)


def mur_foyer(fete):
    s = pygame.Surface((_z(MOTIF), _z(H)))
    bois = couleur(fete, (60, 44, 32), MELEZE)
    s.fill(bois)
    for x in range(0, MOTIF, 18):  # les lames verticales
        dessin.line(s, melange(bois, (0, 0, 0), 0.2), (x, 0), (x, H), 1)
    # deux grandes vitres sur la cour
    for x0 in (90, 1060):
        cour_de_nuit(s, x0, 170, 520, 400, fete)
        for x in range(x0, x0 + 521, 130):
            dessin.rect(s, (24, 24, 28), (x - 4, 166, 8, 410))
        dessin.rect(s, (24, 24, 28), (x0 - 4, 166, 528, 8))
        dessin.rect(s, (24, 24, 28), (x0 - 4, 568, 528, 8))
        if fete:
            guirlande_lumineuse(s, (x0, 190), (x0 + 520, 190), True, creux=40)
    # le bar
    sombre = melange(bois, (0, 0, 0), 0.35)
    dessin.rect(s, sombre, (660, 300, 360, 14))  # l'étagère du bar et ses verres
    for k, x in enumerate(range(676, 1010, 26)):
        bouteille = couleur(fete, (40, 50, 50), FESTIF[k % 5])
        dessin.rect(s, bouteille, (x, 262, 12, 38), border_radius=3)
        dessin.rect(s, bouteille, (x + 3, 250, 6, 14))
    dessin.rect(s, sombre, (660, 400, 360, 14))
    for x in range(676, 1010, 30):
        dessin.rect(s, couleur(fete, (90, 96, 110), (220, 230, 240)), (x, 374, 14, 26), border_radius=2)
    dessin.rect(s, couleur(fete, (70, 70, 80), (180, 184, 196)), (900, 430, 80, 70), border_radius=6)  # la machine à café
    dessin.rect(s, (30, 30, 34), (920, 470, 40, 16))
    dessin.rect(s, couleur(fete, (40, 30, 24), (100, 68, 40)), (640, 520, 400, 20))  # le comptoir
    dessin.rect(s, melange(bois, (0, 0, 0), 0.15), (650, 540, 380, 140))
    for x in range(660, 1030, 40):
        dessin.line(s, melange(bois, (0, 0, 0), 0.3), (x, 540), (x, 680), 2)
    if fete:
        for x in (700, 820, 960):
            citrouille(s, x, 520, 16, True)
    # la bibliothèque, pleine de livres
    etagere = melange(bois, (0, 0, 0), 0.3)
    dessin.rect(s, etagere, (1610, 200, 170, 480))
    des = random.Random(8)
    for y in range(214, 660, 92):
        dessin.rect(s, melange(etagere, (0, 0, 0), 0.3), (1622, y, 146, 78))
        x = 1624
        while x < 1760:
            w, h = des.uniform(8, 16), des.uniform(48, 74)
            c = FESTIF[des.randrange(5)] if fete else melange(FESTIF[des.randrange(5)], (30, 26, 34), 0.75)
            if x + w > 1766:
                break
            dessin.rect(s, c, (x, y + 78 - h, w, h), border_radius=1)
            x += w + 2
        dessin.rect(s, etagere, (1610, y + 78, 170, 8))
    # le canapé, avec ses coussins
    tissu = couleur(fete, (40, 50, 70), (70, 110, 170))
    dessin.rect(s, tissu, (1800, 560, 120, 70), border_radius=14)            # le dossier
    dessin.rect(s, melange(tissu, (255, 255, 255), 0.1), (1800, 610, 120, 50), border_radius=10)  # l'assise
    for x in (1792, 1906):
        dessin.rect(s, melange(tissu, (0, 0, 0), 0.2), (x, 590, 22, 70), border_radius=10)  # les accoudoirs
    for x in (1830, 1874):
        dessin.rect(s, couleur(fete, (60, 50, 60), FESTIF[(x // 44) % 5]), (x, 580, 30, 30), border_radius=8)
    dessin.rect(s, melange(bois, (0, 0, 0), 0.4), (1806, 660, 8, 20))
    dessin.rect(s, melange(bois, (0, 0, 0), 0.4), (1906, 660, 8, 20))
    if fete:
        citrouille(s, 1700, 200, 14, True)
    if not fete:
        fanions(s, (660, 140), (1020, 140), False, n=6)
    else:
        fanions(s, (640, 130), (1040, 130), True, n=8)
    return s


def frise_foyer(fete):
    s = pygame.Surface((_z(160), _z(HAUT_FRISE)))
    bois = couleur(fete, (44, 32, 24), (140, 96, 54))
    s.fill(melange(bois, (0, 0, 0), 0.3))
    for x in range(0, 160, 20):  # le plafond à lattes
        dessin.rect(s, bois, (x + 2, 0, 14, 60))
    dessin.rect(s, melange(bois, (0, 0, 0), 0.15), (0, 58, 160, 12))
    dessin.line(s, (30, 26, 24), (80, 70), (80, 80), 2)  # le fil d'une suspension
    return s


def tuiles_foyer():
    plein = pygame.Surface((_z(T), _z(T)))
    plein.fill((150, 142, 130))  # le béton ciré
    dessin.rect(plein, (176, 168, 156), (0, 0, T, 4))
    dessin.line(plein, (128, 120, 110), (0, T - 1), (T, T - 1), 2)
    planche = pygame.Surface((_z(T), _z(14)), pygame.SRCALPHA)  # une planche de mélèze
    dessin.rect(planche, (186, 128, 70), (0, 0, T, 14), border_radius=2)
    dessin.line(planche, (214, 160, 96), (2, 3), (T - 2, 3), 2)
    dessin.line(planche, (130, 86, 46), (T - 1, 0), (T - 1, 14), 2)
    return plein, planche


# --------------------------------------------------------------------------
# La Tanière : la salle polyvalente (murs noirs, rideaux, grand écran, gradins)
# --------------------------------------------------------------------------

def mur_taniere(fete):
    s = pygame.Surface((_z(MOTIF), _z(H)))
    noir = couleur(fete, (18, 18, 22), (40, 32, 52))
    s.fill(noir)
    # les rideaux noirs, à plis
    for x in range(0, 760, 24):
        dessin.rect(s, melange(noir, (255, 255, 255), 0.06), (x, 100, 12, 580))
        dessin.line(s, melange(noir, (0, 0, 0), 0.4), (x + 23, 100), (x + 23, 680), 2)
    dessin.rect(s, melange(noir, (255, 255, 255), 0.12), (0, 96, 760, 6))  # le rail
    # les faisceaux des projecteurs (en fête)
    if fete:
        for k, (x, y) in enumerate(((300, 0), (980, 0), (1500, 0))):
            c = melange(noir, FESTIF[k + 1], 0.22)
            dessin.polygon(s, c, [(x - 10, y), (x + 10, y), (x + 200, 680), (x - 160, 680)])
    # le grand écran
    dessin.rect(s, (12, 12, 14), (856, 150, 12, 30))
    dessin.rect(s, (12, 12, 14), (1352, 150, 12, 30))
    ecran = couleur(fete, (70, 72, 80), (240, 236, 226))
    dessin.rect(s, ecran, (820, 176, 580, 330))
    if fete:  # le film : une fête de citrouilles sous la lune
        dessin.rect(s, (60, 30, 90), (840, 196, 540, 290))
        dessin.circle(s, (255, 220, 120), (1300, 250), 34)
        for k, x in enumerate(range(900, 1340, 90)):
            citrouille(s, x, 470, 20 + 6 * (k % 2), True)
        fanions(s, (850, 220), (1250, 220), True, creux=30, n=8)
    else:  # un vieux film en noir et blanc : des immeubles inquiétants
        dessin.rect(s, (40, 40, 44), (840, 196, 540, 290))
        for k, x in enumerate(range(860, 1380, 60)):
            h = 120 + (k * 53) % 140
            dessin.rect(s, (66, 66, 72), (x, 486 - h, 46, h))
            for yy in range(486 - h + 10, 480, 22):
                dessin.rect(s, (110, 110, 116), (x + 8, yy, 8, 10))
        dessin.polygon(s, (80, 80, 86), [(1110, 196), (1130, 196), (1240, 486), (980, 486)])
    # la porte de la loge, entrouverte sur un coin éclairé
    dessin.rect(s, (12, 12, 14), (1560, 440, 150, 240))
    dessin.rect(s, couleur(fete, (90, 70, 46), (220, 170, 100)), (1590, 456, 70, 224))
    dessin.rect(s, (24, 24, 28), (1660, 446, 46, 234))
    # le panneau « sortie »
    dessin.rect(s, couleur(fete, (20, 90, 50), (40, 200, 110)), (1605, 404, 60, 30), border_radius=3)
    dessin.polygon(s, (240, 255, 240), [(1619, 419), (1635, 411), (1635, 427)])
    dessin.rect(s, (240, 255, 240), (1635, 416, 18, 6))
    return s


def frise_taniere(fete):
    s = pygame.Surface((_z(160), _z(HAUT_FRISE)))
    s.fill((16, 16, 20))
    for y in (14, 44):  # les grilles des projecteurs
        dessin.rect(s, (40, 40, 46), (0, y, 160, 5))
    for x in (0, 80):
        dessin.rect(s, (40, 40, 46), (x + 36, 0, 5, 60))
    for k, x in enumerate((20, 100)):  # deux projecteurs
        dessin.rect(s, (30, 30, 34), (x - 10, 50, 24, 20), border_radius=4)
        dessin.line(s, (40, 40, 46), (x + 2, 48), (x + 2, 44), 3)
        lentille = FESTIF[(k * 2 + 1) % 5] if fete else (50, 50, 56)
        dessin.circle(s, lentille, (x + 2, 70), 7)
    if fete:  # une boule à facettes
        dessin.line(s, (60, 60, 66), (140, 0), (140, 52), 1)
        dessin.circle(s, (210, 210, 220), (140, 62), 10)
        for a in range(0, 360, 60):
            u = math.radians(a)
            dessin.circle(s, (255, 255, 255), (140 + 6 * math.cos(u), 62 + 6 * math.sin(u)), 1)
    return s


def tuiles_taniere():
    plein = pygame.Surface((_z(T), _z(T)))
    plein.fill((34, 34, 40))  # une estrade noire
    dessin.rect(plein, (76, 74, 84), (0, 0, T, 4))
    dessin.line(plein, (24, 24, 28), (0, T / 2), (T, T / 2), 1)
    planche = pygame.Surface((_z(T), _z(14)), pygame.SRCALPHA)  # un praticable de scène
    dessin.rect(planche, (46, 46, 54), (0, 0, T, 14), border_radius=2)
    dessin.line(planche, (110, 108, 120), (1, 2), (T - 1, 2), 2)
    dessin.line(planche, (20, 20, 24), (T - 1, 0), (T - 1, 14), 2)
    return plein, planche


# --------------------------------------------------------------------------
# La terrasse du 5e : dehors, la pergola, le potager, le lac et les Alpes
# --------------------------------------------------------------------------

ALPES = [(0, 470), (90, 430), (170, 452), (260, 392), (330, 430), (420, 372), (500, 418), (600, 384),
         (700, 440), (790, 400), (880, 446), (980, 380), (1060, 424), (1160, 396), (1250, 448),
         (1340, 408), (1440, 440), (1520, 388), (1620, 430), (1720, 404), (1820, 446), (1920, 470)]


def montagnes(s, sommets, bas, fete, decalage=0):
    """Une chaîne de montagnes : un versant éclairé, un versant à l'ombre, et de la
    neige accrochée aux sommets, qui descend en dents dans les creux."""
    clair = couleur(fete, (52, 54, 84), (110, 84, 140))
    ombre = melange(clair, (0, 0, 0), 0.35)
    dessin.polygon(s, ombre, [(x + decalage, y) for x, y in sommets] + [(sommets[-1][0] + decalage, bas),
                                                                         (sommets[0][0] + decalage, bas)])
    neige = couleur(fete, (176, 182, 206), (246, 232, 246))
    neige_ombre = melange(neige, (60, 60, 100), 0.35)
    for (xa, ya), (xb, yb), (xc, yc) in zip(sommets, sommets[1:], sommets[2:]):
        if not (yb < ya and yb < yc):
            continue
        xa, xb, xc = xa + decalage, xb + decalage, xc + decalage
        # le versant de gauche, au soleil (ou à la lune)
        dessin.polygon(s, clair, [(xb, yb), (xa, ya), (xa + (xb - xa) * 0.15, bas), (xb, bas)])
        h = min(ya, yc) - yb
        u = min(0.55, 34 / max(h, 1))  # la neige couvre le haut du sommet
        g = (xb + (xa - xb) * u, yb + (ya - yb) * u)
        d = (xb + (xc - xb) * u, yb + (yc - yb) * u)
        bas_neige = yb + h * u
        dents = [g]
        for k in range(1, 6):  # le bord de la neige, en dents
            x = g[0] + (d[0] - g[0]) * k / 6
            dents.append((x, bas_neige + (6 if k % 2 else -2)))
        dents.append(d)
        dessin.polygon(s, neige_ombre, [(xb, yb)] + dents)
        dessin.polygon(s, neige, [(xb, yb)] + dents[:4] + [(xb, dents[3][1])])


def facade_du_bled(s, x, y, w, h, fete, etage=118):
    """Un morceau de la façade côté cour, vu de près : mélèze, grandes portes vitrées,
    balcons filants, rideaux bleus."""
    bois = couleur(fete, (56, 42, 30), MELEZE)
    dessin.rect(s, bois, (x, y, w, h))
    for xx in range(x, x + w, 10):
        dessin.line(s, melange(bois, (0, 0, 0), 0.2), (xx, y), (xx, y + h), 1)
    des = random.Random(x + y)
    for yy in range(y + etage, y + h + 1, etage):
        for xx in range(x + 24, x + w - 60, 150):
            allume = des.random() < (0.75 if fete else 0.2)
            dessin.rect(s, (255, 206, 120) if allume else (24, 26, 40), (xx, yy - etage + 14, 70, etage - 26))
            dessin.line(s, (40, 40, 50), (xx + 35, yy - etage + 14), (xx + 35, yy - 12), 2)
        dessin.rect(s, couleur(fete, (110, 112, 118), (226, 228, 230)), (x - 16, yy - 10, w + 32, 10))
        for xx in range(x - 16, x + w + 16, 10):
            dessin.line(s, couleur(fete, (86, 88, 94), (236, 238, 240)), (xx, yy - 46), (xx, yy - 10), 2)
        dessin.line(s, couleur(fete, (86, 88, 94), (236, 238, 240)), (x - 16, yy - 46), (x + w + 16, yy - 46), 3)
        for xx in range(x + 100, x + w - 10, 150):
            dessin.rect(s, couleur(fete, (48, 62, 78), RIDEAU), (xx, yy - etage + 6, 22, etage - 16))
        if fete:
            guirlande_lumineuse(s, (x - 10, yy - etage + 8), (x + w + 10, yy - etage + 8), True, creux=12, n=8)


def mur_terrasse(fete):
    s = pygame.Surface((_z(MOTIF), _z(H)))
    haut, bas = CIEL_FETE if fete else CIEL_NUIT
    degrade_vertical(s, 0, 0, MOTIF, H, haut, bas)
    des = random.Random(11)
    for _ in range(90):
        dessin.circle(s, (230, 230, 250) if fete else (150, 150, 180), (des.uniform(0, MOTIF), des.uniform(80, 360)),
                      des.choice((1, 1, 2)))
    dessin.circle(s, (210, 210, 196) if not fete else (255, 226, 150), (700, 190), 30)  # la lune
    dessin.circle(s, haut, (714, 180), 26)
    # les Alpes, le lac et les lumières de la ville
    montagnes(s, ALPES, 520, fete)
    lac = couleur(fete, (14, 18, 40), (50, 40, 100))
    dessin.rect(s, lac, (0, 470, MOTIF, 50))
    for _ in range(40):
        x = des.uniform(0, MOTIF)
        y = des.uniform(478, 512)
        dessin.line(s, melange(lac, (255, 255, 255), 0.25), (x, y), (x + 20, y), 1)
    dessin.rect(s, couleur(fete, (16, 16, 22), (40, 30, 50)), (0, 520, MOTIF, 160))
    for _ in range(160 if fete else 70):
        dessin.circle(s, (255, 200, 110), (des.uniform(0, MOTIF), des.uniform(526, 590)), 1)
    # un morceau de l'aile haute du Bled, avec ses balcons filants
    facade_du_bled(s, 1420, 80, 470, 600, fete)
    # la balustrade blanche, au bord de la terrasse
    blanc = couleur(fete, (90, 92, 100), (236, 238, 240))
    dessin.rect(s, blanc, (0, 590, MOTIF, 5))
    for x in range(0, MOTIF, 12):
        dessin.line(s, blanc, (x, 594), (x, 680), 2)
    # les bacs du potager
    caisse = couleur(fete, (74, 64, 52), (170, 150, 120))
    for x in (220, 860, 1180):
        dessin.rect(s, caisse, (x, 600, 200, 80))
        for y in (620, 650):
            dessin.line(s, melange(caisse, (0, 0, 0), 0.25), (x, y), (x + 200, y), 2)
        for k in range(6):  # des plantes : fanées, ou fleuries
            px = x + 20 + k * 32
            tige = couleur(fete, (70, 60, 40), (70, 150, 70))
            dessin.line(s, tige, (px, 600), (px + (6 if not fete else 0), 540 + (k % 2) * 16), 3)
            if fete:
                dessin.circle(s, FESTIF[k % 5], (px, 540 + (k % 2) * 16), 9)
                dessin.circle(s, OR, (px, 540 + (k % 2) * 16), 3)
            else:
                dessin.line(s, tige, (px + 6, 556), (px + 18, 566), 2)
        citrouille(s, x + 100, 600, 20, fete)
    return s



def frise_terrasse(fete):
    """Le ciel, tout en haut : des étoiles (et une guirlande quand c'est la fête)."""
    s = pygame.Surface((_z(160), _z(HAUT_FRISE)))
    s.fill((CIEL_FETE if fete else CIEL_NUIT)[0])
    for x, y in ((20, 14), (70, 40), (118, 22), (146, 58), (44, 66)):
        dessin.circle(s, (220, 220, 250), (x, y), 1)
    if fete:
        guirlande_lumineuse(s, (0, 50), (160, 50), True, creux=10, n=6)
    return s


def tuiles_terrasse():
    plein = pygame.Surface((_z(T), _z(T)))
    plein.fill((130, 112, 92))  # le platelage en bois
    for y in (0, 13, 26):
        dessin.line(plein, (100, 84, 68), (0, y), (T, y), 2)
    dessin.rect(plein, (156, 136, 112), (0, 0, T, 3))
    planche = pygame.Surface((_z(T), _z(14)), pygame.SRCALPHA)  # le bord d'un bac en bois
    dessin.rect(planche, (166, 146, 116), (0, 0, T, 14), border_radius=2)
    dessin.line(planche, (196, 176, 146), (2, 3), (T - 2, 3), 2)
    dessin.line(planche, (120, 104, 80), (T - 1, 0), (T - 1, 14), 2)
    return plein, planche


# --------------------------------------------------------------------------
# Les meubles sur lesquels on peut monter (lettre = du plan) : l'établi de la Bricotine,
# une table, la pergola de la terrasse. Dessinés à l'écran, entre x0 et x1, dessus en y.
# --------------------------------------------------------------------------

def dessiner_meuble(nom, e, x0, x1, y, sol, fete):
    if nom == "bricotine":  # l'établi : un plateau épais, des pieds, une étagère dessous, un étau
        bois = (150, 104, 62)
        dessin.rect(e, bois, (x0, y, x1 - x0, 16))
        dessin.line(e, (186, 138, 88), (x0, y + 2), (x1, y + 2), 2)
        for x in (x0 + 6, x1 - 18):
            dessin.rect(e, (110, 74, 44), (x, y + 16, 12, sol - y - 16))
        dessin.rect(e, (110, 74, 44), (x0 + 6, sol - 30, x1 - x0 - 12, 8))
        for k, x in enumerate(range(int(x0) + 26, int(x1) - 40, 34)):  # des caisses à outils
            dessin.rect(e, ((200, 60, 50), (60, 120, 200))[k % 2], (x, sol - 52, 28, 22), border_radius=3)
        dessin.rect(e, (90, 92, 100), (x1 - 34, y - 12, 26, 12), border_radius=2)  # l'étau
        dessin.line(e, (150, 150, 160), (x1 - 40, y - 6), (x1 - 2, y - 6), 2)
    elif nom == "terrasse":  # la pergola : une poutre, des chevrons, des poteaux, des fanions
        bois = (190, 144, 88) if fete else (120, 92, 60)
        for x in (x0 + 4, x1 - 16):
            dessin.rect(e, melange(bois, (0, 0, 0), 0.15), (x, y + 14, 12, sol - y - 14))
        for x in range(int(x0), int(x1), 20):
            dessin.rect(e, melange(bois, (0, 0, 0), 0.25), (x + 6, y - 10, 8, 12))
        dessin.rect(e, bois, (x0 - 10, y, x1 - x0 + 20, 14))
        dessin.line(e, melange(bois, (255, 255, 255), 0.25), (x0 - 10, y + 2), (x1 + 10, y + 2), 2)
        fanions(e, (x0 + 12, y + 16), (x1 - 12, y + 16), fete, creux=14, n=max(3, int((x1 - x0) // 34)))
    else:  # une table
        dessus = (60, 56, 70) if nom == "taniere" else (150, 104, 62)
        dessin.rect(e, dessus, (x0, y, x1 - x0, 12), border_radius=3)
        dessin.line(e, melange(dessus, (255, 255, 255), 0.25), (x0 + 3, y + 2), (x1 - 3, y + 2), 2)
        for x in (x0 + 8, x1 - 16):
            dessin.rect(e, melange(dessus, (0, 0, 0), 0.3), (x, y + 12, 8, sol - y - 12))


MURS = {"bricotine": mur_bricotine, "foyer": mur_foyer, "taniere": mur_taniere, "terrasse": mur_terrasse}
FRISES = {"bricotine": frise_bricotine, "foyer": frise_foyer, "taniere": frise_taniere, "terrasse": frise_terrasse}
TUILES = {"bricotine": tuiles_bricotine, "foyer": tuiles_foyer, "taniere": tuiles_taniere, "terrasse": tuiles_terrasse}
_cache = {}


def decor(nom):
    """(murs lugubre et en fête, frises lugubre et en fête, tuiles plein et planche),
    fabriqués une seule fois par décor."""
    if nom not in _cache:
        _cache[nom] = ((MURS[nom](False), MURS[nom](True)), (FRISES[nom](False), FRISES[nom](True)),
                       TUILES[nom]())
    return _cache[nom]
