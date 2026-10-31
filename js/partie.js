// Une salle du Bled (port de partie.py) : le vampire (ou les deux personnages, à deux), les
// créatures à transformer, les bonbons, le corbeau grognon, et le dessin de la salle (avec
// sa lumière qui change avec la fête).
//
// La logique est la même qu'en Python, calcul pour calcul et dans le même ordre : le jeu se
// joue exactement pareil. Aucune toile n'est créée tant qu'on ne dessine pas (les décors et
// les voiles de la nuit sont faits au premier dessin) : la logique tourne aussi sans
// navigateur (essais sous Node).
import * as decors from "./decors.js";
import { Commande } from "./commandes.js";
import { AU_SOL, GENRES, NIVEAUX, PAS_DE_BONBON, RANGS, majuscule } from "./niveaux.js";
import { libelle, libelle_pour } from "./touches.js";
import {
  BLANC, DT, FESTIF, H, L, OR, ORANGE, T, TAILLES, Rect, aleatoire as random, anime, arrondi,
  coller, css, dessin, ecrire, envelopper, largeur_texte, melange, poser, range,
} from "./outils.js";

export const GRAVITE = 2200.0;
export const SAUT = 760.0;                // environ 3 tuiles de haut
export const VITESSE = 280.0;
export const ACC_SOL = 2600.0, ACC_AIR = 1700.0;
export const CHUTE_MAX = 900.0;
export const COYOTE = 0.10, TAMPON = 0.12;
export const SAUT_COURT = 300.0;          // on lâche le bouton en montant : le saut s'arrête plus tôt
export const REBOND = 520.0, REBOND_HAUT = 760.0;     // rebond sur une créature (bouton tenu : plus haut)
export const RECUL_VX = 380.0, RECUL_VY = 420.0, DUREE_RECUL = 0.3;
export const INVINCIBLE = 1.2;
export const VITESSE_BONBON = 560.0, PORTEE_BONBON = 650, RECHARGE_BONBON = 0.45;   // bonbons lancés
export const POCHE_MAX = 5;                           // bonbons en poche, au plus
export const RETOUR_BONBON = 20.0;                    // un bonbon mangé repousse au bout de 20 s
export const DUREE_TAS = 4.0;                         // le squelette reste en tas d'os, puis se relève
export const CORBEAU_PICORE = 1.5;                    // le corbeau picore 1,5 s avant de défaire
export const CORBEAU_PERCHE = 120;                    // il ne se pose jamais plus haut (y), pour qu'on l'attrape
export const CORBEAU_REPOS = 3.0;                     // puis il se pose et ricane 3 s avant la suivante
export const DUREE_COUPE = 0.7;                       // couper la courge en morceaux
export const COUPS = [0.5, 0.3, 0.1];                 // instants des coups de couteau (temps restant)
export const PLAFOND = 2;                             // rangées du haut : la frise (rien ne s'y passe)
export const HAUT_FRISE = PLAFOND * T;
// À deux : on ne peut pas s'éloigner au point que l'autre sorte de l'écran.
export const ECART_MAX = L - 200;
// Parent et enfant : la laisse magique, élastique. Plus loin que LAISSE, elle s'étire et
// ramène l'enfant d'autant plus fort qu'elle est tirée (ELASTIQUE) ; s'il n'arrive pas à
// suivre (TIRE_MAX s) ou s'il est trop loin, il s'envole vers le parent.
export const LAISSE = 380.0, LAISSE_MAX = 620.0, TIRE_MAX = 1.2, VOL_ENFANT = 900.0;
export const ELASTIQUE = 3.5, RAPPEL_MAX = 500.0;      // vitesse de rappel par pixel d'étirement, et au plus
// les personnages de chaque façon de jouer : [dessin, taille de leur corps]
export const PERSONNAGES = {
  solo: [["vampire", [26, 52]]],
  duo: [["vampire", [26, 52]], ["vampirette", [26, 52]]],
  parent: [["parent", [26, 52]], ["petit", [22, 42]]],
};

const TAU = 2 * Math.PI;

// ---- petits outils de calcul (pour faire exactement comme Python) ----

/** x // y de Python (division arrondie vers le bas). */
const fdiv = (x, y) => Math.floor(x / y);
/** x % y de Python (toujours du signe de y). */
const mod = (x, y) => ((x % y) + y) % y;
/** min(liste, key=cle, default=None) de Python : le premier des plus petits, ou null. */
function plus_petit(liste, cle) {
  let meilleur = null, v = Infinity;
  for (const x of liste) {
    const k = cle(x);
    if (meilleur === null || k < v) { meilleur = x; v = k; }
  }
  return meilleur;
}
const borne = (x, a, b) => Math.max(a, Math.min(b, x));

// --------------------------------------------------------------------------
// Décor
// --------------------------------------------------------------------------

const _voiles = {};
export const RAYON_HALO = 200;

/** Une petite toile en vrais pixels (pour les voiles, dessinés point par point puis agrandis). */
function petite_toile(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext("2d"), w, h };
}

/** Le bord de l'écran assombri (en petit) et le halo de lumière autour du vampire, faits
 * une fois pour toutes. */
export function voiles() {
  if (!_voiles.bord) {
    const bord = petite_toile(160, 90);
    const pixels = bord.ctx.createImageData(160, 90);
    for (let y = 0; y < 90; y++) {
      for (let x = 0; x < 160; x++) {
        const d = Math.hypot((x - 80) / 80, (y - 45) / 45);
        const a = Math.max(0.0, Math.min(1.0, (d - 0.45) / 0.6));
        pixels.data[(y * 160 + x) * 4 + 3] = arrondi(190 * a * a);  // noir, plus ou moins opaque
      }
    }
    bord.ctx.putImageData(pixels, 0, 0);
    const halo = petite_toile(64, 64);
    const ph = halo.ctx.createImageData(64, 64);
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const a = Math.max(0.0, 1 - Math.hypot(x - 31.5, y - 31.5) / 32) ** 2;
        const k = (y * 64 + x) * 4;
        ph.data[k] = arrondi(46 * a);
        ph.data[k + 1] = arrondi(38 * a);
        ph.data[k + 2] = arrondi(56 * a);
        ph.data[k + 3] = 255;
      }
    }
    halo.ctx.putImageData(ph, 0, 0);
    Object.assign(_voiles, { bord, ombre: [null, null], halo });
  }
  return _voiles;
}

/** L'ombre de la nuit quand la salle est en fête à f : une seule petite image (160 x 90,
 * agrandie à tout l'écran) qu'on multiplie avec l'écran (tout plus sombre, encore plus sur
 * les bords). On ne la refait que quand f change. */
