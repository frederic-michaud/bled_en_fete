"""Halloween au Bled — un vampire met en fête le Bled, la coopérative où l'on habite.
Seul, à deux, ou parent et enfant, à la manette (base technique reprise de « Les Deux Amis »).

Lancer avec :  .venv/bin/python jeu.py
Les écrans (Jeu.etat) : « honneur » (le tableau d'honneur, au lancement : on choisit son
équipe ou on en crée une), « nom » (chacun écrit son nom), « confirmer » (recommencer une
partie finie ?), « titre » (le Bled vu de la cour : on choisit la salle), « voyage »
(d'une salle à l'autre), « jeu » (dans une salle) et « fin » (la grande fête).
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
import palmares
from dehors import ARRIVEE, ENTREE, FENETRES, SORTIE, VOL, Dehors, agrandi, bezier, doux, vignette, zoomer
from niveaux import BOUTONS, MODES, NIVEAUX
from outils import (BLANC, DT, FESTIF, H, L, OR, ORANGE, ZOOM, anime, dessin, ecrire,
                    melange, police, poser, preparer_images)
from partie import PERSONNAGES, Partie
from sons import creer_sons

TITRE = "Halloween au Bled"
# le clavier à l'écran pour écrire son nom à la manette
GRILLE = [list("ABCDEFGHIJ"), list("KLMNOPQRST"), list("UVWXYZ-"), ["Effacer", "C'est fini !"]]
NOM_MAX = 10
QUI = {"solo": ("Ton nom",), "duo": ("Joueur 1 : ton nom", "Joueur 2 : ton nom"),
       "parent": ("Le parent : ton nom", "L'enfant : ton nom")}


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
        self.etat = "honneur"     # honneur, nom, confirmer, titre, voyage, jeu ou fin
        self.partie = None
        self.equipes = palmares.lire()   # tous les joueurs du tableau d'honneur
        self.equipe = None        # l'équipe qui joue (un élément de self.equipes)
        self.choix = [0, 0]       # au tableau : la colonne (MODES) et la ligne (0 : « nouveau »)
        self.confirme = 1         # recommencer une partie finie : 0 oui, 1 non
        self.a_confirmer = None   # l'équipe finie qu'on propose de recommencer
        self.niveau = 0           # salle choisie à l'accueil
        self.ouvertes = 1         # on ne peut choisir que les salles déjà atteintes
        self.mode = "solo"        # seul, à deux (duo) ou parent et enfant (parent)
        self.noms = ["", ""]      # le nom de chaque joueur
        self.qui = 0              # le joueur qui écrit son nom
        self.curseur = [0, 0]     # la lettre choisie dans GRILLE (ligne, colonne)
        self.chrono = 0.0         # le temps passé dans les salles depuis le début de la partie
        self.pause = False
        self.t = 0.0
        self.titre_t = 0.0        # depuis quand on est à l'accueil (le vampire arrive)
        self.salles = {}          # salles mises en fête : elles continuent la fête, en aperçu
        self.vignettes = {}       # leur aperçu dans leur fenêtre du Bled
        self.tour_vignette = 0    # on refait un aperçu par image, chacun son tour
        self.ecran_salle = pygame.Surface((L * ZOOM, H * ZOOM))
        self.voyage = None
        self.fusees = []          # feux d'artifice de la fin : les fusées qui montent…
        self.feux = []            # … et les étincelles quand elles éclatent
        preparer_images()
        self.voile = pygame.Surface((L * ZOOM, H * ZOOM), pygame.SRCALPHA)  # derrière les menus
        self.voile.fill((8, 6, 20, 170))
        self.dehors = Dehors()
        self.sombres = []         # l'aperçu assombri de chaque salle, pas encore en fête
        for i, r in enumerate(FENETRES):
            Partie(i).dessiner(self.ecran_salle, apercu=True)
            self.sombres.append(vignette(self.ecran_salle, r, True))

    def son(self, nom):
        if nom in self.sons:
            self.sons[nom].play()

    def quitter(self):
        self.sauver()
        pygame.quit()
        sys.exit()

    # ---- les équipes du tableau d'honneur ----

    def sauver(self):
        """Garde où en est l'équipe qui joue (salles atteintes, temps)."""
        if self.equipe:
            self.equipe["ouvertes"], self.equipe["chrono"] = self.ouvertes, round(self.chrono, 1)
        palmares.enregistrer(self.equipes)

    def colonne(self):
        """Les équipes de la colonne choisie au tableau d'honneur."""
        return palmares.classement(self.equipes, MODES[self.choix[0]][0])

    def choisir_equipe(self, equipe):
        """Une équipe est choisie : finie, on demande avant de recommencer ; sinon on y va."""
        if equipe["fini"]:
            self.a_confirmer, self.etat, self.confirme = equipe, "confirmer", 1
            self.son("clic")
        else:
            self.charger(equipe)

    def charger(self, equipe):
        """Le Bled de cette équipe : ses salles déjà finies sont en fête, on reprend là
        où elle en était, avec les salles qu'elle avait atteintes."""
        if self.equipe is not equipe:
            self.sauver()  # celle qui jouait avant garde où elle en était
        self.equipe, self.mode = equipe, equipe["mode"]
        self.noms = equipe["noms"] + [""] * (2 - len(equipe["noms"]))
        self.ouvertes, self.chrono = equipe["ouvertes"], equipe["chrono"]
        self.niveau = self.ouvertes - 1
        self.salles, self.vignettes = {}, {}
        for i in range(self.ouvertes - 1):
            p = Partie(i, self.son, self.mode)
            for ch in p.choses:
                ch.transformer()
            p.fete_vue = 1.0
            self.salles[i] = p
            p.dessiner(self.ecran_salle, apercu=True)
            self.vignettes[i] = vignette(self.ecran_salle, FENETRES[i], False)
        self.etat, self.titre_t = "titre", 0.0
        self.son("clic")

    def recommencer_equipe(self):
        """Une équipe qui avait fini repart de la première salle (elle garde son meilleur temps)."""
        self.sauver()  # celle qui jouait avant garde où elle en était
        e = self.a_confirmer
        e["fini"], e["ouvertes"], e["chrono"] = False, 1, 0.0
        palmares.enregistrer(self.equipes)
        self.charger(e)

    def commencer(self, i_niveau=None):
        if i_niveau is not None:
            self.niveau = i_niveau
        self.partie = Partie(self.niveau, self.son, self.mode)
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
            x = random.uniform(160, 1120)
            penche = random.uniform(80, 240) * (1 if x < L / 2 else -1) * random.choice((1, 1, -0.5))
            self.fusees.append([x, 600.0, penche, -random.uniform(560, 680),
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
        for x, y, vx, vy, *_ in self.fusees:  # la fusée, penchée dans le sens où elle file
            v = math.hypot(vx, vy) or 1
            dessin.line(e, (255, 230, 170), (x, y), (x - vx / v * 16, y - vy / v * 16), 3)
        for x, y, vx, vy, vie, depart, c in self.feux:
            u = vie / depart  # 1 au début, 0 quand elle s'éteint
            couleur = melange((60, 30, 50), melange(c, BLANC, 0.5 * u * u), min(1.0, u * 1.5))
            # une traînée dans le sens du mouvement, qui raccourcit quand elle ralentit
            dessin.line(e, couleur, (x - vx * 0.07, y - vy * 0.07), (x, y), 2 if u > 0.4 else 1)

    def vues(self):
        """Ce qu'on voit dans chaque fenêtre du Bled."""
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
            partie, apres = Partie(vers, self.son, self.mode), pygame.Surface((L * ZOOM, H * ZOOM))
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

    def joueurs(self):
        return 1 if self.mode == "solo" else 2

    def image(self, cmds=None):
        """Calcule et dessine une image du jeu. cmds : une Commande par joueur (ou une
        seule) ; sans rien, on lit les manettes et le clavier."""
        echap = entree = False
        tape = []  # ce qu'on tape au clavier en écrivant son nom
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
                elif self.etat == "nom":
                    tape.append("Effacer" if ev.key == pygame.K_BACKSPACE else ev.unicode)
                elif ev.key == pygame.K_f and self.rendu:
                    self.plein_ecran = not self.plein_ecran
                    if self.plein_ecran:
                        self.fenetre.set_fullscreen(True)
                    else:
                        self.fenetre.set_windowed()
                elif ev.key == pygame.K_m:
                    self.musique.active = not self.musique.active
                elif ev.key == pygame.K_c and self.etat in ("titre", "honneur"):
                    self.regler()
                elif ev.key == pygame.K_r and self.etat == "jeu":
                    self.commencer()
        if cmds is None:
            cmds = self.entrees.lire(self.joueurs(), clavier=self.etat != "nom")
        elif isinstance(cmds, manettes.Commande):
            cmds = [cmds]
        cmd = manettes.ensemble(cmds)  # pour les menus : n'importe quel joueur
        self.t += DT
        ok = entree or cmd.saut_presse or cmd.pause_presse
        if self.etat == "honneur":
            self.maj_honneur(cmd, entree)
            if echap:
                self.quitter()
        elif self.etat == "confirmer":
            if cmd.gauche_presse or cmd.droite_presse:
                self.confirme = 1 - self.confirme
                self.son("clic")
            if (entree or cmd.saut_presse) and self.confirme == 0:
                self.recommencer_equipe()
            elif entree or cmd.saut_presse or cmd.pause_presse or echap:
                self.etat = "honneur"
        elif self.etat == "titre":
            self.titre_t += DT
            if cmd.gauche_presse or cmd.droite_presse:
                choix = (self.niveau + cmd.droite_presse - cmd.gauche_presse) % self.ouvertes
                if choix != self.niveau:
                    self.niveau = choix
                    self.son("clic")
            if self.titre_t > 0.3 and (entree or cmd.saut_presse):
                self.partir(None, self.niveau)
            elif echap or cmd.pause_presse:  # retour au tableau d'honneur
                self.sauver()
                self.etat = "honneur"
        elif self.etat == "nom":
            self.maj_nom(cmds[min(self.qui, len(cmds) - 1)], tape, entree)
            if echap:
                self.etat = "honneur"
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
                e = self.equipe
                e["fini"] = True
                if e["meilleur"] is None or self.chrono < e["meilleur"]:
                    e["meilleur"] = round(self.chrono, 1)
                self.sauver()
            elif v["t"] >= sortie + vol + entree_:
                self.partie, self.niveau = v["partie"], v["vers"]
                self.etat, self.pause = "jeu", False
        elif self.etat == "fin":
            self.maj_feux()
            if ok or echap:  # retour au tableau d'honneur, sur l'équipe qui vient de finir
                self.etat = "honneur"
                self.choix = [[m for m, _, _ in MODES].index(self.mode), self.colonne_de(self.equipe)]
                self.salles, self.vignettes = {}, {}
        elif self.etat == "jeu":
            p = self.partie
            if echap:
                self.sauver()
                self.etat, self.titre_t = "titre", 1.0
            elif p.gagne_t is not None and p.gagne_t > 2.5 and (cmd.saut_presse or entree):
                suivante = p.i_niveau + 1
                self.ouvertes = max(self.ouvertes, min(suivante + 1, len(NIVEAUX)))
                self.partir(p.i_niveau, suivante if suivante < len(NIVEAUX) else None)
                self.sauver()
            elif cmd.pause_presse or (self.pause and entree):
                self.pause = not self.pause
            elif not self.pause:
                p.maj(cmds)
                if p.gagne_t is None:
                    self.chrono += DT
        if self.etat != "jeu":
            self.animer_salles()
        self.musique.maj(self.ambiance(), DT)
        self.dessiner()

    def colonne_de(self, equipe):
        """La ligne de cette équipe dans sa colonne (0 est « nouveau »)."""
        return 1 + palmares.classement(self.equipes, equipe["mode"]).index(equipe)

    def maj_honneur(self, cmd, entree):
        """Le tableau d'honneur : la croix choisit une colonne (seul, à deux, parent et
        enfant) et une ligne ; le bouton du bas crée une équipe ou choisit celle-là."""
        avant = list(self.choix)
        col, ligne = self.choix
        if cmd.gauche_presse or cmd.droite_presse:
            col = (col + cmd.droite_presse - cmd.gauche_presse) % len(MODES)
        self.choix[0] = col
        n = len(self.colonne()) + 1
        if cmd.haut_presse or cmd.bas_presse:
            ligne = (ligne + cmd.bas_presse - cmd.haut_presse) % n
        self.choix = [col, min(ligne, n - 1)]
        if self.choix != avant:
            self.son("clic")
        ligne = self.choix[1]
        if entree or cmd.saut_presse:
            if ligne == 0:  # une nouvelle équipe : chacun écrit son nom
                self.mode, self.noms, self.equipe = MODES[col][0], ["", ""], None
                self.ecrire_nom(0)
            else:
                self.choisir_equipe(self.colonne()[ligne - 1])

    def ecrire_nom(self, qui):
        """Le joueur qui écrit son nom ; s'il en a déjà un, on se place sur « C'est fini »."""
        self.etat, self.qui = "nom", qui
        self.curseur = [3, 1] if self.noms[qui] else [0, 0]
        self.son("clic")

    def maj_nom(self, cmd, tape, entree):
        """Le clavier à l'écran : la croix choisit une lettre, le bouton du bas l'écrit.
        On peut aussi taper son nom au clavier (Entrée pour finir)."""
        ligne, col = self.curseur
        if cmd.haut_presse or cmd.bas_presse:
            avant = len(GRILLE[ligne]) - 1
            ligne = (ligne + cmd.bas_presse - cmd.haut_presse) % len(GRILLE)
            col = round(col / max(1, avant) * (len(GRILLE[ligne]) - 1))
        if cmd.gauche_presse or cmd.droite_presse:
            col = (col + cmd.droite_presse - cmd.gauche_presse) % len(GRILLE[ligne])
        if (ligne, col) != tuple(self.curseur):
            self.son("clic")
        self.curseur = [ligne, col]
        if cmd.saut_presse:
            tape.append(GRILLE[ligne][col])
        if entree:
            tape.append("C'est fini !")
        if cmd.pause_presse:
            tape.append("Effacer")
        nom = self.noms[self.qui]
        for t in tape:
            if t == "Effacer":
                nom = nom[:-1]
            elif t == "C'est fini !":
                if not nom.strip("-"):
                    self.son("vide")  # il faut au moins une lettre
                    continue
                self.noms[self.qui] = nom
                if self.qui + 1 < self.joueurs():
                    self.ecrire_nom(self.qui + 1)
                else:  # une équipe qui existe déjà (mêmes noms) est reprise, sinon on la crée
                    noms = self.noms[:self.joueurs()]
                    equipe = next((e for e in self.equipes if e["mode"] == self.mode and e["noms"] == noms), None)
                    if equipe is None:
                        equipe = palmares.nouvelle(self.mode, noms)
                        self.equipes.append(equipe)
                        palmares.enregistrer(self.equipes)
                    self.choix = [[m for m, _, _ in MODES].index(self.mode), self.colonne_de(equipe)]
                    self.choisir_equipe(equipe)
                return
            elif len(t) == 1 and (t.isalpha() or t == "-") and len(nom) < NOM_MAX:
                nom += t.upper() if not nom or nom[-1] == "-" else t.lower()
                self.son("clic")
        self.noms[self.qui] = nom

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
        elif self.etat in ("nom", "honneur", "confirmer"):
            self.dehors.dessiner(e, self.t, self.vues(), set(self.salles))
            e.blit(self.voile, (0, 0))
            {"nom": self.dessiner_nom, "honneur": self.dessiner_honneur,
             "confirmer": self.dessiner_confirmer}[self.etat](e)
        elif self.etat == "voyage":
            self.dessiner_voyage(e)
        elif self.etat == "fin":
            self.dehors.dessiner(e, self.t, self.vues(), set(self.salles))
            self.dessiner_feux(e)
            self.dessiner_danse(e)
            ecrire(e, "Tout le Bled est en fête !", 76, OR, centre=(L // 2, 620))
            ecrire(e, f"En {palmares.duree(self.chrono)} !   "
                      f"{BOUTONS['saut'].capitalize()} : le tableau d'honneur", 32, BLANC, centre=(L // 2, 685))
        else:
            self.partie.dessiner(e)
            if self.equipe:  # le temps, dans la frise, tout à droite
                dessin.rect(e, (20, 16, 34), (1160, 8, 110, 64), border_radius=18)
                m, sec = divmod(int(self.chrono), 60)
                ecrire(e, f"{m}:{sec:02d}", 34, BLANC, centre=(1215, 41))
            if self.pause:
                voile = pygame.Surface(e.get_size(), pygame.SRCALPHA)
                voile.fill((10, 10, 30, 150))
                e.blit(voile, (0, 0))
                ecrire(e, "Pause", 90, BLANC, centre=(L // 2, 300))
                ecrire(e, f"{BOUTONS['pause'].capitalize()} : continuer   Échap : le Bled   R : recommencer", 32, BLANC,
                       centre=(L // 2, 400))

    def dessiner_accueil(self, e):
        """Le Bled vu de la cour, avec les personnages de l'équipe posés dans la cour ;
        on choisit la salle parmi celles déjà atteintes."""
        self.dehors.dessiner(e, self.t, self.vues(), set(self.salles), cible=self.niveau)
        for k, (nom, _) in reversed(list(enumerate(PERSONNAGES[self.mode]))):
            echelle = 0.6 if nom != "petit" else 0.45
            poser(e, anime(nom, self.t + k), ARRIVEE[0] + 34 * k, ARRIVEE[1] - 32 * echelle, echelle=echelle)
        ecrire(e, TITRE, 100, ORANGE, centre=(L // 2, 64))
        salle = f"{' et '.join(self.noms[:self.joueurs()])} — Salle {self.niveau + 1} : {NIVEAUX[self.niveau]['nom']}"
        consigne = f"Appuie sur le {BOUTONS['saut']} pour commencer"
        if self.ouvertes > 1:
            salle = f"<   {salle}   >"
            consigne += "   (la croix : choisir la salle)"
        ecrire(e, salle, 38, BLANC, centre=(L // 2, 624))
        ecrire(e, consigne, 32, OR, centre=(L // 2, 664))

    def dessiner_danse(self, e):
        """La fin : les personnages dansent sur la terrasse du 5e (ils sautillent, se
        dandinent et se retournent en rythme)."""
        r, dh = FENETRES[3], self.dehors
        sol = agrandi(0, dh.REZ - dh.BASSE[2] * dh.ETAGE - 7)[1]  # le sol de la terrasse
        for k, (nom, _) in enumerate(PERSONNAGES[self.mode]):
            t = self.t * 2.2 + k * 0.5
            saut = 14 * abs(math.sin(t * math.pi))
            echelle = 0.7 if nom != "petit" else 0.52
            image = f"{nom}_saut@0" if saut > 9 else anime(nom, self.t)
            x = r.centerx - 30 + 60 * k + 10 * math.sin(t * math.pi / 2)
            poser(e, image, x, sol - 32 * echelle - saut, int(t) % 2 == 1, angle=12 * math.sin(t * math.pi),
                  echelle=echelle)

    def dessiner_perso(self, e, mode, k, x, y, echelle=1.0):
        """Le personnage k d'une façon de jouer, qui sautille."""
        nom = PERSONNAGES[mode][k][0]
        poser(e, anime(nom, self.t + k), x, y - 6 * abs(math.sin(self.t * 3 + k)), k == 1, echelle=echelle)

    def dessiner_nom(self, e):
        ecrire(e, QUI[self.mode][self.qui], 70, ORANGE, centre=(L // 2, 80))
        self.dessiner_perso(e, self.mode, self.qui, 360, 190, 1.8)
        nom = self.noms[self.qui]
        dessin.rect(e, (22, 18, 36), (440, 150, 400, 80), border_radius=18)
        dessin.rect(e, OR, (440, 150, 400, 80), 3, border_radius=18)
        curseur = "_" if int(self.t * 2) % 2 and len(nom) < NOM_MAX else " "
        ecrire(e, nom + curseur, 56, BLANC, centre=(640, 192))
        for i, ligne in enumerate(GRILLE):
            large = len(ligne) == 2
            pas = 260 if large else 72
            for j, texte in enumerate(ligne):
                x = L // 2 + (j - (len(ligne) - 1) / 2) * pas
                y = 300 + i * 80
                w = 240 if large else 62
                choisi = [i, j] == self.curseur
                dessin.rect(e, (60, 44, 90) if choisi else (30, 24, 46), (x - w / 2, y - 30, w, 60), border_radius=12)
                if choisi:
                    dessin.rect(e, OR, (x - w / 2, y - 30, w, 60), 3, border_radius=12)
                ecrire(e, texte, 34 if large else 44, OR if choisi else BLANC, centre=(x, y))
        ecrire(e, f"La croix : choisir une lettre   {BOUTONS['saut'].capitalize()} : l'écrire   "
                  f"{BOUTONS['pause'].capitalize()} : effacer", 30, OR, centre=(L // 2, 640))
        ecrire(e, "(ou tape ton nom au clavier, puis Entrée)", 24, BLANC, centre=(L // 2, 680))

    def dessiner_honneur(self, e):
        """Le tableau d'honneur : une colonne par façon de jouer, avec « nouveau » en haut,
        puis chaque équipe, son meilleur temps ou la salle où elle en est."""
        ecrire(e, "Le tableau d'honneur", 76, ORANGE, centre=(L // 2, 56))
        ecrire(e, "Choisis ton nom, ou crée un nouveau joueur", 30, BLANC, centre=(L // 2, 108))
        visibles = 9
        for k, (mode, nom, _) in enumerate(MODES):
            x, active = L // 2 + (k - 1) * 415, k == self.choix[0]
            dessin.rect(e, (30, 24, 48) if active else (22, 18, 36), (x - 200, 136, 400, 500), border_radius=24)
            if active:
                dessin.rect(e, (90, 76, 120), (x - 200, 136, 400, 500), 2, border_radius=24)
            persos = PERSONNAGES[mode]
            for i in range(len(persos)):
                self.dessiner_perso(e, mode, i, x - 150 + i * 34, 172, 0.6 if persos[i][0] != "petit" else 0.45)
            ecrire(e, nom, 40, OR, centre=(x + 20, 172))
            equipes = palmares.classement(self.equipes, mode)
            lignes = ["+ Nouveau joueur" if mode == "solo" else "+ Nouvelle équipe"] + equipes
            haut = max(0, min(self.choix[1] - visibles + 2, len(lignes) - visibles)) if active else 0
            for i, ligne in enumerate(lignes[haut:haut + visibles]):
                n = haut + i
                y = 222 + i * 44
                choisi = active and n == self.choix[1]
                if choisi:
                    dessin.rect(e, (64, 48, 96), (x - 190, y - 20, 380, 40), border_radius=12)
                    dessin.rect(e, OR, (x - 190, y - 20, 380, 40), 2, border_radius=12)
                if n == 0:
                    ecrire(e, ligne, 28, OR if choisi else (190, 230, 190), centre=(x, y))
                    continue
                noms = " et ".join(ligne["noms"])
                if ligne["meilleur"] is not None:
                    droite, couleur_d = palmares.duree(ligne["meilleur"]), OR
                else:
                    droite, couleur_d = f"salle {ligne['ouvertes']} / {len(NIVEAUX)}", (170, 160, 190)
                if ligne["meilleur"] is not None and not ligne["fini"]:
                    droite = f"salle {ligne['ouvertes']}  ·  {droite}"
                place = 330 - police(26).size(droite)[0] / ZOOM
                taille = 28 if police(28).size(noms)[0] / ZOOM < place else 20
                ecrire(e, noms, taille, BLANC, gauche=(x - 178, y - 9 if taille == 28 else y - 6))
                ecrire(e, droite, 26, couleur_d, gauche=(x + 180 - police(26).size(droite)[0] / ZOOM, y - 9))
            if haut + visibles < len(lignes):
                ecrire(e, "…", 30, BLANC, centre=(x, 620))
        ecrire(e, f"La croix : choisir   {BOUTONS['saut'].capitalize()} : jouer", 32, OR, centre=(L // 2, 676))

    def dessiner_confirmer(self, e):
        eq = self.a_confirmer
        ecrire(e, " et ".join(eq["noms"]), 64, ORANGE, centre=(L // 2, 200))
        ecrire(e, "Vous avez déjà mis tout le Bled en fête !", 36, BLANC, centre=(L // 2, 280))
        ecrire(e, f"Meilleur temps : {palmares.duree(eq['meilleur'])}", 32, OR, centre=(L // 2, 330))
        ecrire(e, "Recommencer depuis la première salle ?", 44, BLANC, centre=(L // 2, 420))
        for k, texte in enumerate(("Oui", "Non")):
            x = L // 2 + (k - 0.5) * 260
            choisi = k == self.confirme
            dessin.rect(e, (64, 48, 96) if choisi else (30, 24, 46), (x - 100, 470, 200, 64), border_radius=14)
            if choisi:
                dessin.rect(e, OR, (x - 100, 470, 200, 64), 3, border_radius=14)
            ecrire(e, texte, 40, OR if choisi else BLANC, centre=(x, 502))
        ecrire(e, "(le meilleur temps est gardé)", 26, (190, 180, 210), centre=(L // 2, 580))
        ecrire(e, f"La croix : choisir   {BOUTONS['saut'].capitalize()} : valider", 30, OR, centre=(L // 2, 660))

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
            for k, (nom, _) in reversed(list(enumerate(PERSONNAGES[self.mode]))):  # l'autre suit
                x, y = bezier(depart, FENETRES[vers].center, max(0.0, u - 0.08 * k))
                poser(e, nom + "_saut@0", x, y, FENETRES[vers].centerx < depart[0], echelle=0.6)
            ecrire(e, f"Salle {vers + 1} : {NIVEAUX[vers]['nom']}", 48, OR, centre=(L // 2, 640))
        else:  # on plonge dans la nouvelle salle
            zoomer(e, v["apres"], FENETRES[vers], (0, 0, L, H), (t - sortie - vol) / ENTREE)

    def regler(self):
        """Demande d'appuyer sur chaque bouton de chaque manette, puis enregistre."""
        ent = self.entrees
        consignes = {"gauche": "pousse la croix vers la GAUCHE",
                     "droite": "pousse la croix vers la DROITE",
                     "haut": "pousse la croix vers le HAUT",
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
