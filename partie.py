"""Une salle du Bled : le vampire (ou les deux personnages, à deux), les créatures à
transformer, les bonbons, le corbeau grognon, et le dessin de la salle (avec sa lumière
qui change avec la fête)."""
import math
import random

import pygame

import decors
import manettes
from niveaux import AU_SOL, BOUTONS, GENRES, NIVEAUX, PAS_DE_BONBON, RANGS
from outils import (BLANC, DT, FESTIF, H, L, OR, ORANGE, ROSE, T, TAILLES, ZOOM, _z, anime,
                    dessin, ecrire, envelopper, melange, police, poser)

GRAVITE = 2200.0
SAUT = 760.0                # environ 3 tuiles de haut
VITESSE = 280.0
ACC_SOL, ACC_AIR = 2600.0, 1700.0
CHUTE_MAX = 900.0
COYOTE, TAMPON = 0.10, 0.12
SAUT_COURT = 300.0          # on lâche le bouton en montant : le saut s'arrête plus tôt
REBOND, REBOND_HAUT = 520.0, 760.0     # rebond sur une créature (bouton tenu : plus haut)
RECUL_VX, RECUL_VY, DUREE_RECUL = 380.0, 420.0, 0.3
INVINCIBLE = 1.2
VITESSE_BONBON, PORTEE_BONBON, RECHARGE_BONBON = 560.0, 650, 0.45   # bonbons lancés
POCHE_MAX = 5                           # bonbons en poche, au plus
RETOUR_BONBON = 20.0                    # un bonbon mangé repousse au bout de 20 s
DUREE_TAS = 4.0                         # le squelette reste en tas d'os, puis se relève
CORBEAU_PICORE = 1.5                    # le corbeau picore 1,5 s avant de défaire
CORBEAU_PERCHE = 120                    # il ne se pose jamais plus haut (y), pour qu'on l'attrape
CORBEAU_REPOS = 3.0                     # puis il se pose et ricane 3 s avant la suivante
DUREE_COUPE = 0.7                       # couper la courge en morceaux
COUPS = (0.5, 0.3, 0.1)                 # instants des coups de couteau (temps restant)
PLAFOND = 2                             # rangées du haut : la frise (rien ne s'y passe)
HAUT_FRISE = PLAFOND * T
# À deux : on ne peut pas s'éloigner au point que l'autre sorte de l'écran.
ECART_MAX = L - 200
# Parent et enfant : la laisse magique, élastique. Plus loin que LAISSE, elle s'étire et
# ramène l'enfant d'autant plus fort qu'elle est tirée (ELASTIQUE) ; s'il n'arrive pas à
# suivre (TIRE_MAX s) ou s'il est trop loin, il s'envole vers le parent.
LAISSE, LAISSE_MAX, TIRE_MAX, VOL_ENFANT = 380.0, 620.0, 1.2, 900.0
ELASTIQUE, RAPPEL_MAX = 3.5, 500.0      # vitesse de rappel par pixel d'étirement, et au plus
# les personnages de chaque façon de jouer : (dessin, taille de leur corps)
PERSONNAGES = {"solo": [("vampire", (26, 52))],
               "duo": [("vampire", (26, 52)), ("vampirette", (26, 52))],
               "parent": [("parent", (26, 52)), ("petit", (22, 42))]}

# --------------------------------------------------------------------------
# Décor
# --------------------------------------------------------------------------

_voiles = []
RAYON_HALO = 200


def voiles():
    """La nuit (un voile sombre), le bord de l'écran assombri et le halo de lumière autour
    du vampire, faits une fois pour toutes."""
    if not _voiles:
        nuit = pygame.Surface((L * ZOOM, H * ZOOM))
        nuit.fill((6, 4, 20))
        petit = pygame.Surface((160, 90), pygame.SRCALPHA)
        for y in range(90):
            for x in range(160):
                d = math.hypot((x - 80) / 80, (y - 45) / 45)
                a = max(0.0, min(1.0, (d - 0.45) / 0.6))
                petit.set_at((x, y), (0, 0, 0, round(190 * a * a)))
        halo = pygame.Surface((64, 64))
        for y in range(64):
            for x in range(64):
                a = max(0.0, 1 - math.hypot(x - 31.5, y - 31.5) / 32) ** 2
                halo.set_at((x, y), (round(46 * a), round(38 * a), round(56 * a)))
        _voiles.extend((nuit, pygame.transform.smoothscale(petit, (L * ZOOM, H * ZOOM)),
                        pygame.transform.smoothscale(halo, (_z(RAYON_HALO * 2), _z(RAYON_HALO * 2)))))
    return _voiles


# --------------------------------------------------------------------------
# Les choses du Bled
# --------------------------------------------------------------------------