export function ombre(f) {
  const v = voiles();
  const niveau = arrondi(f * 100);
  if (v.ombre[0] !== niveau) {
    const k = 90 / 255 * (1 - f);  // la nuit : un voile bleu nuit de cette opacité
    const petit = v.ombre[1] || petite_toile(160, 90);
    const c = petit.ctx;
    c.globalAlpha = 1;
    c.fillStyle = css([arrondi(255 * (1 - k)), arrondi(255 * (1 - k)), arrondi(255 * (1 - k * 0.85))]);
    c.fillRect(0, 0, 160, 90);
    c.globalAlpha = arrondi(255 * 0.8 * (1 - f)) / 255;
    c.drawImage(v.bord.canvas, 0, 0);
    c.globalAlpha = 1;
    v.ombre = [niveau, petit];
  }
  return v.ombre[1];
}

// --------------------------------------------------------------------------
// Les choses du Bled
// --------------------------------------------------------------------------

/** Une créature ou un objet qui attend d'être transformé en version fête. */
export class Chose {
  constructor(partie, genre, x, y) {
    this.p = partie;
    this.genre = genre;
    [this.peur, this.fete, this.regle, this.message] = GENRES[genre];
    // chaque salle a ses propres lampes (néon, suspension, projecteur, lampion)
    const objets = partie.niveau.objets || {};
    if (genre in objets) [this.peur, this.fete] = objets[genre];
    [this.w, this.h] = TAILLES[this.peur];
    if (AU_SOL.includes(genre)) y -= this.h / 2;   // y donné = le sol ; on garde le centre
    this.x0 = this.x = x;
    this.y0 = this.y = y;
    this.fetee = false;
    this.t = random.uniform(0, 6);
    this.dir = random.choice([-1, 1]);
    this.pop = 0.0;            // petite animation juste après la transformation
    this.bouh = 0.0;           // il vient de faire peur au vampire
    this.tas = 0.0;            // squelette effondré : temps avant qu'il se relève
  }

  rect() {
    return new Rect(this.x - this.w / 2 + 6, this.y - this.h / 2 + 6, this.w - 12, this.h - 12);
  }

  maj() {
    this.t += DT;
    this.pop = Math.max(0.0, this.pop - DT);
    this.bouh = Math.max(0.0, this.bouh - DT);
    const g = this.genre;
    if (this.tas > 0) {
      this.tas -= DT;
      if (this.tas <= 0) this.changer_taille(this.peur);  // il se relève
    } else if (g === "s" && this.fetee) {
      // il danse en se balançant, et il chante : des notes de musique s'envolent
      this.x = this.x0 + 10 * Math.sin(this.t * 1.3);
      if (random.random() < 1.5 * DT) {
        this.p.notes.push([this.x + random.uniform(-12, 12), this.y - this.h / 2,
          random.uniform(0, 6), 1.8, random.choice(FESTIF)]);
      }
    } else if (g === "s") {
      // il fait les cent pas, demi-tour devant un mur ou au bord du vide
      const nx = this.x + this.dir * 60 * DT;
      const devant = nx + this.dir * this.w / 2;
      const pied = this.y + this.h / 2 + 2;
      if (this.p.plein(devant, this.y) || !this.p.porte(devant, pied)) this.dir = -this.dir;
      else this.x = nx;
    } else if (g === "f") {
      const ampleur = this.fetee ? 20 : 70;
      this.x = this.x0 + ampleur * Math.sin(this.t * 0.7);
      this.y = this.y0 + 10 * Math.sin(this.t * 2.1);
      this.dir = Math.cos(this.t * 0.7) > 0 ? 1 : -1;
    } else if (g === "b") {
      if (this.fetee) {
        this.y = this.y0 + 8 * Math.sin(this.t * 1.5);
      } else {
        this.x = this.x0 + 70 * Math.cos(this.t * 1.6);
        this.y = this.y0 + 30 * Math.sin(this.t * 3.2);
      }
    }
  }

  /** Le y où pend la lampe : le dessous de ce qui est juste au-dessus d'elle. */
  accroche() {
    const c = fdiv(this.x0, T);
    let r = fdiv(this.y0 - this.h / 2, T);
    while (r > 0 && !"#-=".includes(this.p.tuile(c, r))) r -= 1;
    const t = this.p.tuile(c, r);
    return t === "#" ? (r + 1) * T : r * T + 14;
  }

  /** Prend la taille de l'image nom (les choses posées restent sur le sol). */
  changer_taille(nom) {
    const bas = this.y + this.h / 2;
    [this.w, this.h] = TAILLES[nom];
    if (AU_SOL.includes(this.genre)) this.y = bas - this.h / 2;
  }

  /** Premier saut sur le squelette : il tombe en tas d'os. */
  effondrer() {
    this.tas = DUREE_TAS;
    this.changer_taille("squelette_tas");
    this.p.dire("Encore un saut !", this.x, this.y - 40);
    this.p.son("crac");
  }

  /** Le corbeau grognon remet la chose en version effrayante. */
  defaire() {
    if (!this.fetee) return;
    this.fetee = false;
    this.pop = 0.5;
    this.p.flash = 1.5;
    this.changer_taille(this.peur);
    for (let i = 0; i < 20; i++) {
      const a = random.uniform(0, TAU), v = random.uniform(60, 200);
      this.p.particules.push([this.x, this.y, Math.cos(a) * v, Math.sin(a) * v - 80,
        random.uniform(0.5, 0.9), [60, 60, 70]]);
    }
    this.p.dire("Oh non !", this.x, this.y - this.h / 2 - 10);
  }

  transformer() {
    if (this.fetee) return false;
    this.fetee = true;
    this.tas = 0.0;
    this.pop = 0.5;
    this.changer_taille(this.fete);
    this.x0 = this.x;
    this.y0 = this.y;
    this.p.eclats(this.x, this.y, 26);
    this.p.dire(this.message, this.x, this.y - this.h / 2 - 10);
    this.p.son("magie");
    return true;
  }

