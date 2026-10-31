"""Vampire en fête — un vampire redécore son château lugubre pour Halloween.
Un seul joueur à la manette (base technique reprise de « Les Deux Amis »).

Lancer avec :  .venv/bin/python jeu.py
Le jeu passe par quatre écrans (Jeu.etat) : « titre » (l'accueil devant le château),
« voyage » (d'une salle à l'autre), « jeu » (dans une salle) et « fin » (la grande fête).
"""
import math
import os
import random
import sys

os.environ.setdefault("SDL_RENDER_SCALE_QUALITY", "1")  # agrandissement lissé

import manettes  # à importer avant pygame : règle les options SDL des manettes
import pygame
from pygame._sdl2 import video

import musique
from dehors import ARRIVEE, ENTREE, FENETRES, SORTIE, VOL, Dehors, bezier, doux, vignette, zoomer
from niveaux import BOUTONS, NIVEAUX
from outils import (BLANC, DT, FESTIF, H, L, OR, ORANGE, ZOOM, anime, dessin, ecrire, melange,
                    poser, preparer_images)
from partie import Partie
from sons import creer_sons

TITRE = "Vampire en fête"


class Jeu:
    def __init__(self):
        pygame.init()
        # On dessine sur une grande image, que la carte graphique étale dans la fenêtre.
        self.ecran = pygame.Surface((L * ZOOM, H * ZOOM))
        self.plein_ecran = False
        try:
            self.fenetre = pygame.Window(TITRE, (L, H), resizable=True, allow_high_dpi=True)
            self.rendu = video.Renderer(self.fenetre, accelerated=1, vsync=True)
            self.rendu.logical_size = self.ecran.get_size()
            self.texture = video.Texture(self.rendu, self.ecran.get_size(), streaming=True)
            pygame.mouse.set_visible(False)
        except (pygame.error, RuntimeError):
            self.rendu = None  # pas d'écran disponible (essais automatiques)
        self.horloge = pygame.time.Clock()
        self.sons = creer_sons()
        self.musique = musique.Musique()
        self.entrees = manettes.Entrees()
        self.etat = "titre"       # titre, voyage, jeu ou fin
        self.partie = None
        self.niveau = 0           # salle choisie à l'accueil
        self.pause = False
        self.t = 0.0
        self.titre_t = 0.0        # depuis quand on est à l'accueil (le vampire arrive)
        self.salles = {}          # salles mises en fête : elles continuent la fête, en aperçu
        self.vignettes = {}       # leur aperçu dans leur fenêtre du château
        self.tour_vignette = 0    # on refait un aperçu par image, chacun son tour
        self.ecran_salle = pygame.Surface((L * ZOOM, H * ZOOM))
        self.voyage = None
        self.fusees = []          # feux d'artifice de la fin : les fusées qui montent…
        self.feux = []            # … et les étincelles quand elles éclatent
        preparer_images()
        self.dehors = Dehors()
        self.sombres = []         # l'aperçu assombri de chaque salle, pas encore en fête
        for i, r in enumerate(FENETRES):
            Partie(i).dessiner(self.ecran_salle, apercu=True)
            self.sombres.append(vignette(self.ecran_salle, r, True))

    def son(self, nom):
        if nom in self.sons:
            self.sons[nom].play()

    def quitter(self):
        pygame.quit()
        sys.exit()

    def commencer(self, i_niveau=None):
        if i_niveau is not None:
            self.niveau = i_niveau
        self.partie = Partie(self.niveau, self.son)
        self.etat, self.pause = "jeu", False
        self.son("clic")

    def animer_salles(self):
        """Les salles finies continuent la fête, même vues de dehors."""
        for p in self.salles.values():
            p.maj(manettes.Commande())
        zoom = self.etat == "voyage" and self.phase_voyage() != "vol"
        self.tour_vignette += 1
        if self.salles and self.tour_vignette % 3 == 0 and not zoom:
            i = sorted(self.salles)[self.tour_vignette // 3 % len(self.salles)]
            self.salles[i].dessiner(self.ecran_salle, apercu=True)
            self.vignettes[i] = vignette(self.ecran_salle, FENETRES[i], False)

    def maj_feux(self):
        """Les feux d'artifice : une fusée monte en sifflant, éclate en étincelles qui
        ralentissent, retombent et s'éteignent."""
        if random.random() < 1.1 * DT:
            x = random.uniform(220, 1060)
            self.fusees.append([x, 600.0, random.uniform(-40, 40), -random.uniform(560, 680),
                                random.uniform(90, 260), random.choice(FESTIF)])
            self.son("fusee")
        for f in self.fusees:
            f[0] += f[2] * DT
            f[1] += f[3] * DT
            f[3] += 300 * DT
            if f[1] <= f[4] or f[3] > -80:  # elle éclate
                f[4] = None
                autre = random.choice(FESTIF)
                for k in range(48):
                    a, w = k * math.tau / 48 + random.uniform(-0.05, 0.05), random.uniform(170, 260)
                    vie = random.uniform(1.1, 1.6)
                    self.feux.append([f[0], f[1], math.cos(a) * w, math.sin(a) * w, vie, vie,
                                      f[5] if k % 3 else autre])
                self.son("detonation")
            elif random.random() < 0.8:  # sa traînée d'étincelles
                self.feux.append([f[0], f[1] + 6, random.uniform(-20, 20), random.uniform(20, 60),
                                  0.4, 0.4, (255, 220, 150)])
        self.fusees = [f for f in self.fusees if f[4] is not None]
        for f in self.feux:
            f[2] *= 0.975  # l'air les freine
            f[3] = f[3] * 0.975 + 160 * DT
            f[0] += f[2] * DT
            f[1] += f[3] * DT
            f[4] -= DT
        self.feux = [f for f in self.feux if f[4] > 0]

    def dessiner_feux(self, e):
        for x, y, *_ in self.fusees:
            dessin.line(e, (255, 230, 170), (x, y), (x, y + 16), 3)
        for x, y, vx, vy, vie, depart, c in self.feux:
            u = vie / depart  # 1 au début, 0 quand elle s'éteint
            couleur = melange((60, 30, 50), melange(c, BLANC, 0.5 * u * u), min(1.0, u * 1.5))
            # une traînée dans le sens du mouvement, qui raccourcit quand elle ralentit
            dessin.line(e, couleur, (x - vx * 0.07, y - vy * 0.07), (x, y), 2 if u > 0.4 else 1)

    def vues(self):
        """Ce qu'on voit dans chaque fenêtre du château."""
        return {i: self.vignettes.get(i, self.sombres[i]) for i in range(len(FENETRES))}

    def tout_en_fete(self):
        """La fin : les salles qu'on n'a pas faites se mettent aussi en fête."""
        for i in range(len(NIVEAUX)):
            if i not in self.salles:
                p = Partie(i, self.son)
                for ch in p.choses:
                    ch.transformer()
                self.salles[i] = p

    def partir(self, depuis, vers):
        """Le voyage : de la colline (depuis None) ou d'une salle finie, vers une salle
        (ou vers None : la grande fête finale)."""
        partie, apres = None, None
        if vers is not None:
            partie, apres = Partie(vers, self.son), pygame.Surface((L * ZOOM, H * ZOOM))
            partie.dessiner(apres, apercu=True)
        self.voyage = {"depuis": depuis, "vers": vers, "t": 0.0, "partie": partie, "apres": apres}
        if depuis is not None:
            self.salles[depuis] = self.partie  # elle continue la fête
        self.etat = "voyage"
        self.son("saut")

    def phase_voyage(self):
        sortie, vol, _ = self.durees()
        t = self.voyage["t"]
        return "sortie" if t < sortie else "vol" if t < sortie + vol else "entree"

    def durees(self):
        v = self.voyage
        sortie = SORTIE if v["depuis"] is not None else 0.0
        vol = VOL if v["vers"] is not None else 0.0
        return sortie, vol, ENTREE if v["vers"] is not None else 0.0

    def ambiance(self):
        if self.etat == "jeu":
            p = self.partie
            return musique.ambiance_de(1.0 if p.gagne_t is not None else p.fete())
        if self.etat == "fin":
            return musique.FETE
        return musique.ambiance_de(len(self.salles) / len(NIVEAUX))

    def image(self, cmd=None):
        """Calcule et dessine une image du jeu."""
        echap = entree = False
        for ev in pygame.event.get():
            if ev.type == pygame.QUIT:
                self.quitter()
            elif ev.type in (pygame.JOYDEVICEADDED, pygame.JOYDEVICEREMOVED):
                self.entrees.rescanner()
            elif ev.type == pygame.KEYDOWN:
                if ev.key == pygame.K_ESCAPE:
                    echap = True
                elif ev.key == pygame.K_RETURN:
                    entree = True
                elif ev.key == pygame.K_f and self.rendu:
                    self.plein_ecran = not self.plein_ecran
                    if self.plein_ecran:
                        self.fenetre.set_fullscreen(True)
                    else:
                        self.fenetre.set_windowed()
                elif ev.key == pygame.K_m:
                    self.musique.active = not self.musique.active
                elif ev.key == pygame.K_c and self.etat == "titre":
                    self.regler()
                elif ev.key == pygame.K_r and self.etat == "jeu":
                    self.commencer()
        if cmd is None:
            cmd = self.entrees.lire()
        self.t += DT
        ok = entree or cmd.saut_presse or cmd.pause_presse
        if self.etat == "titre":
            self.titre_t += DT
            if cmd.gauche_presse or cmd.droite_presse:
                self.niveau = (self.niveau + cmd.droite_presse - cmd.gauche_presse) % len(NIVEAUX)
                self.son("clic")
            if ok and self.titre_t > 0.5:
                self.partir(None, self.niveau)
            elif echap:
                self.quitter()
        elif self.etat == "voyage":
            v = self.voyage
            v["t"] += DT
            sortie, vol, entree_ = self.durees()
            if ok and v["t"] > 0.4:  # on peut passer le voyage
                v["t"] = max(v["t"], sortie + vol + entree_)
            if v["vers"] is None and v["t"] >= sortie:
                self.etat, self.feux, self.fusees = "fin", [], []
                self.tout_en_fete()
                self.son("bravo")
            elif v["t"] >= sortie + vol + entree_:
                self.partie, self.niveau = v["partie"], v["vers"]
                self.etat, self.pause = "jeu", False
        elif self.etat == "fin":
            self.maj_feux()
            if ok or echap:
                self.etat, self.titre_t, self.niveau = "titre", 3.0, 0
                self.salles, self.vignettes = {}, {}
        elif self.etat == "jeu":
            p = self.partie
            if echap:
                self.etat, self.titre_t = "titre", 3.0
            elif p.gagne_t is not None and p.gagne_t > 2.5 and (cmd.saut_presse or entree):
                suivante = p.i_niveau + 1
                self.partir(p.i_niveau, suivante if suivante < len(NIVEAUX) else None)
            elif cmd.pause_presse or (self.pause and entree):
                self.pause = not self.pause
            elif not self.pause:
                p.maj(cmd)
        if self.etat != "jeu":
            self.animer_salles()
        self.musique.maj(self.ambiance(), DT)
        self.dessiner()

    def afficher(self):
        if self.rendu:
            self.texture.update(self.ecran)
            self.rendu.clear()
            self.texture.draw(dstrect=(0, 0, L * ZOOM, H * ZOOM))
            self.rendu.present()

    def lancer(self):
        while True:
            self.image()
            self.afficher()
            self.horloge.tick(60)

    # ---- dessin des écrans ----

    def dessiner(self):
        e = self.ecran
        if self.etat == "titre":
            self.dessiner_accueil(e)
        elif self.etat == "voyage":
            self.dessiner_voyage(e)
        elif self.etat == "fin":
            self.dehors.dessiner(e, self.t, self.vues(), set(self.salles))
            self.dessiner_feux(e)
            poser(e, anime("vampire", self.t), 640, 236 - 8 * abs(math.sin(self.t * 3)), echelle=0.8)
            ecrire(e, "Tout le château est en fête !", 76, OR, centre=(L // 2, 640))
            ecrire(e, f"{BOUTONS['saut'].capitalize()} : retour à l'accueil", 32, BLANC, centre=(L // 2, 695))
        else:
            self.partie.dessiner(e)
            if self.pause:
                voile = pygame.Surface(e.get_size(), pygame.SRCALPHA)
                voile.fill((10, 10, 30, 150))
                e.blit(voile, (0, 0))
                ecrire(e, "Pause", 90, BLANC, centre=(L // 2, 300))
                ecrire(e, f"{BOUTONS['pause'].capitalize()} : continuer   Échap : accueil   R : recommencer", 32, BLANC,
                       centre=(L // 2, 400))

    def dessiner_accueil(self, e):
        """Le vampire arrive au château en volant et se pose sur la colline."""
        self.dehors.dessiner(e, self.t, self.vues(), set(self.salles), cible=self.niveau)
        u = self.titre_t / 3.0
        if u < 1:
            x, y = bezier((-80, 160), ARRIVEE, doux(u), hauteur=60)
            poser(e, "vampire_saut@0", x, y - 19, echelle=0.6)
        else:
            poser(e, anime("vampire", self.t), ARRIVEE[0], ARRIVEE[1] - 19, echelle=0.6)
        ecrire(e, TITRE, 100, ORANGE, centre=(L // 2, 56))
        ecrire(e, "Rends le château tout beau pour Halloween !", 34, BLANC, centre=(L // 2, 116))
        ecrire(e, f"<   Salle {self.niveau + 1} : {NIVEAUX[self.niveau]['nom']}   >", 38, BLANC,
               centre=(L // 2, 608))
        ecrire(e, f"Appuie sur le {BOUTONS['saut']} pour commencer   (la croix : choisir la salle)",
               32, OR, centre=(L // 2, 650))
        ecrire(e, f"{self.entrees.nom()}      C : manettes   F : plein écran   M : musique   Échap : quitter",
               22, BLANC, centre=(L // 2, 696))

    def dessiner_voyage(self, e):
        v = self.voyage
        sortie, vol, _ = self.durees()
        t, vers = v["t"], v["vers"]
        self.dehors.dessiner(e, self.t, self.vues(), set(self.salles), cible=vers)
        if t < sortie:  # on recule : la salle finie (toujours en fête) rapetisse jusqu'à sa fenêtre
            self.salles[v["depuis"]].dessiner(self.ecran_salle, apercu=True)
            zoomer(e, self.ecran_salle, (0, 0, L, H), FENETRES[v["depuis"]], t / sortie)
        elif t < sortie + vol:  # le vampire vole jusqu'à la salle suivante
            depart = ARRIVEE if v["depuis"] is None else FENETRES[v["depuis"]].center
            u = doux((t - sortie) / vol)
            x, y = bezier(depart, FENETRES[vers].center, u)
            poser(e, "vampire_saut@0", x, y, FENETRES[vers].centerx < depart[0], echelle=0.6)
            ecrire(e, f"Salle {vers + 1} : {NIVEAUX[vers]['nom']}", 48, OR, centre=(L // 2, 640))
        else:  # on plonge dans la nouvelle salle
            zoomer(e, v["apres"], FENETRES[vers], (0, 0, L, H), (t - sortie - vol) / ENTREE)

    def regler(self):
        """Demande d'appuyer sur chaque bouton de chaque manette, puis enregistre."""
        ent = self.entrees
        consignes = {"gauche": "pousse la croix vers la GAUCHE",
                     "droite": "pousse la croix vers la DROITE",
                     "bas": "pousse la croix vers le BAS",
                     "saut": "appuie sur le bouton du BAS (sauter)",
                     "action": "appuie sur le bouton de DROITE (lancer un bonbon)",
                     "coucou": "appuie sur le bouton du HAUT (le couteau)",
                     "pause": "appuie sur le bouton de GAUCHE (pause)"}
        for i, joy in enumerate(ent.joys):
            liaisons = {}
            for action in manettes.ACTIONS:
                reference = manettes.instantane(joy)
                repos, calme, candidat, delai = None, 0.0, None, 0.0
                while True:
                    for ev in pygame.event.get():
                        if ev.type == pygame.QUIT:
                            self.quitter()
                        if ev.type == pygame.KEYDOWN and ev.key == pygame.K_ESCAPE:
                            return
                    if repos is None:  # on attend que tout soit relâché
                        if manettes.au_repos(joy, reference):
                            calme += DT
                            if calme > 0.4:
                                repos = reference
                        else:
                            calme, reference = 0.0, manettes.instantane(joy)
                    else:
                        trouve = manettes.detecter(joy, repos, [l[0] for l in liaisons.values()])
                        if trouve and trouve[0] != "a":
                            candidat, delai = trouve, 1.0
                        elif trouve and candidat is None:
                            candidat = trouve  # un axe : on laisse sa chance à un bouton
                        if candidat:
                            delai += DT
                            if delai > 0.12:
                                break
                    e = self.ecran
                    e.fill((30, 34, 70))
                    ecrire(e, "Réglage des manettes", 80, BLANC, centre=(L // 2, 130))
                    poser(e, anime("vampire", self.t), L // 2, 230)
                    ecrire(e, f"Manette {i + 1} — {joy.get_name()}", 40, BLANC,
                           centre=(L // 2, 300))
                    msg = consignes[action] if repos else "lâche tous les boutons…"
                    ecrire(e, msg, 52, OR, centre=(L // 2, 410))
                    ecrire(e, "Échap : annuler", 28, BLANC, centre=(L // 2, 640))
                    self.afficher()
                    self.horloge.tick(60)
                liaisons[action] = [candidat]
                self.son("clic")
            ent.enregistrer(i, liaisons)


if __name__ == "__main__":
    Jeu().lancer()
