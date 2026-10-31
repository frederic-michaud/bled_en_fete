// Halloween au Bled — un vampire met en fête le Bled, la coopérative où l'on habite.
// Seul, à deux, ou parent et enfant, au clavier ou à la manette (port de jeu.py).
//
// Les écrans (Jeu.etat) : « honneur » (le tableau d'honneur, au lancement : on choisit son
// équipe ou on en crée une), « nom » (chacun écrit son nom), « confirmer » (recommencer une
// partie finie ?), « titre » (le Bled vu de la cour : on choisit la salle), « voyage »
// (d'une salle à l'autre), « jeu » (dans une salle), « fin » (la grande fête) et
// « touches » (régler les touches du clavier, depuis le tableau d'honneur : touche T).
// Dans le navigateur : pas de réglage des manettes (touche C) ni de « quitter ».
import { Commande, ensemble } from "./commandes.js";
import { Entrees } from "./entrees.js";
import { Musique, ambiance_de, FETE } from "./musique.js";
import * as palmares from "./palmares.js";
import { ARRIVEE, ENTREE, FENETRES, SORTIE, VOL, Dehors, agrandi, bezier, doux, vignette, zoomer } from "./dehors.js";
import { BOUTONS, CROIX, MODES, NIVEAUX, VALIDER, le, majuscule } from "./niveaux.js";
import { REGLABLES, RESERVEES, changer, nom_court, remettre, resume, touches } from "./touches.js";
import { BLANC, DT, ECHELLE, FESTIF, H, L, OR, ORANGE, aleatoire, anime, arrondi, coller, css, dessin,
         ecrire, largeur_texte, melange, poser, toile } from "./outils.js";
import { PERSONNAGES, Partie } from "./partie.js";
import { creer_sons } from "./sons.js";

export const TITRE = "Halloween au Bled";
// le clavier à l'écran pour écrire son nom à la manette
export const GRILLE = [[..."ABCDEFGHIJ"], [..."KLMNOPQRST"], [..."UVWXYZ-"], ["Effacer", "En route !"]];
export const NOM_MAX = 10;
export const QUI = { solo: ["Ton nom"], duo: ["Joueur 1 : ton nom", "Joueur 2 : ton nom"],
                     parent: ["Le parent : ton nom", "L'enfant : ton nom"] };

const TAU = Math.PI * 2;
const mod = (a, n) => ((a % n) + n) % n;              // le % de Python (jamais négatif)
const au_dixieme = x => Math.round(x * 10) / 10;      // round(x, 1)
const deux = n => String(n).padStart(2, "0");
const memes_noms = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Une copie d'une toile (la Surface.copy de pygame). */
function copie(source) {
  const t = toile(source.w, source.h);
  t.ctx.save();
  t.ctx.setTransform(1, 0, 0, 1, 0, 0);
  t.ctx.drawImage(source.canvas, 0, 0);
  t.ctx.restore();
  return t;
}

/** Remplit tout l'écran d'une couleur [r, g, b, a] (a de 0 à 255). */
function voiler(ctx, couleur) {
  ctx.fillStyle = css(couleur);
  ctx.fillRect(0, 0, L, H);
}