  dessiner(ctx, cx) {
    let x = this.x - cx;
    const y = this.y;
    if (x < -100 || x > L + 100) return;
    const echelle = 1.0 + 0.35 * Math.sin(this.pop / 0.5 * Math.PI);
    let angle = 0.0, nom = this.fetee ? this.fete : this.peur;
    const gauche = this.dir < 0;
    if (this.genre === "l") {  // le fil de la lampe (deux pour un néon), du plafond ou du meuble au-dessus
      for (const dx of (this.peur.startsWith("neon") ? [-40, 40] : [0])) {
        dessin.line(ctx, [60, 60, 70], [x + dx, this.accroche()], [x + dx, y - this.h / 2 + 2], 2);
      }
    }
    if (this.fetee && "fb".includes(this.genre)) angle = 5 * Math.sin(this.t * 2);
    if (this.tas > 0) {
      nom = "squelette_tas";
      if (this.tas < 1.2) x += 2 * Math.sin(this.t * 60);  // il va se relever : il tremble
    }
    poser(ctx, anime(nom, this.t), x, y, { gauche: gauche && "sf".includes(this.genre), angle, echelle });
    if (this.bouh > 0) ecrire(ctx, "Bouh !", 30, BLANC, { centre: [x, y - this.h / 2 - 14] });
    const c = this.p.corbeau;
    if (c && c.cible === this && !c.fetee && Math.trunc(this.t * 4) % 2) {
      ecrire(ctx, "!", 48, [255, 70, 70], { centre: [x, Math.max(HAUT_FRISE + 20, y - this.h / 2 - 20)] });
    }
  }
}

/** Un personnage du joueur (le vampire, la vampirette ou le petit vampire). */
export class Vampire {
  constructor(partie, x, bas, dessin = "vampire", taille = [26, 52]) {
    this.p = partie;
    this.dessin = dessin;
    [this.W, this.H] = taille;
    this.x = x - this.W / 2;
    this.y = bas - this.H;
    this.vx = this.vy = 0.0;
    this.au_sol = false;
    this.coyote = this.tampon = 0.0;
    this.saute = false;        // en train de monter après un saut (pas un rebond)
    this.dir = 1;
    this.pas = 0.0;
    this.invincible = this.recul = this.recharge = 0.0;
    this.coupe = 0.0;          // en train de couper une courge
    this.coupe_cible = null;
    this.courge_proche = null; // courge juste à côté : il peut sortir son couteau
    this.bas_avant = 0.0;      // le bas de son corps à l'image d'avant
    this.vole = false;         // l'enfant ramené par la laisse
    this.tire = 0.0;
  }

  rect() {
    return new Rect(this.x, this.y, this.W, this.H);
  }

  tuiles() {
    const c0 = fdiv(this.x, T), c1 = fdiv(this.x + this.W - 0.01, T);
    const r0 = fdiv(this.y, T), r1 = fdiv(this.y + this.H - 0.01, T);
    const liste = [];
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) liste.push([c, r]);
    return liste;
  }

  bouger_x(dx) {
    if (!dx) return;
    this.x += dx;
    for (const [c, r] of this.tuiles()) {
      if (this.p.tuile(c, r) === "#") {
        this.x = dx > 0 ? c * T - this.W : (c + 1) * T;
        this.vx = 0.0;
      }
    }
  }

  bouger_y(dy) {
    const bas_avant = this.y + this.H;
    this.y += dy;
    this.au_sol = false;
    for (const [c, r] of this.tuiles()) {
      const t = this.p.tuile(c, r);
      if (t === "#" || ("-=".includes(t) && dy > 0 && bas_avant <= r * T + 0.01)) {
        if (dy > 0) {
          this.y = r * T - this.H;
          this.au_sol = true;
        } else {
          this.y = (r + 1) * T;
        }
        this.vy = 0.0;
      }
    }
  }

  rebondir(cmd) {
    this.vy = -(cmd.saut ? REBOND_HAUT : REBOND);
    this.saute = false;
  }

  /** Une créature effrayante le touche de côté : il recule. */
  faire_peur(chose) {
    const sens = this.x + this.W / 2 > chose.x ? 1 : -1;
    this.vx = sens * RECUL_VX;
    this.vy = -RECUL_VY;
    this.recul = DUREE_RECUL;
    this.invincible = INVINCIBLE;
    this.saute = false;
    chose.bouh = 1.0;
    this.p.son("bouh");
  }

  maj(cmd) {
    const p = this.p;
    this.invincible = Math.max(0.0, this.invincible - DT);
    this.recharge = Math.max(0.0, this.recharge - DT);
    let dx = (cmd.droite ? 1 : 0) - (cmd.gauche ? 1 : 0);
    if (this.recul > 0) {
      this.recul -= DT;
      dx = 0;
    } else {
      const acc = this.au_sol ? ACC_SOL : ACC_AIR;
      this.vx += Math.max(-acc * DT, Math.min(acc * DT, dx * VITESSE - this.vx));
    }
    if (dx) this.dir = dx;
    this.coyote = this.au_sol ? COYOTE : Math.max(0.0, this.coyote - DT);
    this.tampon = cmd.saut_presse ? TAMPON : Math.max(0.0, this.tampon - DT);
    if (this.tampon > 0 && this.coyote > 0) {
      this.vy = -SAUT;
      this.saute = true;
      this.tampon = this.coyote = 0.0;
      p.son("saut");
    }
    if (this.saute && !cmd.saut && this.vy < -SAUT_COURT) this.vy = -SAUT_COURT;
    if (this.vy >= 0) this.saute = false;
    this.vy = Math.min(this.vy + GRAVITE * DT, CHUTE_MAX);
    this.bouger_x(this.vx * DT);
    this.bouger_y(this.vy * DT);
    this.pas = this.au_sol ? this.pas + Math.abs(this.vx) * DT / 40 : 0.0;
    if (cmd.action_presse && this.recharge <= 0) {
      this.recharge = RECHARGE_BONBON;
      p.lancer_bonbon(this);
    }
  }

  dessiner(ctx, cx) {
    if (this.invincible > 0 && Math.trunc(this.invincible * 10) % 2) return;  // il clignote
    const d = this.dessin;
    let nom;
    if (!this.au_sol || this.vole) nom = d + "_saut@0";
    else if (Math.abs(this.vx) > 20) nom = anime(d + "_marche", this.pas / 2);  // un cycle = deux pas
    else nom = anime(d, this.p.t);
    // le corps n'est pas au milieu de l'image (la cape flotte derrière lui)
    const x = this.x + this.W / 2 - cx - this.dir * 3;
    poser(ctx, nom, x, this.y + this.H - TAILLES[d][1] / 2, { gauche: this.dir < 0 });
    if (this.coupe > 0 || this.courge_proche) {  // le couteau dégainé
      const u = this.coupe > 0 ? 1 - this.coupe / DUREE_COUPE : 0.0;
      const angle = this.coupe <= 0 ? 60 : -30 + 90 * Math.abs(Math.cos(u * 3 * Math.PI));
      poser(ctx, "couteau@0", x + this.dir * 20, this.y + 26, { gauche: this.dir < 0, angle: angle * this.dir });
    }
  }
}

/** Un bonbon magique lancé, qui file vers la chose la plus proche devant soi. */
export class BonbonLance {
  constructor(partie, x, y, d, cible) {
    this.p = partie;
    this.x = x;
    this.y = y;
    this.cible = cible;
    this.vx = d * VITESSE_BONBON;
    this.vy = 0.0;
    this.vie = 1.5;
  }