class Chose:
    """Une créature ou un objet qui attend d'être transformé en version fête."""

    def __init__(self, partie, genre, x, y):
        self.p, self.genre = partie, genre
        self.peur, self.fete, self.regle, self.message = GENRES[genre]
        # chaque salle a ses propres lampes (néon, suspension, projecteur, lampion)
        self.peur, self.fete = partie.niveau.get("objets", {}).get(genre, (self.peur, self.fete))
        self.w, self.h = TAILLES[self.peur]
        if genre in AU_SOL:
            y -= self.h / 2       # y donné = le sol ; on garde le centre
        self.x0, self.y0 = self.x, self.y = x, y
        self.fetee = False
        self.t = random.uniform(0, 6)
        self.dir = random.choice((-1, 1))
        self.pop = 0.0            # petite animation juste après la transformation
        self.bouh = 0.0           # il vient de faire peur au vampire
        self.tas = 0.0            # squelette effondré : temps avant qu'il se relève

    def rect(self):
        return pygame.FRect(self.x - self.w / 2 + 6, self.y - self.h / 2 + 6,
                            self.w - 12, self.h - 12)

    def maj(self):
        self.t += DT
        self.pop = max(0.0, self.pop - DT)
        self.bouh = max(0.0, self.bouh - DT)
        g = self.genre
        if self.tas > 0:
            self.tas -= DT
            if self.tas <= 0:  # il se relève
                self.changer_taille(self.peur)
        elif g == "s" and self.fetee:
            # il danse en se balançant, et il chante : des notes de musique s'envolent
            self.x = self.x0 + 10 * math.sin(self.t * 1.3)
            if random.random() < 1.5 * DT:
                self.p.notes.append([self.x + random.uniform(-12, 12), self.y - self.h / 2,
                                     random.uniform(0, 6), 1.8, random.choice(FESTIF)])
        elif g == "s":
            # il fait les cent pas, demi-tour devant un mur ou au bord du vide
            nx = self.x + self.dir * 60 * DT
            devant = nx + self.dir * self.w / 2
            pied = self.y + self.h / 2 + 2
            if self.p.plein(devant, self.y) or not self.p.porte(devant, pied):
                self.dir = -self.dir
            else:
                self.x = nx
        elif g == "f":
            ampleur = 20 if self.fetee else 70
            self.x = self.x0 + ampleur * math.sin(self.t * 0.7)
            self.y = self.y0 + 10 * math.sin(self.t * 2.1)
            self.dir = 1 if math.cos(self.t * 0.7) > 0 else -1
        elif g == "b":
            if self.fetee:
                self.y = self.y0 + 8 * math.sin(self.t * 1.5)
            else:
                self.x = self.x0 + 70 * math.cos(self.t * 1.6)
                self.y = self.y0 + 30 * math.sin(self.t * 3.2)

    def accroche(self):
        """Le y où pend la lampe : le dessous de ce qui est juste au-dessus d'elle."""
        c, r = int(self.x0 // T), int((self.y0 - self.h / 2) // T)
        while r > 0 and self.p.tuile(c, r) not in "#-=":
            r -= 1
        t = self.p.tuile(c, r)
        return (r + 1) * T if t == "#" else r * T + 14

    def changer_taille(self, nom):
        """Prend la taille de l'image nom (les choses posées restent sur le sol)."""
        bas = self.y + self.h / 2
        self.w, self.h = TAILLES[nom]
        if self.genre in AU_SOL:
            self.y = bas - self.h / 2

    def effondrer(self):
        """Premier saut sur le squelette : il tombe en tas d'os."""
        self.tas = DUREE_TAS
        self.changer_taille("squelette_tas")
        self.p.dire("Encore un saut !", self.x, self.y - 40)
        self.p.son("crac")

    def defaire(self):
        """Le corbeau grognon remet la chose en version effrayante."""
        if not self.fetee:
            return
        self.fetee, self.pop = False, 0.5
        self.p.flash = 1.5
        self.changer_taille(self.peur)
        for _ in range(20):
            a, v = random.uniform(0, math.tau), random.uniform(60, 200)
            self.p.particules.append([self.x, self.y, math.cos(a) * v, math.sin(a) * v - 80,
                                      random.uniform(0.5, 0.9), (60, 60, 70)])
        self.p.dire("Oh non !", self.x, self.y - self.h / 2 - 10)

    def transformer(self):
        if self.fetee:
            return False
        self.fetee, self.tas = True, 0.0
        self.pop = 0.5
        self.changer_taille(self.fete)
        self.x0, self.y0 = self.x, self.y
        self.p.eclats(self.x, self.y, 26)
        self.p.dire(self.message, self.x, self.y - self.h / 2 - 10)
        self.p.son("magie")
        return True

    def dessiner(self, surf, cx):
        x, y = self.x - cx, self.y
        if x < -100 or x > L + 100:
            return
        echelle = 1.0 + 0.35 * math.sin(self.pop / 0.5 * math.pi)
        angle, nom, gauche = 0.0, (self.fete if self.fetee else self.peur), self.dir < 0
        if self.genre == "l":  # le fil de la lampe (deux pour un néon), du plafond ou du meuble au-dessus
            for dx in ((-40, 40) if self.peur.startswith("neon") else (0,)):
                dessin.line(surf, (60, 60, 70), (x + dx, self.accroche()), (x + dx, y - self.h / 2 + 2), 2)
        if self.fetee and self.genre in "fb":
            angle = 5 * math.sin(self.t * 2)
        if self.tas > 0:
            nom = "squelette_tas"
            if self.tas < 1.2:  # il va se relever : il tremble
                x += 2 * math.sin(self.t * 60)
        poser(surf, anime(nom, self.t), x, y, gauche and self.genre in "sf", angle, echelle)
        if self.bouh > 0:
            ecrire(surf, "Bouh !", 30, BLANC, centre=(x, y - self.h / 2 - 14))
        c = self.p.corbeau
        if c and c.cible is self and not c.fetee and int(self.t * 4) % 2:
            ecrire(surf, "!", 48, (255, 70, 70), centre=(x, max(HAUT_FRISE + 20, y - self.h / 2 - 20)))


class Vampire:
    """Un personnage du joueur (le vampire, la vampirette ou le petit vampire)."""

    def __init__(self, partie, x, bas, dessin="vampire", taille=(26, 52)):
        self.p, self.dessin = partie, dessin
        self.W, self.H = taille
        self.x, self.y = x - self.W / 2, bas - self.H
        self.vx = self.vy = 0.0
        self.au_sol = False
        self.coyote = self.tampon = 0.0
        self.saute = False        # en train de monter après un saut (pas un rebond)
        self.dir = 1
        self.pas = 0.0
        self.invincible = self.recul = self.recharge = 0.0
        self.coupe, self.coupe_cible = 0.0, None   # en train de couper une courge
        self.courge_proche = None  # courge juste à côté : il peut sortir son couteau
        self.bas_avant = 0.0       # le bas de son corps à l'image d'avant
        self.vole, self.tire = False, 0.0          # l'enfant ramené par la laisse

    def rect(self):
        return pygame.FRect(self.x, self.y, self.W, self.H)

    def tuiles(self):
        c0, c1 = int(self.x // T), int((self.x + self.W - 0.01) // T)
        r0, r1 = int(self.y // T), int((self.y + self.H - 0.01) // T)
        return [(c, r) for r in range(r0, r1 + 1) for c in range(c0, c1 + 1)]

    def bouger_x(self, dx):
        if not dx:
            return
        self.x += dx
        for c, r in self.tuiles():
            if self.p.tuile(c, r) == "#":
                self.x = c * T - self.W if dx > 0 else (c + 1) * T
                self.vx = 0.0

    def bouger_y(self, dy):
        bas_avant = self.y + self.H
        self.y += dy
        self.au_sol = False
        for c, r in self.tuiles():
            t = self.p.tuile(c, r)
            if t == "#" or (t in "-=" and dy > 0 and bas_avant <= r * T + 0.01):
                if dy > 0:
                    self.y, self.au_sol = r * T - self.H, True
                else:
                    self.y = (r + 1) * T
                self.vy = 0.0

    def rebondir(self, cmd):
        self.vy, self.saute = -(REBOND_HAUT if cmd.saut else REBOND), False

    def faire_peur(self, chose):
        """Une créature effrayante le touche de côté : il recule."""
        sens = 1 if self.x + self.W / 2 > chose.x else -1
        self.vx, self.vy = sens * RECUL_VX, -RECUL_VY
        self.recul, self.invincible, self.saute = DUREE_RECUL, INVINCIBLE, False
        chose.bouh = 1.0
        self.p.son("bouh")

    def maj(self, cmd):
        p = self.p
        self.invincible = max(0.0, self.invincible - DT)
        self.recharge = max(0.0, self.recharge - DT)
        dx = cmd.droite - cmd.gauche
        if self.recul > 0:
            self.recul -= DT
            dx = 0
        else:
            acc = ACC_SOL if self.au_sol else ACC_AIR
            self.vx += max(-acc * DT, min(acc * DT, dx * VITESSE - self.vx))
        if dx:
            self.dir = dx
        self.coyote = COYOTE if self.au_sol else max(0.0, self.coyote - DT)
        self.tampon = TAMPON if cmd.saut_presse else max(0.0, self.tampon - DT)
        if self.tampon > 0 and self.coyote > 0:
            self.vy, self.saute = -SAUT, True
            self.tampon = self.coyote = 0.0
            p.son("saut")
        if self.saute and not cmd.saut and self.vy < -SAUT_COURT:
            self.vy = -SAUT_COURT
        if self.vy >= 0:
            self.saute = False
        self.vy = min(self.vy + GRAVITE * DT, CHUTE_MAX)
        self.bouger_x(self.vx * DT)
        self.bouger_y(self.vy * DT)
        self.pas = self.pas + abs(self.vx) * DT / 40 if self.au_sol else 0.0
        if cmd.action_presse and self.recharge <= 0:
            self.recharge = RECHARGE_BONBON
            p.lancer_bonbon(self)

    def dessiner(self, surf, cx):
        if self.invincible > 0 and int(self.invincible * 10) % 2:
            return  # il clignote
        d = self.dessin
        if not self.au_sol or self.vole:
            nom = d + "_saut@0"
        elif abs(self.vx) > 20:
            nom = anime(d + "_marche", self.pas / 2)  # un cycle = deux pas
        else:
            nom = anime(d, self.p.t)
        # le corps n'est pas au milieu de l'image (la cape flotte derrière lui)
        x = self.x + self.W / 2 - cx - self.dir * 3
        poser(surf, nom, x, self.y + self.H - TAILLES[d][1] / 2, self.dir < 0)
        if self.coupe > 0 or self.courge_proche:  # le couteau dégainé
            u = 1 - self.coupe / DUREE_COUPE if self.coupe > 0 else 0.0
            angle = 60 if self.coupe <= 0 else -30 + 90 * abs(math.cos(u * 3 * math.pi))
            poser(surf, "couteau@0", x + self.dir * 20, self.y + 26, self.dir < 0, angle * self.dir)


class BonbonLance:
    """Un bonbon magique lancé, qui file vers la chose la plus proche devant soi."""

    def __init__(self, partie, x, y, d, cible):
        self.p, self.x, self.y, self.cible = partie, x, y, cible
        self.vx, self.vy = d * VITESSE_BONBON, 0.0
        self.vie = 1.5

    def maj(self):
        self.vie -= DT
        c = self.cible
        if c and not c.fetee:
            dx, dy = c.x - self.x, c.y - self.y
            d = math.hypot(dx, dy) or 1
            k = min(1.0, 10 * DT)
            self.vx += (dx / d * VITESSE_BONBON - self.vx) * k
            self.vy += (dy / d * VITESSE_BONBON - self.vy) * k
        self.x += self.vx * DT
        self.y += self.vy * DT
        if random.random() < 0.7:
            self.p.particules.append([self.x, self.y, random.uniform(-30, 30),
                                      random.uniform(-30, 30), 0.4, random.choice(FESTIF)])
        for ch in self.p.choses:
            if not ch.fetee and ch.rect().inflate(16, 16).collidepoint(self.x, self.y):
                if ch.genre in PAS_DE_BONBON:  # le bonbon rebondit dessus
                    self.p.dire(PAS_DE_BONBON[ch.genre], ch.x, ch.y - ch.h / 2 - 30)
                    self.p.son("vide")
                else:
                    ch.transformer()
                self.vie = 0
                break
        if self.p.plein(self.x, self.y):
            self.vie = 0

    def dessiner(self, surf, cx):
        poser(surf, "bonbon@0", self.x - cx, self.y, angle=self.vie * 900)  # il tourbillonne


class Corbeau:
    """Le corbeau grognon : il vole de décoration en décoration et les remet en
    version effrayante. Il ne s'en va pas tout seul : il faut aller le toucher, de n'importe
    quel côté (même par en dessous). Les bonbons ne lui font rien."""
    # (fetee : il a été chassé ; comme une chose déjà transformée, plus rien ne le vise)

    def __init__(self, partie, cible):
        self.p, self.cible = partie, cible
        # il arrive de loin, mais toujours de l'intérieur de la salle
        largeur = partie.cols * T
        cotes = [k for k in (-1, 1) if T * 1.5 < cible.x + k * 750 < largeur - T * 1.5]
        cote = random.choice(cotes or [1 if cible.x < largeur / 2 else -1])
        self.x, self.y = max(T * 1.5, min(largeur - T * 1.5, cible.x + cote * 750)), 140.0
        self.vitesse = partie.niveau["corbeau"][2]
        self.dir = -cote
        self.etat, self.attente, self.t = "arrive", 0.0, 0.0
        self.fetee = self.fini = False

    def rect(self):
        return pygame.FRect(self.x - 32, self.y - 22, 64, 44)

    def chasser(self):
        """Le vampire l'a touché : il s'enfuit en perdant des plumes."""
        if self.fetee:
            return
        self.fetee, self.etat = True, "fuit"
        self.p.dire("Croâ !", self.x, self.y - 30)
        for _ in range(14):
            a, v = random.uniform(0, math.tau), random.uniform(60, 220)
            self.p.particules.append([self.x, self.y, math.cos(a) * v, math.sin(a) * v - 120,
                                      random.uniform(0.6, 1.1), (40, 34, 56)])
        self.p.son("croa")

    def choisir(self):
        """La décoration la plus proche à défaire (attend s'il n'y en a pas)."""
        fetees = [ch for ch in self.p.choses if ch.fetee]
        self.cible = min(fetees, key=lambda ch: math.hypot(ch.x - self.x, ch.y - self.y), default=None)
        self.etat = "arrive" if self.cible else "attend"

    def maj(self):
        self.t += DT
        if self.p.gagne_t is not None and self.etat != "fuit":
            self.etat = "part"  # trop tard : la salle est en fête
        elif self.etat in ("arrive", "picore") and not self.cible.fetee:
            self.choisir()
        c = self.cible
        if self.etat == "attend":  # rien à défaire : il nargue le vampire, à portée de saut
            v = self.p.vampire
            dx = v.x + 120 * math.sin(self.t) - self.x
            dy = max(CORBEAU_PERCHE, v.y - 70 + 15 * math.sin(self.t * 2)) - self.y
            self.x += max(-1.0, min(1.0, dx / 60)) * self.vitesse * 0.6 * DT
            self.y += max(-1.0, min(1.0, dy / 60)) * self.vitesse * 0.6 * DT
            self.dir = 1 if dx > 0 else -1
            if any(ch.fetee for ch in self.p.choses):
                self.choisir()
        elif self.etat == "arrive":
            dx, dy = c.x - self.x, max(CORBEAU_PERCHE, c.y - c.h / 2 - 14) - self.y
            d = math.hypot(dx, dy)
            if d < 6:
                self.etat, self.attente = "picore", CORBEAU_PICORE
            else:
                pas = min(d, self.vitesse * DT)
                self.x += dx / d * pas
                self.y += dy / d * pas
                if abs(dx) > 4:
                    self.dir = 1 if dx > 0 else -1
        elif self.etat == "picore":
            self.attente -= DT
            if self.attente <= 0:
                c.defaire()
                self.p.son("croa")
                self.etat, self.attente = "repos", CORBEAU_REPOS
        elif self.etat == "repos":  # il ricane un moment… puis il continue !
            self.attente -= DT
            if self.attente <= 0:
                self.choisir()
        else:  # il s'en va (chassé, ou la salle est en fête)
            v = 420 if self.etat == "fuit" else 260
            self.x += self.dir * v * DT
            self.y -= v * 0.5 * DT
            if self.y < -80:
                self.fini = True

    def dessiner(self, surf, cx):
        x, y = self.x - cx, self.y
        nom = {"picore": "corbeau_picore", "repos": "corbeau_ricane"}.get(self.etat, "corbeau_vol")
        poser(surf, anime(nom, self.t), x, y - 11, self.dir < 0)  # le corps au milieu du rect
        if not self.fetee and not -30 < x < L + 30:  # hors de l'écran : une flèche
            bord = 24 if x < 0 else L - 24
            pointe = -1 if x < 0 else 1
            yy = max(HAUT_FRISE + 30, min(H - 60, y))
            dessin.polygon(surf, (255, 70, 70), [(bord + pointe * 14, yy), (bord - pointe * 6, yy - 14),
                                                 (bord - pointe * 6, yy + 14)])
            ecrire(surf, "Croâ", 22, BLANC, centre=(bord - pointe * 40, yy))


def bezier_point(a, m, b, u):
    """Le point u (de 0 à 1) de la courbe qui va de a à b en passant près de m."""
    return tuple((1 - u) ** 2 * a[i] + 2 * u * (1 - u) * m[i] + u * u * b[i] for i in range(2))


class Partie:
    def __init__(self, i_niveau=0, son=lambda nom: None, mode="solo"):
        """mode : « solo », « duo » (deux joueurs pareils) ou « parent » (le parent mène,
        l'enfant suit au bout de sa laisse magique)."""
        self.son, self.mode = son, mode
        self.i_niveau, self.niveau = i_niveau, NIVEAUX[i_niveau]
        self.cols = COLS = self.niveau["cols"]
        self.grille = [[" "] * COLS for _ in range(RANGS)]
        for r in range(RANGS):
            self.grille[r][0] = self.grille[r][COLS - 1] = "#"
        for r in list(range(PLAFOND)) + [RANGS - 1]:
            self.grille[r] = ["#"] * COLS
        self.choses, self.bonbons = [], []
        for r, c, texte in self.niveau["plan"]:
            for k, lettre in enumerate(texte):
                x, y = (c + k) * T + T / 2, r * T + T / 2
                if lettre in "#-=":
                    self.grille[r][c + k] = lettre
                elif lettre == "V":
                    depart = x, (r + 1) * T
                elif lettre == "o":
                    self.bonbons.append([x, y, 0.0])  # x, y, temps avant de repousser
                else:
                    self.choses.append(Chose(self, lettre, x, (r + 1) * T if lettre in AU_SOL else y))
        self.vampires = [Vampire(self, depart[0] + k * 44, depart[1], nom, taille)
                         for k, (nom, taille) in enumerate(PERSONNAGES[mode])]
        self.vampire = self.vampires[0]   # celui que suivent la caméra, le corbeau, les conseils
        self.lances, self.particules, self.messages = [], [], []
        self.notes = []           # notes de musique : x, y, décalage, vie, couleur
        self.poche = self.niveau["poche"]   # bonbons à lancer
        self.corbeau = None
        corbeau = self.niveau["corbeau"]
        self.prochain_corbeau = corbeau[0] if corbeau else math.inf
        self.alerte = 0.0         # « Le corbeau grognon arrive ! » la première fois
        self.flash = 0.0           # le cadre des bonbons clignote en rouge (le corbeau a défait)
        self.camera = 0.0
        self.fete_vue = 0.0       # avance doucement vers la vraie proportion de fête
        self.gagne_t = None       # temps depuis la fin (tout est transformé)
        self.t = 0.0
        self.murs, self.frises, (self.pierre, self.planche) = decors.decor(self.niveau["decor"])
        # les meubles sur lesquels on peut monter (établi, table, pergola) : x de début, de fin,
        # rangée, et le sol en dessous (pour leurs pieds)
        self.meubles = []
        for r in range(RANGS):
            c = 0
            while c < COLS:
                if self.grille[r][c] == "=":
                    c0 = c
                    while c < COLS and self.grille[r][c] == "=":
                        c += 1
                    sols = tuple(next(rr for rr in range(r + 1, RANGS) if self.grille[rr][cc] == "#")
                                 for cc in (c0, c - 1))  # sous chaque pied
                    self.meubles.append((c0, c, r, sols))
                c += 1
        self.maj_camera(direct=True)

    # ---- le décor ----

    def tuile(self, c, r):
        if 0 <= c < self.cols and 0 <= r < RANGS:
            return self.grille[r][c]
        return "#"

    def plein(self, x, y):
        return self.tuile(int(x // T), int(y // T)) == "#"

    def porte(self, x, y):
        return self.tuile(int(x // T), int(y // T)) in "#-="

    # ---- ce qui se passe ----

    def fete(self):
        return sum(ch.fetee for ch in self.choses) / len(self.choses)

    def eclats(self, x, y, n):
        for _ in range(n):
            a, v = random.uniform(0, math.tau), random.uniform(80, 320)
            self.particules.append([x, y, math.cos(a) * v, math.sin(a) * v - 100,
                                    random.uniform(0.5, 1.0), random.choice(FESTIF)])

    def dire(self, texte, x, y):
        if all(m[0] != texte for m in self.messages):  # pas deux fois le même à la fois
            self.messages.append([texte, x, y, 1.6])

    def lancer_bonbon(self, v=None):
        v = v or self.vampire
        x, y = v.x + v.W / 2 + v.dir * 20, v.y + 22
        if self.poche <= 0:
            self.dire("Plus de bonbons ! Ramasses-en", x, v.y - 20)
            self.son("vide")
            return
        self.poche -= 1
        cibles = [ch for ch in self.choses if not ch.fetee and ch.genre not in PAS_DE_BONBON
                  and (ch.x - x) * v.dir > -30
                  and math.hypot(ch.x - x, ch.y - y) < PORTEE_BONBON]
        cible = min(cibles, key=lambda ch: math.hypot(ch.x - x, ch.y - y), default=None)
        self.lances.append(BonbonLance(self, x, y, v.dir, cible))
        self.son("sort")

    def maj(self, cmds):
        """cmds : une Commande par joueur (ou une seule)."""
        self.t += DT
        if isinstance(cmds, manettes.Commande):
            cmds = [cmds]
        cmds = list(cmds) + [manettes.Commande()] * (len(self.vampires) - len(cmds))
        for v, cmd in zip(self.vampires, cmds):
            self.bouger(v, cmd)
        if self.mode == "parent":
            self.laisse()
        for ch in self.choses:
            ch.maj()
        for b in self.bonbons:  # les bonbons mangés repoussent
            b[2] = max(0.0, b[2] - DT)
        c = self.corbeau
        if c:
            c.maj()
        for v, cmd in zip(self.vampires, cmds):
            if not v.vole:
                self.toucher(v, cmd)
        if c:
            if c.fini:
                self.corbeau = None
                self.prochain_corbeau = random.uniform(*self.niveau["corbeau"][1])
        elif self.gagne_t is None:
            self.prochain_corbeau -= DT
            fetees = [ch for ch in self.choses if ch.fetee]
            if self.prochain_corbeau <= 0 and fetees:
                proches = [ch for ch in fetees if abs(ch.x - self.vampire.x) < 1000] or fetees
                self.corbeau = Corbeau(self, random.choice(proches))
                self.son("croa")
                if self.alerte == 0.0:
                    self.alerte = 5.0
        for b in self.lances:
            b.maj()
        self.lances = [b for b in self.lances if b.vie > 0]
        for pt in self.particules:
            pt[0] += pt[2] * DT
            pt[1] += pt[3] * DT
            pt[3] += 400 * DT
            pt[4] -= DT
        self.particules = [pt for pt in self.particules if pt[4] > 0]
        for n in self.notes:
            n[1] -= 40 * DT
            n[3] -= DT
        self.notes = [n for n in self.notes if n[3] > 0]
        for m in self.messages:
            m[2] -= 30 * DT
            m[3] -= DT
        self.messages = [m for m in self.messages if m[3] > 0]
        self.flash = max(0.0, self.flash - DT)
        if self.alerte > 0:
            self.alerte = max(0.001, self.alerte - DT)  # jamais 0 : une seule alerte
        f = self.fete()
        self.fete_vue += max(-DT, min(DT, f - self.fete_vue)) * 0.8
        if f == 1 and self.gagne_t is None:
            self.gagne_t = 0.0
            self.son("bravo")
        if self.gagne_t is not None:
            self.gagne_t += DT
            if random.random() < 0.6:  # des confettis qui tombent
                self.particules.append([self.camera + random.uniform(0, L), 0,
                                        random.uniform(-40, 40), 60, 3.0, random.choice(FESTIF)])
        self.maj_camera()

    def bouger(self, v, cmd):
        """Un personnage bouge (ou coupe une courge, ou vole au bout de la laisse)."""
        v.bas_avant = v.y + v.H
        x_avant = v.x
        if v.vole:
            self.voler(v)
            return
        if v.coupe > 0:  # il coupe la courge : il ne bouge plus
            avant, v.coupe = v.coupe, v.coupe - DT
            ch = v.coupe_cible
            if any(v.coupe <= k < avant for k in COUPS):
                self.son("tchac")
                for _ in range(8):
                    self.particules.append([ch.x, ch.y, random.uniform(-160, 160),
                                            random.uniform(-260, -80), 0.6, ORANGE])
            if v.coupe <= 0:
                ch.transformer()
            v.maj(manettes.Commande())
        else:
            if cmd.coucou_presse and v.courge_proche:  # on est prêt : on coupe
                v.coupe, v.coupe_cible = DUREE_COUPE, v.courge_proche
                v.dir = 1 if v.courge_proche.x > v.x + v.W / 2 else -1
                self.son("couteau")
            v.maj(cmd)
        v.courge_proche = None
        if v.au_sol and v.coupe <= 0:
            for ch in self.choses:
                if (ch.genre == "c" and not ch.fetee and abs(ch.x - v.x - v.W / 2) < 60
                        and abs(ch.y + ch.h / 2 - v.y - v.H) < 8):
                    v.courge_proche = ch
        if self.mode == "duo":  # on ne laisse pas l'autre sortir de l'écran
            autre = self.vampires[1] if v is self.vampires[0] else self.vampires[0]
            if abs(v.x - autre.x) > max(ECART_MAX, abs(x_avant - autre.x)):
                v.x, v.vx = x_avant, 0.0
                self.dire("Restez ensemble !", v.x + v.W / 2, v.y - 20)

    def laisse(self):
        """Parent et enfant : la laisse magique traîne l'enfant derrière le parent."""
        parent, enfant = self.vampires
        if enfant.vole:
            return
        dx = parent.x + parent.W / 2 - enfant.x - enfant.W / 2
        d = math.hypot(dx, parent.y + parent.H - enfant.y - enfant.H)
        if d <= LAISSE:
            enfant.tire = 0.0
            return
        if d > LAISSE + 140:  # il n'arrive pas à suivre (un mur, une plateforme…)
            enfant.tire += DT
        if d > LAISSE_MAX or enfant.tire > TIRE_MAX:
            enfant.vole = True
            self.son("magie")
        elif abs(dx) > 1:
            rappel = min(RAPPEL_MAX, ELASTIQUE * (d - LAISSE)) * DT
            enfant.bouger_x(math.copysign(min(abs(dx), rappel), dx))

    def voler(self, v):
        """L'enfant s'envole vers le parent, à travers tout, et se pose à côté de lui."""
        parent = self.vampire
        bx, by = parent.x + (parent.W - v.W) / 2, parent.y + parent.H - v.H
        dx, dy = bx - v.x, by - v.y
        d, pas = math.hypot(dx, dy), VOL_ENFANT * DT
        if d <= pas:  # arrivé : là où est le parent, il y a forcément de la place
            v.x, v.y, v.vx, v.vy = bx, by, 0.0, 0.0
            v.vole, v.tire, v.au_sol = False, 0.0, parent.au_sol
        else:
            v.x, v.y = v.x + dx / d * pas, v.y + dy / d * pas
            v.dir = 1 if dx > 0 else -1
            self.particules.append([v.x + v.W / 2, v.y + v.H / 2, random.uniform(-40, 40),
                                    random.uniform(-80, 0), 0.5, random.choice(FESTIF)])

    def toucher(self, v, cmd):
        """Ce que touche un personnage : créatures, bonbons à ramasser, corbeau."""
        r, bas_avant = v.rect(), v.bas_avant
        for ch in self.choses:
            if ch.fetee or not r.colliderect(ch.rect()):
                continue
            dessus = v.vy > 0 and bas_avant <= ch.rect().top + 12  # on lui retombe dessus
            if ch.regle == "touche":
                ch.transformer()
            elif dessus and ch.regle not in ("bonbon", "couteau"):
                if ch.genre == "s" and ch.tas <= 0:
                    ch.effondrer()
                else:
                    ch.transformer()
                v.rebondir(cmd)
            elif ch.regle in ("mechant", "bonbon") and ch.tas <= 0 and v.invincible <= 0:
                v.faire_peur(ch)
                if ch.regle == "bonbon":
                    self.dire("Il faut lui lancer un bonbon !", ch.x, ch.y - ch.h / 2 - 40)
        for b in self.bonbons:
            if b[2] <= 0 and self.poche < POCHE_MAX and r.colliderect((b[0] - 18, b[1] - 12, 36, 24)):
                self.poche += 1
                b[2] = RETOUR_BONBON
                self.dire("+1 bonbon", b[0], b[1] - 20)
                self.son("bonbon")
        c = self.corbeau
        if c and not c.fetee and r.colliderect(c.rect()):  # touché, de n'importe quel côté
            if v.vy > 0 and bas_avant <= c.rect().top + 14:
                v.rebondir(cmd)
            c.chasser()

    def maj_camera(self, direct=False):
        suivis = self.vampires if self.mode == "duo" else [self.vampire]  # à deux : entre les deux
        milieu = sum(v.x + v.W / 2 for v in suivis) / len(suivis)
        voulu = max(0, min(self.cols * T - L, milieu - L / 2))
        self.camera = voulu if direct else self.camera + (voulu - self.camera) * 0.15

    # ---- le dessin ----

    def dessiner(self, e, apercu=False):
        """Dessine la salle. apercu : sans la poche ni les textes (vue depuis dehors)."""
        cx = round(self.camera)
        f = self.fete_vue
        fond = cx // 2  # le mur du fond défile deux fois moins vite
        for i, mur in enumerate(self.murs):
            if i == 0 and f >= 0.99:
                continue  # tout en fête : le mur lugubre est caché, inutile de le dessiner
            if i == 1:
                if f <= 0.01:
                    break
                mur.set_alpha(None if f >= 0.99 else round(255 * f))
            x = -(fond % decors.MOTIF)
            while x < L:
                e.blit(mur, (_z(x), 0))
                x += decors.MOTIF
        for x in range(-(fond % decors.MOTIF), L, decors.MOTIF):  # ce qui bouge dans le décor
            decors.animer(self.niveau["decor"], e, x, self.t, f)
        # les guirlandes au plafond apparaissent petit à petit
        for k in range(self.cols * T // 160):
            if (k * 37) % 100 >= f * 100:
                continue
            x0 = k * 160 - cx
            if -160 < x0 < L:
                points = [(x0 + i * 20, HAUT_FRISE + 4 + 14 * math.sin(i / 8 * math.pi)) for i in range(9)]
                for i in range(8):
                    (xa, ya), (xb, yb) = points[i], points[i + 1]
                    dessin.polygon(e, FESTIF[(i + k) % 5], [(xa + 2, ya), (xb - 2, yb), ((xa + xb) / 2, ya + 18)])
                dessin.line(e, (90, 60, 50), points[0], points[-1], 1)
        # les murs, le sol et les planches
        c0, c1 = max(0, cx // T), min(self.cols - 1, (cx + L) // T)
        for i, frise in enumerate(self.frises):  # la frise du plafond, lugubre puis en fête
            if (i == 0 and f >= 0.99) or (i == 1 and f <= 0.01):
                continue
            frise.set_alpha(None if i == 0 or f >= 0.99 else round(255 * f))
            for x in range(-(cx % 160), L, 160):
                e.blit(frise, (_z(x), 0))
        for r in range(PLAFOND, RANGS):
            for c in range(c0, c1 + 1):
                t = self.grille[r][c]
                if t == "#":
                    e.blit(self.pierre, (_z(c * T - cx), _z(r * T)))
                elif t == "-":
                    e.blit(self.planche, (_z(c * T - cx), _z(r * T)))
        for c0, c1, r, sols in self.meubles:
            if c1 * T - cx > -60 and c0 * T - cx < L + 60:
                decors.dessiner_meuble(self.niveau["decor"], e, c0 * T - cx, c1 * T - cx, r * T,
                                       [sol * T for sol in sols], f > 0.5)
        for ch in self.choses:
            ch.dessiner(e, cx)
        for x, y, absent in self.bonbons:
            if absent <= 0 and -40 < x - cx < L + 40:
                poser(e, anime("bonbon", self.t + x), x - cx, y + 3 * math.sin(self.t * 3 + x))
        self.dessiner_joueurs(e, cx)
        for ch in {v.courge_proche for v in self.vampires} - {None}:  # la courge attend le couteau
            ecrire(e, f"Couteau : {BOUTONS['coucou']} !", 24, OR,
                   centre=(ch.x - cx, ch.y - ch.h / 2 - 18 - 3 * abs(math.sin(self.t * 5))))
        if self.corbeau:
            self.corbeau.dessiner(e, cx)
        for b in self.lances:
            b.dessiner(e, cx)
        # la lumière : sombre au début, de plus en plus claire et chaude avec la fête
        nuit, vignette, halo = voiles()
        if f < 0.99:
            nuit.set_alpha(round(90 * (1 - f)))
            e.blit(nuit, (0, 0))
        if f < 0.99:
            vignette.set_alpha(round(255 * 0.8 * (1 - f)))
            e.blit(vignette, (0, 0))
        if f < 0.99:  # chacun porte sa lumière : on les voit toujours bien
            for v in self.vampires:
                e.blit(halo, halo.get_rect(center=(_z(v.x + v.W / 2 - cx), _z(v.y + v.H / 2))),
                       special_flags=pygame.BLEND_RGB_ADD)
            self.dessiner_joueurs(e, cx, laisse=False)  # par-dessus la lumière : bien nets
        if f > 0.3:
            k = (f - 0.3) / 0.7
            e.fill((round(28 * k), round(14 * k), 0), special_flags=pygame.BLEND_RGB_ADD)
        for x, y, decal, vie, couleur in self.notes:  # ♪ qui ondulent en montant
            nx = x - cx + 6 * math.sin(vie * 4 + decal)
            taille = min(1.0, vie)
            dessin.circle(e, couleur, (nx, y), 4 * taille + 1)
            dessin.line(e, couleur, (nx + 3.5 * taille, y), (nx + 3.5 * taille, y - 13 * taille), 2)
            dessin.line(e, couleur, (nx + 3.5 * taille, y - 13 * taille), (nx + 9 * taille, y - 8 * taille), 2)
        for x, y, _, _, vie, couleur in self.particules:  # (cercles simples : il y en a beaucoup)
            pygame.draw.circle(e, couleur, (_z(x - cx), _z(y)), _z(2 + 3 * min(1.0, vie)))
        for texte, x, y, vie in self.messages:
            demi = police(32).size(texte)[0] / ZOOM / 2 + 8  # toujours en entier à l'écran
            ecrire(e, texte, 32, OR, centre=(max(demi, min(L - demi, x - cx)), max(HAUT_FRISE + 20, y)))
        if apercu:
            return
        self.dessiner_poche(e)
        if self.t < 3:
            ecrire(e, f"Salle {self.i_niveau + 1} : {self.niveau['nom']}", 72, OR, centre=(L // 2, 250))
        self.dessiner_conseil(e)
        if self.gagne_t is not None and self.gagne_t > 1.0:
            ecrire(e, "La salle est prête pour la fête !", 72, OR, centre=(L // 2, 250))
            if self.gagne_t > 2.5:
                suite = "salle suivante" if self.i_niveau + 1 < len(NIVEAUX) else "la grande fête !"
                suite = f"{BOUTONS['saut'].capitalize()} : {suite}"
                ecrire(e, suite, 36, BLANC, centre=(L // 2, 330))

    def dessiner_joueurs(self, e, cx, laisse=True):
        """Les personnages, et la laisse magique entre le parent et l'enfant (fine et
        discrète : on la dessine sous la lumière, qui l'assombrit dans les salles sombres)."""
        if self.mode == "parent" and laisse:
            parent, enfant = self.vampires
            a = (parent.x + parent.W / 2 + parent.dir * 10 - cx, parent.y + 30)
            b = (enfant.x + enfant.W / 2 - cx, enfant.y + 14)
            d = math.hypot(b[0] - a[0], b[1] - a[1])
            # elle pend quand elle n'est pas tendue, et ondule un peu, comme un élastique
            creux = max(3.0, (LAISSE - d) * 0.35) * (1 + 0.15 * math.sin(self.t * 4))
            milieu = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + creux)
            points = [bezier_point(a, milieu, b, k / 12) for k in range(13)]
            tendue = min(1.0, max(0.0, (d - LAISSE) / 150))
            couleur = melange((150, 120, 200), (235, 205, 130), tendue)
            for k in range(0, 12, 2):  # en pointillés
                dessin.line(e, couleur, points[k], points[k + 1], 1)
        for v in reversed(self.vampires):  # le premier joueur devant
            v.dessiner(e, cx)

    def dessiner_conseil(self, e):
        """Le conseil du moment, dans la frise, à droite des bonbons."""
        conseil, couleur = None, BLANC
        if self.gagne_t is not None:
            pass
        elif 0.001 < self.alerte:
            conseil, couleur = "Le corbeau grognon défait tout : va le toucher pour le chasser !", (255, 130, 130)
        elif self.niveau["aides"]:
            col = (self.vampire.x + self.vampire.W / 2) // T
            conseil = ([texte for c, texte in self.niveau["aides"] if c <= col] or [None])[-1]
        elif self.t < 8:
            conseil = (f"Transforme tout !  {BOUTONS['saut'].capitalize()} : sauter   "
                       f"{BOUTONS['action'].capitalize()} : bonbon   {BOUTONS['coucou'].capitalize()} : couteau")
        if conseil:
            lignes = envelopper(conseil, 26, 700)
            dessin.rect(e, (20, 16, 34), (400, 8, 750, 64), border_radius=18)
            for k, ligne in enumerate(lignes[:2]):
                ecrire(e, ligne, 26, couleur, centre=(775, 40 + (k - (len(lignes[:2]) - 1) / 2) * 24))

    def dessiner_poche(self, e):
        """Dans la frise, à gauche : les bonbons en poche (une place vide : un rond sombre),
        puis le compte des choses déjà transformées."""
        rouge = self.flash > 0 and int(self.flash * 6) % 2  # le corbeau vient de défaire
        dessin.rect(e, (20, 16, 32), (10, 8, 380, 64), border_radius=20)
        dessin.rect(e, (230, 60, 60) if rouge else (90, 80, 110), (10, 8, 380, 64), 3, border_radius=20)
        for i in range(POCHE_MAX):
            x = 45 + i * 50
            if i < self.poche:
                poser(e, "bonbon@0", x, 40, echelle=1.1)
            else:
                dessin.circle(e, (60, 52, 80), (x, 40), 9, 2)
        dessin.line(e, (60, 52, 80), (278, 20), (278, 60), 2)
        n, total = sum(ch.fetee for ch in self.choses), len(self.choses)
        ecrire(e, f"{n} / {total}", 34, OR if n == total else (230, 60, 60) if rouge else BLANC,
               centre=(330, 41))