export class Jeu {
  /** canvas : le canvas de la page (1280 x 720 points × ECHELLE) ; sans canvas, le jeu
   * dessine sur une toile hors écran (essais). */
  constructor(canvas = null) {
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.setTransform(ECHELLE, 0, 0, ECHELLE, 0, 0);
      this.ecran = { canvas, ctx, w: L, h: H };
    } else {
      this.ecran = toile(L, H);
    }
    this.retard = 0.0         // le temps réel pas encore rattrapé (voir avancer)
    this.fond_menu = null;    // le Bled assombri derrière les menus, dessiné une fois
    this.sons = creer_sons();
    this.musique = new Musique();
    this.entrees = new Entrees();
    this.etat = "honneur";    // honneur, nom, confirmer, titre, voyage, jeu ou fin
    this.partie = null;
    this.equipes = palmares.lire();   // tous les joueurs du tableau d'honneur
    this.equipe = null;       // l'équipe qui joue (un élément de this.equipes)
    this.choix = [0, 0];      // au tableau : la colonne (MODES) et la ligne (0 : « nouveau »)
    this.confirme = 1;        // recommencer une partie finie : 0 oui, 1 non
    this.a_confirmer = null;  // l'équipe finie qu'on propose de recommencer
    this.niveau = 0;          // salle choisie à l'accueil
    this.ouvertes = 1;        // on ne peut choisir que les salles déjà atteintes
    this.mode = "solo";       // seul, à deux (duo) ou parent et enfant (parent)
    this.noms = ["", ""];     // le nom de chaque joueur
    this.qui = 0;             // le joueur qui écrit son nom
    this.reglage = [0, 0];    // écran des touches : le joueur (colonne) et l'action (ligne)
    this.attente = false;     // on attend la nouvelle touche de l'action choisie
    this.touche_lue = null;   // la touche appuyée pendant cette attente
    this.curseur = [0, 0];    // la lettre choisie dans GRILLE (ligne, colonne)
    this.chrono = 0.0;        // le temps passé dans les salles depuis le début de la partie
    this.pause = false;
    this.t = 0.0;
    this.titre_t = 0.0;       // depuis quand on est à l'accueil
    this.salles = {};         // salles mises en fête : elles continuent la fête, en aperçu
    this.vignettes = {};      // leur aperçu dans leur fenêtre du Bled
    this.tour_vignette = 0;   // on refait un aperçu par image, chacun son tour
    this.ecran_salle = toile(L, H);
    this.voyage = null;
    this.fusees = [];         // feux d'artifice de la fin : les fusées qui montent…
    this.feux = [];           // … et les étincelles quand elles éclatent
    this.dehors = new Dehors();
    this.sombres = [];        // l'aperçu assombri de chaque salle, pas encore en fête
    FENETRES.forEach((r, i) => {
      new Partie(i).dessiner(this.ecran_salle.ctx, true);
      this.sombres.push(vignette(this.ecran_salle, r, true));
    });
  }

  son(nom) {
    if (nom in this.sons) this.sons[nom].play();
  }

  /** Dans un navigateur, on ferme simplement la page : on garde juste où l'on en est. */
  quitter() {
    this.sauver();
  }

  // ---- les équipes du tableau d'honneur ----

  /** Garde où en est l'équipe qui joue (salles atteintes, temps). */
  sauver() {
    if (this.equipe) {
      this.equipe.ouvertes = this.ouvertes;
      this.equipe.chrono = au_dixieme(this.chrono);
    }
    palmares.enregistrer(this.equipes);
  }

  /** Les équipes de la colonne choisie au tableau d'honneur. */
  colonne() {
    return palmares.classement(this.equipes, MODES[this.choix[0]][0]);
  }

  /** Une équipe est choisie : finie, on demande avant de recommencer ; sinon on y va. */
  choisir_equipe(equipe) {
    if (equipe.fini) {
      this.a_confirmer = equipe;
      this.etat = "confirmer";
      this.confirme = 1;
      this.son("clic");
    } else {
      this.charger(equipe);
    }
  }

  /** Le Bled de cette équipe : ses salles déjà finies sont en fête, on reprend là où elle
   * en était, avec les salles qu'elle avait atteintes. */
  charger(equipe) {
    if (this.equipe !== equipe) this.sauver();  // celle qui jouait avant garde où elle en était
    this.equipe = equipe;
    this.mode = equipe.mode;
    this.noms = [...equipe.noms, "", ""].slice(0, Math.max(2, equipe.noms.length));
    this.ouvertes = equipe.ouvertes;
    this.chrono = equipe.chrono;
    this.niveau = this.ouvertes - 1;
    this.salles = {};
    this.vignettes = {};
    for (let i = 0; i < this.ouvertes - 1; i++) {
      const p = new Partie(i, nom => this.son(nom), this.mode);
      for (const ch of p.choses) ch.transformer();
      p.fete_vue = 1.0;
      this.salles[i] = p;
      p.dessiner(this.ecran_salle.ctx, true);
      this.vignettes[i] = vignette(this.ecran_salle, FENETRES[i], false);
    }
    this.etat = "titre";
    this.titre_t = 0.0;
    this.son("clic");
  }

  /** Une équipe qui avait fini repart de la première salle (elle garde son meilleur temps). */
  recommencer_equipe() {
    this.sauver();  // celle qui jouait avant garde où elle en était
    const e = this.a_confirmer;
    e.fini = false;
    e.ouvertes = 1;
    e.chrono = 0.0;
    palmares.enregistrer(this.equipes);
    this.charger(e);
  }

  commencer(i_niveau = null) {
    if (i_niveau !== null) this.niveau = i_niveau;
    this.partie = new Partie(this.niveau, nom => this.son(nom), this.mode);
    this.etat = "jeu";
    this.pause = false;
    this.son("clic");
  }

  /** Les indices des salles finies, dans l'ordre. */
  indices_salles() {
    return Object.keys(this.salles).map(Number).sort((a, b) => a - b);
  }

  /** Les salles finies continuent la fête, même vues de dehors. */
  animer_salles() {
    for (const p of Object.values(this.salles)) p.maj(new Commande());
    const zoom = this.etat === "voyage" && this.phase_voyage() !== "vol";
    this.tour_vignette += 1;
    const indices = this.indices_salles();
    if (indices.length && this.tour_vignette % 3 === 0 && !zoom) {
      const i = indices[Math.floor(this.tour_vignette / 3) % indices.length];
      this.salles[i].dessiner(this.ecran_salle.ctx, true);
      this.vignettes[i] = vignette(this.ecran_salle, FENETRES[i], false);
    }
  }

  /** Les feux d'artifice : une fusée monte en sifflant, éclate en étincelles qui
   * ralentissent, retombent et s'éteignent. */
  maj_feux() {
    const hasard = aleatoire;
    if (hasard.random() < 1.1 * DT) {
      const x = hasard.uniform(160, 1120);
      const penche = hasard.uniform(80, 240) * (x < L / 2 ? 1 : -1) * hasard.choice([1, 1, -0.5]);
      this.fusees.push([x, 600.0, penche, -hasard.uniform(560, 680),
                        hasard.uniform(90, 260), hasard.choice(FESTIF)]);
      this.son("fusee");
    }
    for (const f of this.fusees) {
      f[0] += f[2] * DT;
      f[1] += f[3] * DT;
      f[3] += 300 * DT;
      if (f[1] <= f[4] || f[3] > -80) {  // elle éclate
        f[4] = null;
        const autre = hasard.choice(FESTIF);
        for (let k = 0; k < 48; k++) {
          const a = k * TAU / 48 + hasard.uniform(-0.05, 0.05), w = hasard.uniform(170, 260);
          const vie = hasard.uniform(1.1, 1.6);
          this.feux.push([f[0], f[1], Math.cos(a) * w, Math.sin(a) * w, vie, vie, k % 3 ? f[5] : autre]);
        }
        this.son("detonation");
      } else if (hasard.random() < 0.8) {  // sa traînée d'étincelles
        this.feux.push([f[0], f[1] + 6, hasard.uniform(-20, 20), hasard.uniform(20, 60),
                        0.4, 0.4, [255, 220, 150]]);
      }
    }
    this.fusees = this.fusees.filter(f => f[4] !== null);
    for (const f of this.feux) {
      f[2] *= 0.975;  // l'air les freine
      f[3] = f[3] * 0.975 + 160 * DT;
      f[0] += f[2] * DT;
      f[1] += f[3] * DT;
      f[4] -= DT;
    }
    this.feux = this.feux.filter(f => f[4] > 0);
  }

  dessiner_feux(e) {
    for (const [x, y, vx, vy] of this.fusees) {  // la fusée, penchée dans le sens où elle file
      const v = Math.hypot(vx, vy) || 1;
      dessin.line(e, [255, 230, 170], [x, y], [x - vx / v * 16, y - vy / v * 16], 3);
    }
    for (const [x, y, vx, vy, vie, depart, c] of this.feux) {
      const u = vie / depart;  // 1 au début, 0 quand elle s'éteint
      const couleur = melange([60, 30, 50], melange(c, BLANC, 0.5 * u * u), Math.min(1.0, u * 1.5));
      // une traînée dans le sens du mouvement, qui raccourcit quand elle ralentit
      dessin.line(e, couleur, [x - vx * 0.07, y - vy * 0.07], [x, y], u > 0.4 ? 2 : 1);
    }
  }

  /** Ce qu'on voit dans chaque fenêtre du Bled. */
  vues() {
    const v = {};
    FENETRES.forEach((_, i) => { v[i] = this.vignettes[i] || this.sombres[i]; });
    return v;
  }

  allumees() {
    return new Set(this.indices_salles());
  }

  /** La fin : les salles qu'on n'a pas faites se mettent aussi en fête. */
  tout_en_fete() {
    for (let i = 0; i < NIVEAUX.length; i++) {
      if (!(i in this.salles)) {
        const p = new Partie(i, nom => this.son(nom));
        for (const ch of p.choses) ch.transformer();
        this.salles[i] = p;
      }
    }
  }

  /** Le voyage : de la cour (depuis null) ou d'une salle finie, vers une salle (ou vers
   * null : la grande fête finale). */
  partir(depuis, vers) {
    let partie = null, apres = null;
    if (vers !== null) {
      partie = new Partie(vers, nom => this.son(nom), this.mode);
      apres = toile(L, H);
      partie.dessiner(apres.ctx, true);
    }
    this.voyage = { depuis, vers, t: 0.0, partie, apres };
    if (depuis !== null) this.salles[depuis] = this.partie;  // elle continue la fête
    this.etat = "voyage";
    this.son("saut");
  }

  phase_voyage() {
    const [sortie, vol] = this.durees();
    const t = this.voyage.t;
    return t < sortie ? "sortie" : t < sortie + vol ? "vol" : "entree";
  }

  durees() {
    const v = this.voyage;
    return [v.depuis !== null ? SORTIE : 0.0, v.vers !== null ? VOL : 0.0, v.vers !== null ? ENTREE : 0.0];
  }

  ambiance() {
    if (this.etat === "jeu") {
      const p = this.partie;
      return ambiance_de(p.gagne_t !== null ? 1.0 : p.fete());
    }
    if (this.etat === "fin") return FETE;
    return ambiance_de(Object.keys(this.salles).length / NIVEAUX.length);
  }

  joueurs() {
    return this.mode === "solo" ? 1 : 2;
  }

  /** Fait avancer le jeu du temps réellement écoulé (secondes), par pas de DT (au plus 4),
   * et ne dessine que le dernier : si le navigateur n'arrive pas à 60 images par seconde,
   * le jeu saute des images au lieu de ralentir. */
  avancer(ecoule) {
    this.retard = Math.min(this.retard + ecoule, 4 * DT);
    const n = Math.max(1, Math.min(4, arrondi(this.retard / DT)));
    this.retard = Math.max(-DT, this.retard - n * DT);
    for (let k = 0; k < n; k++) this.image(null, k === n - 1);
  }

  /** Le plein écran (touche F). */
  basculer_plein_ecran() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => {});
    } catch (e) {
      // pas de plein écran possible ici
    }
  }

  /** Calcule une image du jeu (et la dessine). cmds : une Commande par joueur (ou une
   * seule) ; sans rien, on lit les manettes et le clavier. */
  image(cmds = null, dessiner = true) {
    let echap = false, entree = false;
    const tape = [];  // ce qu'on tape au clavier en écrivant son nom
    for (const ev of this.entrees.prendre_touches()) {
      if (this.etat === "touches" && this.attente) {  // la nouvelle touche (Échap : on annule)
        if (!ev.ctrl && this.touche_lue === null) this.touche_lue = ev.nom;
        continue;
      }
      if (ev.nom === "Escape") echap = true;
      else if (ev.nom === "Enter") entree = true;
      else if (this.etat === "nom") {
        if (ev.nom === "Backspace") tape.push("Effacer");
        else if (ev.key && ev.key.length === 1 && !ev.ctrl) tape.push(ev.key);
      } else if (ev.ctrl) continue;   // Cmd+R, Ctrl+F… : pour le navigateur
      else if (ev.nom === "t" && this.etat === "honneur") {
        this.etat = "touches";
        this.reglage = [0, 0];
        this.son("clic");
      } else if (ev.nom === "f") this.basculer_plein_ecran();
      else if (ev.nom === "m") this.musique.active = !this.musique.active;
    }
    if (cmds === null) {  // dans une salle, les touches de chacun ; ailleurs, celles des menus
      cmds = this.etat === "jeu" ? this.entrees.lire(this.joueurs())
        : [this.entrees.lire_menu(this.etat !== "nom")];
    }
    else if (cmds instanceof Commande) cmds = [cmds];
    const cmd = ensemble(cmds);  // pour les menus : n'importe quel joueur
    this.t += DT;
    const ok = entree || cmd.saut_presse || cmd.pause_presse;
    if (this.etat === "honneur") {
      this.maj_honneur(cmd, entree);
      if (echap) this.quitter();
    } else if (this.etat === "confirmer") {
      if (cmd.gauche_presse || cmd.droite_presse) {
        this.confirme = 1 - this.confirme;
        this.son("clic");
      }
      if ((entree || cmd.saut_presse) && this.confirme === 0) this.recommencer_equipe();
      else if (entree || cmd.saut_presse || cmd.pause_presse || echap) this.etat = "honneur";
    } else if (this.etat === "titre") {
      this.titre_t += DT;
      if (cmd.gauche_presse || cmd.droite_presse) {
        const choix = mod(this.niveau + cmd.droite_presse - cmd.gauche_presse, this.ouvertes);
        if (choix !== this.niveau) {
          this.niveau = choix;
          this.son("clic");
        }
      }
      if (this.titre_t > 0.3 && (entree || cmd.saut_presse)) this.partir(null, this.niveau);
      else if (echap || cmd.pause_presse) {  // retour au tableau d'honneur
        this.sauver();
        this.etat = "honneur";
      }
    } else if (this.etat === "touches") {
      this.maj_touches(cmd, entree, echap);
    } else if (this.etat === "nom") {
      this.maj_nom(cmds[Math.min(this.qui, cmds.length - 1)], tape, entree);
      if (echap) this.etat = "honneur";
    } else if (this.etat === "voyage") {
      const v = this.voyage;
      v.t += DT;
      const [sortie, vol, entree_] = this.durees();
      if (ok && v.t > 0.4) v.t = Math.max(v.t, sortie + vol + entree_);  // on peut passer le voyage
      if (v.vers === null && v.t >= sortie) {
        this.etat = "fin";
        this.feux = [];
        this.fusees = [];
        this.tout_en_fete();
        this.son("bravo");
        const e = this.equipe;
        e.fini = true;
        if (e.meilleur === null || e.meilleur === undefined || this.chrono < e.meilleur) {
          e.meilleur = au_dixieme(this.chrono);
        }
        this.sauver();
      } else if (v.t >= sortie + vol + entree_) {
        this.partie = v.partie;
        this.niveau = v.vers;
        this.etat = "jeu";
        this.pause = false;
        // ce qui est déjà tenu (l'espace qui a passé le voyage) ne compte pas comme appuyé
        this.entrees.lire(this.joueurs());
      }
    } else if (this.etat === "fin") {
      this.maj_feux();
      if (ok || echap) {  // retour au tableau d'honneur, sur l'équipe qui vient de finir
        this.etat = "honneur";
        this.choix = [MODES.map(m => m[0]).indexOf(this.mode), this.colonne_de(this.equipe)];
        this.salles = {};
        this.vignettes = {};
      }
    } else if (this.etat === "jeu") {
      const p = this.partie;
      if (echap) {
        this.sauver();
        this.etat = "titre";
        this.titre_t = 1.0;
      } else if (p.gagne_t !== null && p.gagne_t > 2.5 && (cmd.saut_presse || entree)) {
        const suivante = p.i_niveau + 1;
        this.ouvertes = Math.max(this.ouvertes, Math.min(suivante + 1, NIVEAUX.length));
        this.partir(p.i_niveau, suivante < NIVEAUX.length ? suivante : null);
        this.sauver();
      } else if (cmd.pause_presse || (this.pause && entree)) {
        this.pause = !this.pause;
      } else if (!this.pause) {
        p.maj(cmds);
        if (p.gagne_t === null) this.chrono += DT;
      }
    }
    if (this.etat !== "jeu") this.animer_salles();
    this.musique.maj(this.ambiance(), DT);
    if (dessiner) this.dessiner();
  }

  /** La ligne de cette équipe dans sa colonne (0 est « nouveau »). */
  colonne_de(equipe) {
    return 1 + palmares.classement(this.equipes, equipe.mode).indexOf(equipe);
  }

  /** Le tableau d'honneur : la croix choisit une colonne (seul, à deux, parent et enfant)
   * et une ligne ; le bouton du bas crée une équipe ou choisit celle-là. */
  maj_honneur(cmd, entree) {
    const avant = [...this.choix];
    let [col, ligne] = this.choix;
    if (cmd.gauche_presse || cmd.droite_presse) col = mod(col + cmd.droite_presse - cmd.gauche_presse, MODES.length);
    this.choix[0] = col;
    const n = this.colonne().length + 1;
    if (cmd.haut_presse || cmd.bas_presse) ligne = mod(ligne + cmd.bas_presse - cmd.haut_presse, n);
    this.choix = [col, Math.min(ligne, n - 1)];
    if (this.choix[0] !== avant[0] || this.choix[1] !== avant[1]) this.son("clic");
    ligne = this.choix[1];
    if (entree || cmd.saut_presse) {
      if (ligne === 0) {  // une nouvelle équipe : chacun écrit son nom
        this.mode = MODES[col][0];
        this.noms = ["", ""];
        this.equipe = null;
        this.ecrire_nom(0);
      } else {
        this.choisir_equipe(this.colonne()[ligne - 1]);
      }
    }
  }

  /** L'écran des touches : les flèches choisissent un joueur et une action, la barre
   * d'espace (ou Entrée) attend la nouvelle touche ; la dernière ligne remet les touches de
   * départ ; Échap revient au tableau d'honneur. */
  maj_touches(cmd, entree, echap) {
    if (this.attente) {
      const k = this.touche_lue;
      this.touche_lue = null;
      if (k === "Escape") this.attente = false;
      else if (k && !RESERVEES.has(k)) {
        changer(this.reglage[0], REGLABLES[this.reglage[1]][0], k);
        this.attente = false;
        this.son("magie");
      } else if (k) this.son("vide");   // une touche des menus : on ne peut pas la prendre
      return;
    }
    if (echap) {
      this.etat = "honneur";
      return;
    }
    let [col, ligne] = this.reglage;
    if (cmd.gauche_presse || cmd.droite_presse) col = 1 - col;
    if (cmd.haut_presse || cmd.bas_presse) ligne = mod(ligne + cmd.bas_presse - cmd.haut_presse, REGLABLES.length + 1);
    if (col !== this.reglage[0] || ligne !== this.reglage[1]) this.son("clic");
    this.reglage = [col, ligne];
    if (entree || cmd.saut_presse) {
      if (ligne === REGLABLES.length) {
        remettre();
        this.son("magie");
      } else {
        this.attente = true;
        this.touche_lue = null;
      }
    }
  }

  /** Le joueur qui écrit son nom ; s'il en a déjà un, on se place sur « En route ». */
  ecrire_nom(qui) {
    this.etat = "nom";
    this.qui = qui;
    this.curseur = this.noms[qui] ? [3, 1] : [0, 0];
    this.son("clic");
  }

  /** Le clavier à l'écran : la croix choisit une lettre, le bouton du bas l'écrit. On peut
   * aussi taper son nom au clavier (Entrée pour finir). */
  maj_nom(cmd, tape, entree) {
    let [ligne, col] = this.curseur;
    if (cmd.haut_presse || cmd.bas_presse) {
      const avant = GRILLE[ligne].length - 1;
      ligne = mod(ligne + cmd.bas_presse - cmd.haut_presse, GRILLE.length);
      col = arrondi(col / Math.max(1, avant) * (GRILLE[ligne].length - 1));
    }
    if (cmd.gauche_presse || cmd.droite_presse) {
      col = mod(col + cmd.droite_presse - cmd.gauche_presse, GRILLE[ligne].length);
    }
    if (ligne !== this.curseur[0] || col !== this.curseur[1]) this.son("clic");
    this.curseur = [ligne, col];
    if (cmd.saut_presse) tape.push(GRILLE[ligne][col]);
    if (entree) tape.push("En route !");
    if (cmd.pause_presse) tape.push("Effacer");
    let nom = this.noms[this.qui];
    for (const t of tape) {
      if (t === "Effacer") {
        nom = nom.slice(0, -1);
      } else if (t === "En route !") {
        if (!nom.replace(/^-+|-+$/g, "")) {
          this.son("vide");  // il faut au moins une lettre
          continue;
        }
        this.noms[this.qui] = nom;
        if (this.qui + 1 < this.joueurs()) {
          this.ecrire_nom(this.qui + 1);
        } else {  // une équipe qui existe déjà (mêmes noms) est reprise, sinon on la crée
          const noms = this.noms.slice(0, this.joueurs());
          let equipe = this.equipes.find(e => e.mode === this.mode && memes_noms(e.noms, noms));
          if (!equipe) {
            equipe = palmares.nouvelle(this.mode, noms);
            this.equipes.push(equipe);
            palmares.enregistrer(this.equipes);
          }
          this.choix = [MODES.map(m => m[0]).indexOf(this.mode), this.colonne_de(equipe)];
          this.choisir_equipe(equipe);
        }
        return;
      } else if (t.length === 1 && (/^\p{L}$/u.test(t) || t === "-") && nom.length < NOM_MAX) {
        nom += !nom || nom.endsWith("-") ? t.toUpperCase() : t.toLowerCase();
        this.son("clic");
      }
    }
    this.noms[this.qui] = nom;
  }

  // ---- dessin des écrans ----

  dessiner() {
    const e = this.ecran.ctx;
    const menu = ["nom", "honneur", "confirmer", "touches"].includes(this.etat);
    if (!menu) this.fond_menu = null;
    if (this.etat === "titre") {
      this.dessiner_accueil(e);
    } else if (menu) {
      if (this.fond_menu === null) {  // le Bled assombri, figé derrière les menus
        this.dehors.dessiner(e, this.t, this.vues(), this.allumees());
        voiler(e, [8, 6, 20, 170]);
        this.fond_menu = copie(this.ecran);
      }
      coller(e, this.fond_menu, 0, 0);
      ({ nom: () => this.dessiner_nom(e), honneur: () => this.dessiner_honneur(e),
         confirmer: () => this.dessiner_confirmer(e), touches: () => this.dessiner_touches(e) })[this.etat]();
    } else if (this.etat === "voyage") {
      this.dessiner_voyage(e);
    } else if (this.etat === "fin") {
      this.dehors.dessiner(e, this.t, this.vues(), this.allumees());
      this.dessiner_feux(e);
      this.dessiner_danse(e);
      ecrire(e, "Tout le Bled est en fête !", 76, OR, { centre: [L / 2, 620] });
      ecrire(e, `En ${palmares.duree(this.chrono)} !   ${majuscule(VALIDER)} : le tableau d'honneur`,
             32, BLANC, { centre: [L / 2, 685] });
    } else {
      this.partie.dessiner(e);
      if (this.equipe) {  // le temps, dans la frise, tout à droite
        dessin.rect(e, [20, 16, 34], [1160, 8, 110, 64], 0, 18);
        const s = Math.trunc(this.chrono);
        ecrire(e, `${Math.floor(s / 60)}:${deux(s % 60)}`, 34, BLANC, { centre: [1215, 41] });
      }
      if (this.pause) {
        voiler(e, [10, 10, 30, 150]);
        ecrire(e, "Pause", 90, BLANC, { centre: [L / 2, 300] });
        ecrire(e, `${majuscule(BOUTONS.pause)} : continuer   Échap : le Bled (pour recommencer la salle)`, 32, BLANC,
               { centre: [L / 2, 400] });
      }
    }
  }

  /** Le Bled vu de la cour, avec les personnages de l'équipe posés dans la cour ; on
   * choisit la salle parmi celles déjà atteintes. */
  dessiner_accueil(e) {
    this.dehors.dessiner(e, this.t, this.vues(), this.allumees(), this.niveau);
    const persos = PERSONNAGES[this.mode];
    for (let k = persos.length - 1; k >= 0; k--) {
      const nom = persos[k][0];
      const echelle = nom !== "petit" ? 0.6 : 0.45;
      poser(e, anime(nom, this.t + k), ARRIVEE[0] + 34 * k, ARRIVEE[1] - 32 * echelle, { echelle });
    }
    ecrire(e, TITRE, 100, ORANGE, { centre: [L / 2, 64] });
    let salle = `${this.noms.slice(0, this.joueurs()).join(" et ")} — Salle ${this.niveau + 1} : ${NIVEAUX[this.niveau].nom}`;
    let consigne = `Appuie sur ${le(VALIDER)} pour commencer`;
    if (this.ouvertes > 1) {
      salle = `<   ${salle}   >`;
      consigne += `   (${CROIX} : choisir la salle)`;
    }
    ecrire(e, salle, 38, BLANC, { centre: [L / 2, 624] });
    ecrire(e, consigne, 32, OR, { centre: [L / 2, 664] });
    // au clavier : les touches de chacun (réglables depuis le tableau d'honneur, touche T)
    const rappel = this.joueurs() === 2
      ? `${this.noms[0]} : ${resume(0)}      ${this.noms[1]} : ${resume(1)}`
      : `Touches : ${resume(0)}`;
    ecrire(e, rappel, 22, BLANC, { centre: [L / 2, 700] });
  }

  /** La fin : les personnages dansent sur la terrasse du 5e (ils sautillent, se
   * dandinent et se retournent en rythme). */
  dessiner_danse(e) {
    const r = FENETRES[3], dh = this.dehors;
    const REZ = dh.REZ ?? Dehors.REZ, ETAGE = dh.ETAGE ?? Dehors.ETAGE, BASSE = dh.BASSE ?? Dehors.BASSE;
    const sol = agrandi(0, REZ - BASSE[2] * ETAGE - 7)[1];  // le sol de la terrasse
    PERSONNAGES[this.mode].forEach(([nom], k) => {
      const t = this.t * 2.2 + k * 0.5;
      const saut = 14 * Math.abs(Math.sin(t * Math.PI));
      const echelle = nom !== "petit" ? 0.7 : 0.52;
      const im = saut > 9 ? `${nom}_saut@0` : anime(nom, this.t);
      const x = r.centerx - 30 + 60 * k + 10 * Math.sin(t * Math.PI / 2);
      poser(e, im, x, sol - 32 * echelle - saut,
            { gauche: Math.trunc(t) % 2 === 1, angle: 12 * Math.sin(t * Math.PI), echelle });
    });
  }

  /** Le personnage k d'une façon de jouer, qui sautille. */
  dessiner_perso(e, mode, k, x, y, echelle = 1.0) {
    const nom = PERSONNAGES[mode][k][0];
    poser(e, anime(nom, this.t + k), x, y - 6 * Math.abs(Math.sin(this.t * 3 + k)), { gauche: k === 1, echelle });
  }

  dessiner_nom(e) {
    ecrire(e, QUI[this.mode][this.qui], 70, ORANGE, { centre: [L / 2, 80] });
    this.dessiner_perso(e, this.mode, this.qui, 360, 190, 1.8);
    const nom = this.noms[this.qui];
    dessin.rect(e, [22, 18, 36], [440, 150, 400, 80], 0, 18);
    dessin.rect(e, OR, [440, 150, 400, 80], 3, 18);
    const curseur = Math.trunc(this.t * 2) % 2 && nom.length < NOM_MAX ? "_" : " ";
    ecrire(e, nom + curseur, 56, BLANC, { centre: [640, 192] });
    GRILLE.forEach((ligne, i) => {
      const large = ligne.length === 2;
      const pas = large ? 260 : 72;
      ligne.forEach((texte, j) => {
        const x = L / 2 + (j - (ligne.length - 1) / 2) * pas;
        const y = 300 + i * 80;
        const w = large ? 240 : 62;
        const choisi = i === this.curseur[0] && j === this.curseur[1];
        dessin.rect(e, choisi ? [60, 44, 90] : [30, 24, 46], [x - w / 2, y - 30, w, 60], 0, 12);
        if (choisi) dessin.rect(e, OR, [x - w / 2, y - 30, w, 60], 3, 12);
        ecrire(e, texte, large ? 34 : 44, choisi ? OR : BLANC, { centre: [x, y] });
      });
    });
    // au clavier, on tape son nom (la manette marche aussi, avec le clavier à l'écran)
    ecrire(e, "Tape ton nom au clavier, puis Entrée", 30, OR, { centre: [L / 2, 640] });
  }

  /** Le tableau d'honneur : une colonne par façon de jouer, avec « nouveau » en haut,
   * puis chaque équipe, son meilleur temps ou la salle où elle en est. */
  dessiner_honneur(e) {
    ecrire(e, "Le tableau d'honneur", 76, ORANGE, { centre: [L / 2, 56] });
    ecrire(e, "Choisis ton nom, ou crée un nouveau joueur", 30, BLANC, { centre: [L / 2, 108] });
    const visibles = 9;
    MODES.forEach(([mode, nom], k) => {
      const x = L / 2 + (k - 1) * 415, active = k === this.choix[0];
      dessin.rect(e, active ? [30, 24, 48] : [22, 18, 36], [x - 200, 136, 400, 500], 0, 24);
      if (active) dessin.rect(e, [90, 76, 120], [x - 200, 136, 400, 500], 2, 24);
      const persos = PERSONNAGES[mode];
      for (let i = 0; i < persos.length; i++) {
        this.dessiner_perso(e, mode, i, x - 150 + i * 34, 172, persos[i][0] !== "petit" ? 0.6 : 0.45);
      }
      ecrire(e, nom, 40, OR, { centre: [x + 20, 172] });
      const equipes = palmares.classement(this.equipes, mode);
      const lignes = [mode === "solo" ? "+ Nouveau joueur" : "+ Nouvelle équipe", ...equipes];
      const haut = active ? Math.max(0, Math.min(this.choix[1] - visibles + 2, lignes.length - visibles)) : 0;
      lignes.slice(haut, haut + visibles).forEach((ligne, i) => {
        const n = haut + i;
        const y = 222 + i * 44;
        const choisi = active && n === this.choix[1];
        if (choisi) {
          dessin.rect(e, [64, 48, 96], [x - 190, y - 20, 380, 40], 0, 12);
          dessin.rect(e, OR, [x - 190, y - 20, 380, 40], 2, 12);
        }
        if (n === 0) {
          ecrire(e, ligne, 28, choisi ? OR : [190, 230, 190], { centre: [x, y] });
          return;
        }
        const noms = ligne.noms.join(" et ");
        const a_un_temps = ligne.meilleur !== null && ligne.meilleur !== undefined;
        let droite, couleur_d;
        if (a_un_temps) [droite, couleur_d] = [palmares.duree(ligne.meilleur), OR];
        else [droite, couleur_d] = [`salle ${ligne.ouvertes} / ${NIVEAUX.length}`, [170, 160, 190]];
        if (a_un_temps && !ligne.fini) droite = `salle ${ligne.ouvertes}  ·  ${droite}`;
        const large_d = largeur_texte(e, droite, 26);
        const place = 330 - large_d;
        const taille = largeur_texte(e, noms, 28) < place ? 28 : 20;
        ecrire(e, noms, taille, BLANC, { gauche: [x - 178, taille === 28 ? y - 9 : y - 6] });
        ecrire(e, droite, 26, couleur_d, { gauche: [x + 180 - large_d, y - 9] });
      });
      if (haut + visibles < lignes.length) ecrire(e, "…", 30, BLANC, { centre: [x, 620] });
    });
    ecrire(e, `${majuscule(CROIX)} : choisir   ${majuscule(VALIDER)} : jouer   T : les touches`, 32, OR,
           { centre: [L / 2, 676] });
  }

  dessiner_confirmer(e) {
    const eq = this.a_confirmer;
    ecrire(e, eq.noms.join(" et "), 64, ORANGE, { centre: [L / 2, 200] });
    ecrire(e, "Vous avez déjà mis tout le Bled en fête !", 36, BLANC, { centre: [L / 2, 280] });
    ecrire(e, `Meilleur temps : ${palmares.duree(eq.meilleur)}`, 32, OR, { centre: [L / 2, 330] });
    ecrire(e, "Recommencer depuis la première salle ?", 44, BLANC, { centre: [L / 2, 420] });
    ["Oui", "Non"].forEach((texte, k) => {
      const x = L / 2 + (k - 0.5) * 260;
      const choisi = k === this.confirme;
      dessin.rect(e, choisi ? [64, 48, 96] : [30, 24, 46], [x - 100, 470, 200, 64], 0, 14);
      if (choisi) dessin.rect(e, OR, [x - 100, 470, 200, 64], 3, 14);
      ecrire(e, texte, 40, choisi ? OR : BLANC, { centre: [x, 502] });
    });
    ecrire(e, "(le meilleur temps est gardé)", 26, [190, 180, 210], { centre: [L / 2, 580] });
    ecrire(e, `${majuscule(CROIX)} : choisir   ${majuscule(VALIDER)} : valider`, 30, OR,
           { centre: [L / 2, 660] });
  }

  /** L'écran des touches : pour chaque action, la touche du joueur 1 (et de celui qui joue
   * seul) et celle du joueur 2 ; en bas, « remettre les touches de départ ». */
  dessiner_touches(e) {
    ecrire(e, "Les touches", 76, ORANGE, { centre: [L / 2, 60] });
    ecrire(e, "Choisis une action, appuie sur la barre d'espace, puis sur la nouvelle touche",
           26, BLANC, { centre: [L / 2, 112] });
    const colonnes = [640, 940];
    ["Seul, ou joueur 1", "Joueur 2 (à deux)"].forEach((titre, j) => {
      ecrire(e, titre, 30, OR, { centre: [colonnes[j], 168] });
    });
    const t = touches();
    REGLABLES.forEach(([action, nom], i) => {
      const y = 222 + i * 58;
      ecrire(e, nom, 30, BLANC, { centre: [360, y] });
      colonnes.forEach((x, j) => {
        const choisi = this.reglage[0] === j && this.reglage[1] === i;
        dessin.rect(e, choisi ? [64, 48, 96] : [30, 24, 46], [x - 120, y - 22, 240, 44], 0, 12);
        if (choisi) dessin.rect(e, OR, [x - 120, y - 22, 240, 44], 3, 12);
        let texte = nom_court(t[j][action][0]);
        if (choisi && this.attente) texte = Math.floor(this.t * 2) % 2 ? "appuie…" : "";
        ecrire(e, texte, 30, choisi ? OR : BLANC, { centre: [x, y] });
      });
    });
    const choisi = this.reglage[1] === REGLABLES.length, y = 222 + REGLABLES.length * 58 + 12;
    dessin.rect(e, choisi ? [64, 48, 96] : [30, 24, 46], [L / 2 - 220, y - 22, 440, 44], 0, 12);
    if (choisi) dessin.rect(e, OR, [L / 2 - 220, y - 22, 440, 44], 3, 12);
    ecrire(e, "Remettre les touches de départ", 28, choisi ? OR : BLANC, { centre: [L / 2, y] });
    ecrire(e, `${majuscule(CROIX)} : choisir   ${majuscule(VALIDER)} : changer   Échap : retour`, 30, OR,
           { centre: [L / 2, 676] });
  }

  dessiner_voyage(e) {
    const v = this.voyage;
    const [sortie, vol] = this.durees();
    const t = v.t, vers = v.vers;
    this.dehors.dessiner(e, this.t, this.vues(), this.allumees(), vers);
    if (t < sortie) {  // on recule : la salle finie (toujours en fête) rapetisse jusqu'à sa fenêtre
      this.salles[v.depuis].dessiner(this.ecran_salle.ctx, true);
      zoomer(e, this.ecran_salle, [0, 0, L, H], FENETRES[v.depuis].liste, t / sortie);
    } else if (t < sortie + vol) {  // le vampire vole jusqu'à la salle suivante
      const depart = v.depuis === null ? ARRIVEE : FENETRES[v.depuis].center;
      const u = doux((t - sortie) / vol);
      const persos = PERSONNAGES[this.mode];
      for (let k = persos.length - 1; k >= 0; k--) {  // l'autre suit
        const [x, y] = bezier(depart, FENETRES[vers].center, Math.max(0.0, u - 0.08 * k));
        poser(e, persos[k][0] + "_saut@0", x, y, { gauche: FENETRES[vers].centerx < depart[0], echelle: 0.6 });
      }
      ecrire(e, `Salle ${vers + 1} : ${NIVEAUX[vers].nom}`, 48, OR, { centre: [L / 2, 640] });
    } else {  // on plonge dans la nouvelle salle
      zoomer(e, v.apres, FENETRES[vers].liste, [0, 0, L, H], (t - sortie - vol) / ENTREE);
    }
  }
}