  maj() {
    this.vie -= DT;
    const c = this.cible;
    if (c && !c.fetee) {
      const dx = c.x - this.x, dy = c.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1.0, 10 * DT);
      this.vx += (dx / d * VITESSE_BONBON - this.vx) * k;
      this.vy += (dy / d * VITESSE_BONBON - this.vy) * k;
    }
    this.x += this.vx * DT;
    this.y += this.vy * DT;
    if (random.random() < 0.7) {
      this.p.particules.push([this.x, this.y, random.uniform(-30, 30),
        random.uniform(-30, 30), 0.4, random.choice(FESTIF)]);
    }
    for (const ch of this.p.choses) {
      if (!ch.fetee && ch.rect().inflate(16, 16).collidepoint(this.x, this.y)) {
        if (ch.genre in PAS_DE_BONBON) {  // le bonbon rebondit dessus
          this.p.dire(PAS_DE_BONBON[ch.genre], ch.x, ch.y - ch.h / 2 - 30);
          this.p.son("vide");
        } else {
          ch.transformer();
        }
        this.vie = 0;
        break;
      }
    }
    if (this.p.plein(this.x, this.y)) this.vie = 0;
  }

  dessiner(ctx, cx) {
    poser(ctx, "bonbon@0", this.x - cx, this.y, { angle: this.vie * 900 });  // il tourbillonne
  }
}

/** Le corbeau grognon : il vole de décoration en décoration et les remet en version
 * effrayante. Il ne s'en va pas tout seul : il faut aller le toucher, de n'importe quel côté
 * (même par en dessous). Les bonbons ne lui font rien.
 * (fetee : il a été chassé ; comme une chose déjà transformée, plus rien ne le vise) */
export class Corbeau {
  constructor(partie, cible) {
    this.p = partie;
    this.cible = cible;
    // il arrive de loin, mais toujours de l'intérieur de la salle
    const largeur = partie.cols * T;
    const cotes = [-1, 1].filter(k => T * 1.5 < cible.x + k * 750 && cible.x + k * 750 < largeur - T * 1.5);
    const cote = random.choice(cotes.length ? cotes : [cible.x < largeur / 2 ? 1 : -1]);
    this.x = Math.max(T * 1.5, Math.min(largeur - T * 1.5, cible.x + cote * 750));
    this.y = 140.0;
    this.vitesse = partie.niveau.corbeau[2];
    this.dir = -cote;
    this.etat = "arrive";
    this.attente = 0.0;
    this.t = 0.0;
    this.fetee = this.fini = false;
  }

  rect() {
    return new Rect(this.x - 32, this.y - 22, 64, 44);
  }

  /** Le vampire l'a touché : il s'enfuit en perdant des plumes. */
  chasser() {
    if (this.fetee) return;
    this.fetee = true;
    this.etat = "fuit";
    this.p.dire("Croâ !", this.x, this.y - 30);
    for (let i = 0; i < 14; i++) {
      const a = random.uniform(0, TAU), v = random.uniform(60, 220);
      this.p.particules.push([this.x, this.y, Math.cos(a) * v, Math.sin(a) * v - 120,
        random.uniform(0.6, 1.1), [40, 34, 56]]);
    }
    this.p.son("croa");
  }

  /** La décoration la plus proche à défaire (attend s'il n'y en a pas). */
  choisir() {
    const fetees = this.p.choses.filter(ch => ch.fetee);
    this.cible = plus_petit(fetees, ch => Math.hypot(ch.x - this.x, ch.y - this.y));
    this.etat = this.cible ? "arrive" : "attend";
  }

  maj() {
    this.t += DT;
    if (this.p.gagne_t !== null && this.etat !== "fuit") {
      this.etat = "part";  // trop tard : la salle est en fête
    } else if ((this.etat === "arrive" || this.etat === "picore") && !this.cible.fetee) {
      this.choisir();
    }
    const c = this.cible;
    if (this.etat === "attend") {  // rien à défaire : il nargue le vampire, à portée de saut
      const v = this.p.vampire;
      const dx = v.x + 120 * Math.sin(this.t) - this.x;
      const dy = Math.max(CORBEAU_PERCHE, v.y - 70 + 15 * Math.sin(this.t * 2)) - this.y;
      this.x += Math.max(-1.0, Math.min(1.0, dx / 60)) * this.vitesse * 0.6 * DT;
      this.y += Math.max(-1.0, Math.min(1.0, dy / 60)) * this.vitesse * 0.6 * DT;
      this.dir = dx > 0 ? 1 : -1;
      if (this.p.choses.some(ch => ch.fetee)) this.choisir();
    } else if (this.etat === "arrive") {
      const dx = c.x - this.x, dy = Math.max(CORBEAU_PERCHE, c.y - c.h / 2 - 14) - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) {
        this.etat = "picore";
        this.attente = CORBEAU_PICORE;
      } else {
        const pas = Math.min(d, this.vitesse * DT);
        this.x += dx / d * pas;
        this.y += dy / d * pas;
        if (Math.abs(dx) > 4) this.dir = dx > 0 ? 1 : -1;
      }
    } else if (this.etat === "picore") {
      this.attente -= DT;
      if (this.attente <= 0) {
        c.defaire();
        this.p.son("croa");
        this.etat = "repos";
        this.attente = CORBEAU_REPOS;
      }
    } else if (this.etat === "repos") {  // il ricane un moment… puis il continue !
      this.attente -= DT;
      if (this.attente <= 0) this.choisir();
    } else {  // il s'en va (chassé, ou la salle est en fête)
      const v = this.etat === "fuit" ? 420 : 260;
      this.x += this.dir * v * DT;
      this.y -= v * 0.5 * DT;
      if (this.y < -80) this.fini = true;
    }
  }

  dessiner(ctx, cx) {
    const x = this.x - cx, y = this.y;
    const nom = { picore: "corbeau_picore", repos: "corbeau_ricane" }[this.etat] || "corbeau_vol";
    poser(ctx, anime(nom, this.t), x, y - 11, { gauche: this.dir < 0 });  // le corps au milieu du rect
    if (!this.fetee && !(-30 < x && x < L + 30)) {  // hors de l'écran : une flèche
      const bord = x < 0 ? 24 : L - 24;
      const pointe = x < 0 ? -1 : 1;
      const yy = Math.max(HAUT_FRISE + 30, Math.min(H - 60, y));
      dessin.polygon(ctx, [255, 70, 70], [[bord + pointe * 14, yy], [bord - pointe * 6, yy - 14],
        [bord - pointe * 6, yy + 14]]);
      ecrire(ctx, "Croâ", 22, BLANC, { centre: [bord - pointe * 40, yy] });
    }
  }
}

