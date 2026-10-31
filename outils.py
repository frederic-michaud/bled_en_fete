"""Les outils de dessin communs : taille de l'écran, couleurs, dessin agrandi pour les
écrans Retina, texte, et images (des SVG fabriqués par animations.py)."""
import io

import manettes  # noqa: F401  (règle les options SDL des manettes avant pygame)
import pygame

import animations

L, H = 1280, 720            # taille de l'écran de jeu
DT = 1 / 60                 # 60 images par seconde
T = 40                      # taille d'une tuile des salles
# Tout le jeu est pensé sur un écran de 1280 x 720, mais dessiné ZOOM fois plus fin
# pour rester net sur les écrans haute définition (Retina).
ZOOM = 2

BLANC, NOIR, OR = (255, 255, 255), (20, 20, 30), (255, 206, 60)
ORANGE, VIOLET, ROSE, VERT = (255, 138, 30), (155, 77, 255), (255, 90, 160), (76, 217, 100)
FESTIF = [ORANGE, VIOLET, ROSE, VERT, OR]

# Taille d'affichage de chaque image, en pixels du jeu (les dessins sont dans animations.py).
TAILLES = {
    "vampire": (54, 64), "vampire_marche": (54, 64), "vampire_saut": (54, 64),
    "vampirette": (54, 64), "vampirette_marche": (54, 64), "vampirette_saut": (54, 64),
    "parent": (54, 64), "parent_marche": (54, 64), "parent_saut": (54, 64),
    "petit": (41, 48), "petit_marche": (41, 48), "petit_saut": (41, 48),
    "courge": (56, 56), "soupe": (60, 68),
    "squelette": (40, 60), "squelette_danse": (40, 60), "squelette_tas": (44, 33),
    "fantome_peur": (60, 60), "fantome_gentil": (56, 56),
    "chauve_souris": (56, 42), "ballon": (42, 56),
    "toile": (60, 60), "guirlande": (72, 72),
    "chandelier_eteint": (64, 64), "chandelier_allume": (64, 68),
    "neon_eteint": (64, 64), "neon_allume": (64, 64), "suspension_eteinte": (64, 64),
    "suspension_allumee": (64, 64), "projecteur_eteint": (64, 64), "projecteur_allume": (64, 64),
    "lampion_eteint": (64, 64), "lampion_allume": (64, 64),
    "corbeau_vol": (86, 67), "corbeau_picore": (86, 67), "corbeau_ricane": (86, 67),
    "couteau": (33, 12), "bonbon": (36, 24),
}

_images = {}
_polices = {}


def _z(v):
    return round(v * ZOOM)


class dessin:
    """Comme pygame.draw, mais en coordonnées du jeu (agrandies ZOOM fois)."""

    @staticmethod
    def rect(surf, couleur, r, width=0, border_radius=0):
        x, y, w, h = r
        pygame.draw.rect(surf, couleur, (_z(x), _z(y), _z(w), _z(h)), width * ZOOM,
                         border_radius=border_radius * ZOOM)

    @staticmethod
    def circle(surf, couleur, centre, rayon, width=0):
        pygame.draw.aacircle(surf, couleur, (_z(centre[0]), _z(centre[1])),
                             rayon * ZOOM, width * ZOOM)

    @staticmethod
    def ellipse(surf, couleur, r, width=0):
        x, y, w, h = r
        pygame.draw.ellipse(surf, couleur, (_z(x), _z(y), _z(w), _z(h)), width * ZOOM)

    @staticmethod
    def line(surf, couleur, a, b, width=1):
        pygame.draw.line(surf, couleur, (_z(a[0]), _z(a[1])), (_z(b[0]), _z(b[1])),
                         width * ZOOM)

    @staticmethod
    def polygon(surf, couleur, points):
        pts = [(_z(x), _z(y)) for x, y in points]
        pygame.draw.polygon(surf, couleur, pts)
        pygame.draw.aalines(surf, couleur, True, pts)


def police(taille):
    if taille not in _polices:
        _polices[taille] = pygame.font.Font(None, taille * ZOOM)
    return _polices[taille]


def ecrire(surf, msg, taille, couleur, centre=None, gauche=None, ombre=NOIR):
    f = police(taille)
    img = f.render(msg, True, couleur)
    r = img.get_rect()
    if centre:
        r.center = (_z(centre[0]), _z(centre[1]))
    else:
        r.topleft = (_z(gauche[0]), _z(gauche[1]))
    if ombre is not None:
        surf.blit(f.render(msg, True, ombre), r.move(ZOOM + 1, ZOOM + 1))
    surf.blit(img, r)
    return r


def envelopper(texte, taille, largeur):
    """Coupe texte en lignes qui tiennent dans largeur (pixels du jeu)."""
    f, lignes, ligne = police(taille), [], ""
    for mot in texte.split():
        essai = (ligne + " " + mot).strip()
        if f.size(essai)[0] > largeur * ZOOM and ligne:
            lignes.append(ligne)
            ligne = mot
        else:
            ligne = essai
    return lignes + [ligne]


def degrade(taille, haut, bas):
    w, h = _z(taille[0]), _z(taille[1])
    s = pygame.Surface((w, h))
    for y in range(h):
        u = y / h
        s.fill([haut[i] + (bas[i] - haut[i]) * u for i in range(3)], (0, y, w, 1))
    return s


def melange(a, b, u):
    return tuple(round(a[i] + (b[i] - a[i]) * u) for i in range(3))


def image(nom, gauche=False):
    """Image à sa taille d'affichage (retournée si gauche). « squelette@3 » : image
    n° 3 du dessin animé du squelette (voir anime)."""
    cle = (nom, gauche)
    if cle not in _images:
        if gauche:
            _images[cle] = pygame.transform.flip(image(nom), True, False)
        else:
            base, _, k = nom.partition("@")
            fabrique, n, _ = animations.ANIMES[base]
            w, h = TAILLES[base]
            svg = io.BytesIO(fabrique(int(k or 0) / n).encode())
            _images[cle] = pygame.image.load_sized_svg(svg, (w * ZOOM, h * ZOOM))
    return _images[cle]


def anime(nom, t):
    """Nom de l'image du dessin animé nom à l'instant t (secondes)."""
    _, n, vitesse = animations.ANIMES[nom]
    return f"{nom}@{int(t * vitesse * n) % n}"


def preparer_images():
    """Fabrique toutes les images d'avance (sinon le jeu hoquetterait en cours de partie)."""
    for nom, (_, n, _) in animations.ANIMES.items():
        for k in range(n):
            image(f"{nom}@{k}")


def poser(surf, nom, cx, cy, gauche=False, angle=0.0, echelle=1.0, alpha=255):
    """Dessine l'image nom centrée sur (cx, cy), coordonnées de l'écran de jeu."""
    im = image(nom, gauche)
    if angle or echelle != 1.0:
        im = pygame.transform.rotozoom(im, angle, echelle)
    if alpha < 255:
        im = im.copy()
        im.set_alpha(alpha)
    surf.blit(im, im.get_rect(center=(_z(cx), _z(cy))))