/** Le point u (de 0 à 1) de la courbe qui va de a à b en passant près de m. */
export function bezier_point(a, m, b, u) {
  return [0, 1].map(i => (1 - u) ** 2 * a[i] + 2 * u * (1 - u) * m[i] + u * u * b[i]);
}

export class Partie {
  /** mode : « solo », « duo » (deux joueurs pareils) ou « parent » (le parent mène,
   * l'enfant suit au bout de sa laisse magique). */
  constructor(i_niveau = 0, son = nom => {}, mode = "solo") {
    this.son = son;
    this.mode = mode;
    this.i_niveau = i_niveau;
    this.niveau = NIVEAUX[i_niveau];
    const COLS = this.cols = this.niveau.cols;
    this.grille = range(RANGS).map(() => Array(COLS).fill(" "));
    for (let r = 0; r < RANGS; r++) this.grille[r][0] = this.grille[r][COLS - 1] = "#";
    for (const r of [...range(PLAFOND), RANGS - 1]) this.grille[r] = Array(COLS).fill("#");
    this.choses = [];
    this.bonbons = [];
    let depart = null;
    for (const [r, c, texte] of this.niveau.plan) {
      [...texte].forEach((lettre, k) => {
        const x = (c + k) * T + T / 2, y = r * T + T / 2;
        if ("#-=".includes(lettre)) this.grille[r][c + k] = lettre;
        else if (lettre === "V") depart = [x, (r + 1) * T];
        else if (lettre === "o") this.bonbons.push([x, y, 0.0]);  // x, y, temps avant de repousser
        else this.choses.push(new Chose(this, lettre, x, AU_SOL.includes(lettre) ? (r + 1) * T : y));
      });
    }
    this.vampires = PERSONNAGES[mode].map(([nom, taille], k) =>
      new Vampire(this, depart[0] + k * 44, depart[1], nom, taille));
    this.vampire = this.vampires[0];   // celui que suivent la caméra, le corbeau, les conseils
    this.lances = [];
    this.particules = [];
    this.messages = [];
    this.notes = [];           // notes de musique : x, y, décalage, vie, couleur
    this.poche = this.niveau.poche;   // bonbons à lancer
    this.corbeau = null;
    const corbeau = this.niveau.corbeau;
    this.prochain_corbeau = corbeau ? corbeau[0] : Infinity;
    this.alerte = 0.0;         // « Le corbeau grognon arrive ! » la première fois
    this.flash = 0.0;          // le cadre des bonbons clignote en rouge (le corbeau a défait)
    this.camera = 0.0;
    this.fete_vue = 0.0;       // avance doucement vers la vraie proportion de fête
    this.gagne_t = null;       // temps depuis la fin (tout est transformé)
    this.t = 0.0;
    this._decor = null;        // murs, frises, tuiles : faits au premier dessin (voir murs)
    // les meubles sur lesquels on peut monter (établi, table, pergola) : x de début, de fin,
    // rangée, et le sol en dessous (pour leurs pieds)
    this.meubles = [];
    for (let r = 0; r < RANGS; r++) {
      let c = 0;
      while (c < COLS) {
        if (this.grille[r][c] === "=") {
          const c0 = c;
          while (c < COLS && this.grille[r][c] === "=") c += 1;
          const sols = [c0, c - 1].map(cc => range(r + 1, RANGS).find(rr => this.grille[rr][cc] === "#"));  // sous chaque pied
          this.meubles.push([c0, c, r, sols]);
        }
        c += 1;
      }
    }
    this.maj_camera(true);
  }

  // ---- le décor (les toiles ne sont faites qu'au premier dessin) ----

  get_decor() {
    if (!this._decor) {
      const [murs, frises, [pierre, planche]] = decors.decor(this.niveau.decor);
      this._decor = { murs, frises, pierre, planche };
    }
    return this._decor;
  }
  get murs() { return this.get_decor().murs; }
  get frises() { return this.get_decor().frises; }
  get pierre() { return this.get_decor().pierre; }
  get planche() { return this.get_decor().planche; }

  tuile(c, r) {
    if (0 <= c && c < this.cols && 0 <= r && r < RANGS) return this.grille[r][c];
    return "#";
  }

  plein(x, y) {
    return this.tuile(fdiv(x, T), fdiv(y, T)) === "#";
  }

  porte(x, y) {
    return "#-=".includes(this.tuile(fdiv(x, T), fdiv(y, T)));
  }

  // ---- ce qui se passe ----

  fete() {
    return this.choses.filter(ch => ch.fetee).length / this.choses.length;
  }

  eclats(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = random.uniform(0, TAU), v = random.uniform(80, 320);
      this.particules.push([x, y, Math.cos(a) * v, Math.sin(a) * v - 100,
        random.uniform(0.5, 1.0), random.choice(FESTIF)]);
    }
  }

  dire(texte, x, y) {
    if (this.messages.every(m => m[0] !== texte)) this.messages.push([texte, x, y, 1.6]);  // pas deux fois le même à la fois
  }

  lancer_bonbon(v = null) {
    v = v || this.vampire;
    const x = v.x + v.W / 2 + v.dir * 20, y = v.y + 22;
    if (this.poche <= 0) {
      this.dire("Plus de bonbons ! Ramasses-en", x, v.y - 20);
      this.son("vide");
      return;
    }
    this.poche -= 1;
    const cibles = this.choses.filter(ch => !ch.fetee && !(ch.genre in PAS_DE_BONBON)
      && (ch.x - x) * v.dir > -30
      && Math.hypot(ch.x - x, ch.y - y) < PORTEE_BONBON);
    const cible = plus_petit(cibles, ch => Math.hypot(ch.x - x, ch.y - y));
    this.lances.push(new BonbonLance(this, x, y, v.dir, cible));
    this.son("sort");
  }

  /** cmds : une Commande par joueur (ou une seule). */
  maj(cmds) {
    this.t += DT;
    if (!Array.isArray(cmds)) cmds = [cmds];
    cmds = [...cmds];
    while (cmds.length < this.vampires.length) cmds.push(new Commande());
    const paires = this.vampires.map((v, i) => [v, cmds[i]]);
    for (const [v, cmd] of paires) this.bouger(v, cmd);
    if (this.mode === "parent") this.laisse();
    for (const ch of this.choses) ch.maj();
    for (const b of this.bonbons) b[2] = Math.max(0.0, b[2] - DT);  // les bonbons mangés repoussent
    const c = this.corbeau;
    if (c) c.maj();
    for (const [v, cmd] of paires) if (!v.vole) this.toucher(v, cmd);
    if (c) {
      if (c.fini) {
        this.corbeau = null;
        this.prochain_corbeau = random.uniform(...this.niveau.corbeau[1]);
      }
    } else if (this.gagne_t === null) {
      this.prochain_corbeau -= DT;
      const fetees = this.choses.filter(ch => ch.fetee);
      if (this.prochain_corbeau <= 0 && fetees.length) {
        let proches = fetees.filter(ch => Math.abs(ch.x - this.vampire.x) < 1000);
        if (!proches.length) proches = fetees;
        this.corbeau = new Corbeau(this, random.choice(proches));
        this.son("croa");
        if (this.alerte === 0.0) this.alerte = 5.0;
      }
    }
    for (const b of this.lances) b.maj();
    this.lances = this.lances.filter(b => b.vie > 0);
    for (const pt of this.particules) {
      pt[0] += pt[2] * DT;
      pt[1] += pt[3] * DT;
      pt[3] += 400 * DT;
      pt[4] -= DT;
    }
    this.particules = this.particules.filter(pt => pt[4] > 0);
    for (const n of this.notes) {
      n[1] -= 40 * DT;
      n[3] -= DT;
    }
    this.notes = this.notes.filter(n => n[3] > 0);
    for (const m of this.messages) {
      m[2] -= 30 * DT;
      m[3] -= DT;
    }
    this.messages = this.messages.filter(m => m[3] > 0);
    this.flash = Math.max(0.0, this.flash - DT);
    if (this.alerte > 0) this.alerte = Math.max(0.001, this.alerte - DT);  // jamais 0 : une seule alerte
    const f = this.fete();
    this.fete_vue += Math.max(-DT, Math.min(DT, f - this.fete_vue)) * 0.8;
    if (f === 1 && this.gagne_t === null) {
      this.gagne_t = 0.0;
      this.son("bravo");
    }
    if (this.gagne_t !== null) {
      this.gagne_t += DT;
      if (random.random() < 0.6) {  // des confettis qui tombent
        this.particules.push([this.camera + random.uniform(0, L), 0,
          random.uniform(-40, 40), 60, 3.0, random.choice(FESTIF)]);
      }
    }
    this.maj_camera();
  }

  /** Un personnage bouge (ou coupe une courge, ou vole au bout de la laisse). */
  bouger(v, cmd) {
    v.bas_avant = v.y + v.H;
    const x_avant = v.x;
    if (v.vole) {
      this.voler(v);
      return;
    }
    if (v.coupe > 0) {  // il coupe la courge : il ne bouge plus
      const avant = v.coupe;
      v.coupe = v.coupe - DT;
      const ch = v.coupe_cible;
      if (COUPS.some(k => v.coupe <= k && k < avant)) {
        this.son("tchac");
        for (let i = 0; i < 8; i++) {
          this.particules.push([ch.x, ch.y, random.uniform(-160, 160),
            random.uniform(-260, -80), 0.6, ORANGE]);
        }
      }
      if (v.coupe <= 0) ch.transformer();
      v.maj(new Commande());
    } else {
      if (cmd.coucou_presse && v.courge_proche) {  // on est prêt : on coupe
        v.coupe = DUREE_COUPE;
        v.coupe_cible = v.courge_proche;
        v.dir = v.courge_proche.x > v.x + v.W / 2 ? 1 : -1;
        this.son("couteau");
      }
      v.maj(cmd);
    }
    v.courge_proche = null;
    if (v.au_sol && v.coupe <= 0) {
      for (const ch of this.choses) {
        if (ch.genre === "c" && !ch.fetee && Math.abs(ch.x - v.x - v.W / 2) < 60
            && Math.abs(ch.y + ch.h / 2 - v.y - v.H) < 8) {
          v.courge_proche = ch;
        }
      }
    }
    if (this.mode === "duo") {  // on ne laisse pas l'autre sortir de l'écran
      const autre = v === this.vampires[0] ? this.vampires[1] : this.vampires[0];
      if (Math.abs(v.x - autre.x) > Math.max(ECART_MAX, Math.abs(x_avant - autre.x))) {
        v.x = x_avant;
        v.vx = 0.0;
        this.dire("Restez ensemble !", v.x + v.W / 2, v.y - 20);
      }
    }
  }

  /** Parent et enfant : la laisse magique traîne l'enfant derrière le parent. */
  laisse() {
    const [parent, enfant] = this.vampires;
    if (enfant.vole) return;
    const dx = parent.x + parent.W / 2 - enfant.x - enfant.W / 2;
    const d = Math.hypot(dx, parent.y + parent.H - enfant.y - enfant.H);
    if (d <= LAISSE) {
      enfant.tire = 0.0;
      return;
    }
    if (d > LAISSE + 140) enfant.tire += DT;  // il n'arrive pas à suivre (un mur, une plateforme…)
    if (d > LAISSE_MAX || enfant.tire > TIRE_MAX) {
      enfant.vole = true;
      this.son("magie");
    } else if (Math.abs(dx) > 1) {
      const rappel = Math.min(RAPPEL_MAX, ELASTIQUE * (d - LAISSE)) * DT;
      enfant.bouger_x(Math.sign(dx) * Math.min(Math.abs(dx), rappel));
    }
  }

  /** L'enfant s'envole vers le parent, à travers tout, et se pose à côté de lui. */
  voler(v) {
    const parent = this.vampire;
    const bx = parent.x + (parent.W - v.W) / 2, by = parent.y + parent.H - v.H;
    const dx = bx - v.x, dy = by - v.y;
    const d = Math.hypot(dx, dy), pas = VOL_ENFANT * DT;
    if (d <= pas) {  // arrivé : là où est le parent, il y a forcément de la place
      v.x = bx; v.y = by; v.vx = 0.0; v.vy = 0.0;
      v.vole = false; v.tire = 0.0; v.au_sol = parent.au_sol;
    } else {
      v.x = v.x + dx / d * pas;
      v.y = v.y + dy / d * pas;
      v.dir = dx > 0 ? 1 : -1;
      this.particules.push([v.x + v.W / 2, v.y + v.H / 2, random.uniform(-40, 40),
        random.uniform(-80, 0), 0.5, random.choice(FESTIF)]);
    }
  }

  /** Ce que touche un personnage : créatures, bonbons à ramasser, corbeau. */
  toucher(v, cmd) {
    const r = v.rect(), bas_avant = v.bas_avant;
    for (const ch of this.choses) {
      if (ch.fetee || !r.colliderect(ch.rect())) continue;
      const dessus = v.vy > 0 && bas_avant <= ch.rect().top + 12;  // on lui retombe dessus
      if (ch.regle === "touche") {
        ch.transformer();
      } else if (dessus && ch.regle !== "bonbon" && ch.regle !== "couteau") {
        if (ch.genre === "s" && ch.tas <= 0) ch.effondrer();
        else ch.transformer();
        v.rebondir(cmd);
      } else if ((ch.regle === "mechant" || ch.regle === "bonbon") && ch.tas <= 0 && v.invincible <= 0) {
        v.faire_peur(ch);
        if (ch.regle === "bonbon") this.dire("Il faut lui lancer un bonbon !", ch.x, ch.y - ch.h / 2 - 40);
      }
    }
    for (const b of this.bonbons) {
      if (b[2] <= 0 && this.poche < POCHE_MAX && r.colliderect([b[0] - 18, b[1] - 12, 36, 24])) {
        this.poche += 1;
        b[2] = RETOUR_BONBON;
        this.dire("+1 bonbon", b[0], b[1] - 20);
        this.son("bonbon");
      }
    }
    const c = this.corbeau;
    if (c && !c.fetee && r.colliderect(c.rect())) {  // touché, de n'importe quel côté
      if (v.vy > 0 && bas_avant <= c.rect().top + 14) v.rebondir(cmd);
      c.chasser();
    }
  }

  maj_camera(direct = false) {
    const suivis = this.mode === "duo" ? this.vampires : [this.vampire];  // à deux : entre les deux
    const milieu = suivis.reduce((s, v) => s + v.x + v.W / 2, 0) / suivis.length;
    const voulu = Math.max(0, Math.min(this.cols * T - L, milieu - L / 2));
    this.camera = direct ? voulu : this.camera + (voulu - this.camera) * 0.15;
  }

  // ---- le dessin ----

  /** Dessine la salle sur ctx (en points du jeu). apercu : sans la poche ni les textes
   * (vue depuis dehors). */
  dessiner(ctx, apercu = false) {
    const cx = arrondi(this.camera);
    const f = this.fete_vue;
    const nom_decor = this.niveau.decor;
    const fond = fdiv(cx, 2);  // le mur du fond défile deux fois moins vite
    const murs = this.murs;
    for (let i = 0; i < murs.length; i++) {
      if (i === 0 && f >= 0.99) continue;  // tout en fête : le mur lugubre est caché, inutile de le dessiner
      let alpha = 1;
      if (i === 1) {
        if (f <= 0.01) break;
        alpha = f >= 0.99 ? 1 : arrondi(255 * f) / 255;
      }
      for (let x = -mod(fond, decors.MOTIF); x < L; x += decors.MOTIF) coller(ctx, murs[i], x, 0, alpha);
    }
    for (let x = -mod(fond, decors.MOTIF); x < L; x += decors.MOTIF) {  // ce qui bouge dans le décor
      decors.animer(nom_decor, ctx, x, this.t, f);
    }
    // les guirlandes au plafond apparaissent petit à petit
    for (let k = 0; k < fdiv(this.cols * T, 160); k++) {
      if (mod(k * 37, 100) >= f * 100) continue;
      const x0 = k * 160 - cx;
      if (-160 < x0 && x0 < L) {
        const points = range(9).map(i => [x0 + i * 20, HAUT_FRISE + 4 + 14 * Math.sin(i / 8 * Math.PI)]);
        for (let i = 0; i < 8; i++) {
          const [xa, ya] = points[i], [xb, yb] = points[i + 1];
          dessin.polygon(ctx, FESTIF[(i + k) % 5], [[xa + 2, ya], [xb - 2, yb], [(xa + xb) / 2, ya + 18]]);
        }
        dessin.line(ctx, [90, 60, 50], points[0], points[points.length - 1], 1);
      }
    }
    // les murs, le sol et les planches
    const c0 = Math.max(0, fdiv(cx, T)), c1 = Math.min(this.cols - 1, fdiv(cx + L, T));
    this.frises.forEach((frise, i) => {  // la frise du plafond, lugubre puis en fête
      if ((i === 0 && f >= 0.99) || (i === 1 && f <= 0.01)) return;
      const alpha = i === 0 || f >= 0.99 ? 1 : arrondi(255 * f) / 255;
      for (let x = -mod(cx, 160); x < L; x += 160) coller(ctx, frise, x, 0, alpha);
    });
    const pierre = this.pierre, planche = this.planche;
    for (let r = PLAFOND; r < RANGS; r++) {
      for (let c = c0; c <= c1; c++) {
        const t = this.grille[r][c];
        if (t === "#") coller(ctx, pierre, c * T - cx, r * T);
        else if (t === "-") coller(ctx, planche, c * T - cx, r * T);
      }
    }
    for (const [m0, m1, r, sols] of this.meubles) {
      if (m1 * T - cx > -60 && m0 * T - cx < L + 60) {
        decors.dessiner_meuble(nom_decor, ctx, m0 * T - cx, m1 * T - cx, r * T,
          sols.map(sol => sol * T), f > 0.5);
      }
    }
    for (const ch of this.choses) ch.dessiner(ctx, cx);
    for (const [x, y, absent] of this.bonbons) {
      if (absent <= 0 && -40 < x - cx && x - cx < L + 40) {
        poser(ctx, anime("bonbon", this.t + x), x - cx, y + 3 * Math.sin(this.t * 3 + x));
      }
    }
    this.dessiner_joueurs(ctx, cx);
    const courges = new Set(this.vampires.map(v => v.courge_proche));
    courges.delete(null);
    for (const ch of courges) {  // la courge attend le couteau
      // la touche du couteau de celui qui est à côté de la courge
      const qui = this.vampires.findIndex(v => v.courge_proche === ch);
      ecrire(ctx, `Couteau : ${libelle(Math.max(0, qui), "coucou")} !`, 24, OR,
        { centre: [ch.x - cx, ch.y - ch.h / 2 - 18 - 3 * Math.abs(Math.sin(this.t * 5))] });
    }
    if (this.corbeau) this.corbeau.dessiner(ctx, cx);
    for (const b of this.lances) b.dessiner(ctx, cx);
    // la lumière : sombre au début, de plus en plus claire et chaude avec la fête
    if (f < 0.99) {  // la nuit, plus sombre sur les bords
      ctx.globalCompositeOperation = "multiply";
      ctx.drawImage(ombre(f).canvas, 0, 0, L, H);
      ctx.globalCompositeOperation = "lighter";
      const halo = voiles().halo;
      for (const v of this.vampires) {
        ctx.drawImage(halo.canvas, v.x + v.W / 2 - cx - RAYON_HALO, v.y + v.H / 2 - RAYON_HALO,
          RAYON_HALO * 2, RAYON_HALO * 2);
      }
      ctx.globalCompositeOperation = "source-over";
      this.dessiner_joueurs(ctx, cx, false);  // par-dessus la lumière : bien nets
    }
    if (f > 0.3) {
      const k = (f - 0.3) / 0.7;
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = css([arrondi(28 * k), arrondi(14 * k), 0]);
      ctx.fillRect(0, 0, L, H);
      ctx.globalCompositeOperation = "source-over";
    }
    for (const [x, y, decal, vie, couleur] of this.notes) {  // ♪ qui ondulent en montant
      const nx = x - cx + 6 * Math.sin(vie * 4 + decal);
      const taille = Math.min(1.0, vie);
      dessin.circle(ctx, couleur, [nx, y], 4 * taille + 1);
      dessin.line(ctx, couleur, [nx + 3.5 * taille, y], [nx + 3.5 * taille, y - 13 * taille], 2);
      dessin.line(ctx, couleur, [nx + 3.5 * taille, y - 13 * taille], [nx + 9 * taille, y - 8 * taille], 2);
    }
    for (const [x, y, , , vie, couleur] of this.particules) {  // (cercles simples : il y en a beaucoup)
      dessin.circle(ctx, couleur, [x - cx, y], 2 + 3 * Math.min(1.0, vie));
    }
    for (const [texte, x, y] of this.messages) {
      const demi = largeur_texte(ctx, texte, 32) / 2 + 8;  // toujours en entier à l'écran
      ecrire(ctx, texte, 32, OR, { centre: [borne(x - cx, demi, L - demi), Math.max(HAUT_FRISE + 20, y)] });
    }
    if (apercu) return;
    this.dessiner_poche(ctx);
    if (this.t < 3) {
      ecrire(ctx, `Salle ${this.i_niveau + 1} : ${this.niveau.nom}`, 72, OR, { centre: [fdiv(L, 2), 250] });
    }
    this.dessiner_conseil(ctx);
    if (this.gagne_t !== null && this.gagne_t > 1.0) {
      ecrire(ctx, "La salle est prête pour la fête !", 72, OR, { centre: [fdiv(L, 2), 250] });
      if (this.gagne_t > 2.5) {
        let suite = this.i_niveau + 1 < NIVEAUX.length ? "salle suivante" : "la grande fête !";
        suite = `${majuscule(libelle(0, "saut"))} ou Entrée : ${suite}`;
        ecrire(ctx, suite, 36, BLANC, { centre: [fdiv(L, 2), 330] });
      }
    }
  }

  /** Les personnages, et la laisse magique entre le parent et l'enfant (fine et discrète :
   * on la dessine sous la lumière, qui l'assombrit dans les salles sombres). */
  dessiner_joueurs(ctx, cx, laisse = true) {
    if (this.mode === "parent" && laisse) {
      const [parent, enfant] = this.vampires;
      const a = [parent.x + parent.W / 2 + parent.dir * 10 - cx, parent.y + 30];
      const b = [enfant.x + enfant.W / 2 - cx, enfant.y + 14];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      // elle pend quand elle n'est pas tendue, et ondule un peu, comme un élastique
      const creux = Math.max(3.0, (LAISSE - d) * 0.35) * (1 + 0.15 * Math.sin(this.t * 4));
      const milieu = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + creux];
      const points = range(13).map(k => bezier_point(a, milieu, b, k / 12));
      const tendue = Math.min(1.0, Math.max(0.0, (d - LAISSE) / 150));
      const couleur = melange([150, 120, 200], [235, 205, 130], tendue);
      for (let k = 0; k < 12; k += 2) dessin.line(ctx, couleur, points[k], points[k + 1], 1);  // en pointillés
    }
    for (const v of [...this.vampires].reverse()) v.dessiner(ctx, cx);  // le premier joueur devant
  }

  /** Le conseil du moment, dans la frise, à droite des bonbons. */
  /** Un texte où {saut}, {action}, {coucou} (ou {Saut}… avec une majuscule) sont remplacés
   * par les touches de ceux qui jouent : « flèche du bas », ou à deux « flèche du bas (ou
   * touche S) ». */
  avec_touches(texte) {
    return texte.replace(/\{(saut|action|coucou|Saut|Action|Coucou)\}/g, (_, a) => {
      const t = libelle_pour(a.toLowerCase(), this.vampires.length);
      return a[0] === a[0].toUpperCase() ? majuscule(t) : t;
    });
  }

  dessiner_conseil(ctx) {
    let conseil = null, couleur = BLANC;
    if (this.gagne_t !== null) {
      // rien : la salle est finie
    } else if (0.001 < this.alerte) {
      conseil = "Le corbeau grognon défait tout : va le toucher pour le chasser !";
      couleur = [255, 130, 130];
    } else if (this.niveau.aides.length) {
      const col = fdiv(this.vampire.x + this.vampire.W / 2, T);
      const aides = this.niveau.aides.filter(([c]) => c <= col);
      conseil = aides.length ? this.avec_touches(aides[aides.length - 1][1]) : null;
    } else if (this.t < 8) {
      conseil = this.avec_touches("Transforme tout !  {Saut} : sauter   {Action} : bonbon   {Coucou} : couteau");
    }
    if (conseil) {
      const lignes = envelopper(ctx, conseil, 26, 700).slice(0, 2);
      dessin.rect(ctx, [20, 16, 34], [400, 8, 750, 64], 0, 18);
      lignes.forEach((ligne, k) => {
        ecrire(ctx, ligne, 26, couleur, { centre: [775, 40 + (k - (lignes.length - 1) / 2) * 24] });
      });
    }
  }

  /** Dans la frise, à gauche : les bonbons en poche (une place vide : un rond sombre), puis
   * le compte des choses déjà transformées. */
  dessiner_poche(ctx) {
    const rouge = this.flash > 0 && Math.trunc(this.flash * 6) % 2;  // le corbeau vient de défaire
    dessin.rect(ctx, [20, 16, 32], [10, 8, 380, 64], 0, 20);
    dessin.rect(ctx, rouge ? [230, 60, 60] : [90, 80, 110], [10, 8, 380, 64], 3, 20);
    for (let i = 0; i < POCHE_MAX; i++) {
      const x = 45 + i * 50;
      if (i < this.poche) poser(ctx, "bonbon@0", x, 40, { echelle: 1.1 });
      else dessin.circle(ctx, [60, 52, 80], [x, 40], 9, 2);
    }
    dessin.line(ctx, [60, 52, 80], [278, 20], [278, 60], 2);
    const n = this.choses.filter(ch => ch.fetee).length, total = this.choses.length;
    ecrire(ctx, `${n} / ${total}`, 34, n === total ? OR : rouge ? [230, 60, 60] : BLANC, { centre: [330, 41] });
  }
}
