// Le Bled vu de la cour, la nuit (port de dehors.py) : l'accueil (le vampire arrive dans la
// cour) et le voyage d'une salle à l'autre (on recule jusqu'à la fenêtre de la salle, le
// vampire vole vers la suivante, on plonge dedans).
import { MELEZE, RIDEAU, citrouille, montagnes } from "./decors.js";
import {
  BLANC, ECHELLE, FESTIF, H, L, OR, Rect, anime, arrondi, coller, css, degrade, dessin, hasard,
  melange, poser, toile,
} from "./outils.js";

// --------------------------------------------------------------------------
// Le Bled vu de dehors : l'accueil, et le voyage d'une salle à l'autre
// --------------------------------------------------------------------------

// Le Bled est dessiné avec des mesures « de base », puis agrandi de GRAND autour de CENTRE
// (le pied du bâtiment) : on change sa taille à l'écran sans toucher à ses proportions.
export const GRAND = 1.1, CENTRE = [540, 492];

export function agrandi(x, y) {
  return [CENTRE[0] + (x - CENTRE[0]) * GRAND, CENTRE[1] + (y - CENTRE[1]) * GRAND];
}

/** Un rectangle ([x, y, w, h] ou Rect) en liste [x, y, w, h]. */
function liste(r) {
  return r instanceof Rect ? r.liste : r;
}

export function rect_agrandi(r) {
  r = liste(r);
  const [x, y] = agrandi(r[0], r[1]);
  return new Rect(arrondi(x), arrondi(y), arrondi(r[2] * GRAND), arrondi(r[3] * GRAND));
}

/** Comme outils.dessin, mais en mesures de base (agrandies de GRAND autour de CENTRE). */
class _Agrandi {
  static rect(s, couleur, r, width = 0, border_radius = 0) {
    r = liste(r);
    const [x, y] = agrandi(r[0], r[1]);
    dessin.rect(s, couleur, [x, y, r[2] * GRAND, r[3] * GRAND], width && Math.max(1, arrondi(width * GRAND)),
      arrondi(border_radius * GRAND));
  }

  static circle(s, couleur, centre, rayon, width = 0) {
    dessin.circle(s, couleur, agrandi(...centre), rayon * GRAND, width && Math.max(1, arrondi(width * GRAND)));
  }

  static ellipse(s, couleur, r, width = 0) {
    r = liste(r);
    const [x, y] = agrandi(r[0], r[1]);
    dessin.ellipse(s, couleur, [x, y, r[2] * GRAND, r[3] * GRAND], width);
  }

  static line(s, couleur, a, b, width = 1) {
    dessin.line(s, couleur, agrandi(...a), agrandi(...b), Math.max(1, arrondi(width * GRAND)));
  }

  static polygon(s, couleur, points) {
    dessin.polygon(s, couleur, points.map(pt => agrandi(...pt)));
  }
}

const d = _Agrandi;

// La fenêtre de chaque salle dans le Bled (une par salle de NIVEAUX) : la Bricotine sous
// terre (en coupe), le foyer et la Tanière au rez, la terrasse du 5e sur le toit de l'aile
// basse. En mesures de base (_BASE), puis à l'écran.
export const FENETRES_BASE = [new Rect(560, 504, 140, 72), new Rect(140, 402, 160, 84),
  new Rect(336, 402, 160, 84), new Rect(170, 200, 300, 52)];
export const FENETRES = FENETRES_BASE.map(rect_agrandi);
export const CAVE = new Rect(430, 496, 290, 92);  // la Bricotine dans la terre, sous la cour (base)
export const ARRIVEE = agrandi(84, 492);          // où les personnages se posent dans la cour, à l'accueil
export const SORTIE = 1.2, VOL = 1.8, ENTREE = 1.2;  // durées du voyage : on recule, il vole, on plonge

/** Un point du vol en arc de a vers b (u de 0 à 1). */
export function bezier(a, b, u, hauteur = 130) {
  const cx = (a[0] + b[0]) / 2, cy = Math.min(a[1], b[1]) - hauteur;
  return [(1 - u) ** 2 * a[0] + 2 * (1 - u) * u * cx + u * u * b[0],
    (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * cy + u * u * b[1]];
}

export function doux(u) {
  u = Math.max(0, Math.min(1, u));
  return u * u * (3 - 2 * u);
}

/** Dessine l'écran d'une salle (apercu) dans un rectangle qui glisse de depart à
 *  arrivee : de tout l'écran à la fenêtre de la salle, ou l'inverse. */
export function zoomer(e, apercu, depart, arrivee, u) {
  u = doux(u);
  depart = liste(depart); arrivee = liste(arrivee);
  const r = depart.map((a, i) => a + (arrivee[i] - a) * u);
  const zw = Math.max(1 / ECHELLE, r[2]), zh = Math.max(1 / ECHELLE, r[3]);
  const k = Math.max(zw / apercu.w, zh / apercu.h);  // l'image couvre tout le rectangle
  const w = apercu.w * k, h = apercu.h * k;
  e.save();
  e.beginPath();
  e.rect(r[0], r[1], zw, zh);
  e.clip();
  e.drawImage(apercu.canvas, r[0] + zw / 2 - w / 2, r[1] + zh / 2 - h / 2, w, h);
  e.restore();
}

/** L'image d'une salle (source : tout l'écran) réduite pour remplir la fenêtre r ;
 *  assombrie si la salle n'est pas encore en fête. */
export function vignette(source, r, sombre) {
  r = r instanceof Rect ? r : new Rect(...r);
  const v = toile(r.w, r.h), c = v.ctx;
  const k = Math.max(r.w / source.w, r.h / source.h);
  const w = source.w * k, h = source.h * k;
  c.fillStyle = "black";
  c.fillRect(0, 0, r.w, r.h);
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  c.drawImage(source.canvas, (r.w - w) / 2, (r.h - h) / 2, w, h);
  if (sombre) {
    c.globalCompositeOperation = "multiply";
    c.fillStyle = css([100, 90, 140]);
    c.fillRect(0, 0, r.w, r.h);
    c.globalCompositeOperation = "source-over";
  }
  return v;
}

/**
 * Le Bled la nuit, vu de la cour : l'aile basse (avec la terrasse du 5e sur son toit)
 * et l'aile haute, en mélèze, avec leurs balcons filants et leurs rideaux bleus ; le
 * rez en béton ; derrière, les Alpes. Dans chaque fenêtre de salle, un aperçu :
 * assombri tant qu'elle fait peur, en fête une fois finie. Plus le Bled est en fête,
 * plus il y a de fenêtres allumées, de guirlandes et de citrouilles sur les balcons.
 */
export class Dehors {
  static SOL = 492;                   // le sol de la cour, au pied du rez
  static REZ = 392; static ETAGE = 28;  // le haut du rez, la hauteur d'un étage
  static BASSE = [110, 600, 4];       // l'aile basse : x de gauche, x de droite, étages
  static HAUTE = [600, 962, 8];       // l'aile haute
  static BETON = [78, 78, 88]; static BETON_SOMBRE = [58, 58, 68];

  // les mesures, aussi comme attributs (self.REZ… en Python)
  get SOL() { return Dehors.SOL; }
  get REZ() { return Dehors.REZ; }
  get ETAGE() { return Dehors.ETAGE; }
  get BASSE() { return Dehors.BASSE; }
  get HAUTE() { return Dehors.HAUTE; }

  constructor() {
    this.fond = degrade(L, H, [8, 8, 28], [46, 26, 60]);
    Dehors.dessiner_lune(this.fond.ctx, [1190, 84]);
    const des = hasard(7);
    this.etoiles = [];
    for (let i = 0; i < 80; i++) this.etoiles.push([des.uniform(0, L), des.uniform(0, 330), des.uniform(0.6, 1.6)]);
    // chaque étage : des panneaux de mélèze et de grandes portes vitrées, avec un long
    // rideau bleu à côté de chaque porte (il flotte au vent)
    this.fenetres = []; this.rideaux = []; this.balcons = [];
    for (const [x0, x1, n] of [this.BASSE, this.HAUTE]) {
      for (let k = 0; k < n; k++) {
        const bas = this.REZ - k * this.ETAGE;
        this.balcons.push([x0, x1, bas]);
        for (let x = x0 + 8; x < x1 - 30; x += 52) {
          const ferme = des.random() < 0.25;  // le rideau est tiré devant la vitre
          this.fenetres.push([x + 28, bas - this.ETAGE + 4, 22, this.ETAGE - 9, des.random(), ferme]);
          if (!ferme && des.random() < 0.6) this.rideaux.push([x + 22, bas - this.ETAGE + 2, des.uniform(0, 6)]);
        }
      }
    }
    this.devant = toile(L, H);
    this.dessiner_bled(this.devant.ctx);
    // les étoiles qui scintillent : seulement là où on voit le ciel
    const px = this.devant.ctx.getImageData(0, 0, this.devant.canvas.width, this.devant.canvas.height);
    const pw = this.devant.canvas.width, ph = this.devant.canvas.height;
    this.etoiles = this.etoiles.filter(([x, y]) => {
      const i = Math.min(ph - 1, Math.round(y * ECHELLE)) * pw + Math.min(pw - 1, Math.round(x * ECHELLE));
      return px.data[i * 4 + 3] === 0;
    });
    this.compose = [null, null];  // [fête, image] : le ciel, les nuages, le Bled et ses fenêtres
  }

  /** Le décor fixe en une seule image opaque (rapide à afficher) : le ciel, des nuages,
   *  le Bled et ses fenêtres, allumées selon la fête. Refaite seulement quand la fête change. */
  composer(fete) {
    const image = this.compose[1] || toile(L, H), s = image.ctx;
    s.clearRect(0, 0, L, H);
    coller(s, this.fond, 0, 0);
    [90, 640, 1050].forEach((x, k) => {  // des nuages
      dessin.ellipse(s, [30, 22, 46], [x, 60 + k * 50, 260, 40]);
      dessin.ellipse(s, [30, 22, 46], [x + 60, 46 + k * 50, 150, 36]);
    });
    coller(s, this.devant, 0, 0);
    const rideau = melange(melange(RIDEAU, [20, 14, 30], 0.55), RIDEAU, fete);
    for (const [x, y, w, h, au_hasard, ferme] of this.fenetres) {  // elles s'allument avec la fête
      const allume = au_hasard < 0.12 + 0.75 * fete;
      if (ferme) {  // le rideau tiré, éclairé par derrière si on est là
        d.rect(s, allume ? melange(rideau, [255, 214, 140], 0.45) : melange(rideau, [0, 0, 0], 0.3), [x, y, w, h]);
        for (const k of [5, 11, 17]) d.line(s, melange(rideau, [0, 0, 0], 0.3), [x + k, y], [x + k, y + h], 1);
      } else {
        d.rect(s, allume ? [255, 204, 110] : [22, 24, 38], [x, y, w, h]);
      }
    }
    this.compose = [fete, image];
  }

  // ---- ce qui ne bouge pas : la lune, les Alpes, le bâtiment, la cour, dessinés une fois ----

  /** Un croissant de lune, avec un halo doux et transparent autour. */
  static dessiner_lune(s, centre) {
    // le halo : alpha 70 × (1 − d)², d allant de 0 au centre à 1 au bord (rayon 110)
    const g = s.createRadialGradient(centre[0], centre[1], 0, centre[0], centre[1], 110);
    for (let i = 0; i <= 10; i++) g.addColorStop(i / 10, css([255, 236, 190], 70 / 255 * (1 - i / 10) ** 2));
    s.fillStyle = g;
    s.fillRect(centre[0] - 110, centre[1] - 110, 220, 220);
    const r = 30, c = r + 1;
    const lune = toile(2 * c, 2 * c), l = lune.ctx;
    dessin.circle(l, [246, 236, 200], [c, c], r);
    dessin.circle(l, [226, 214, 176], [r - r / 3, r + r / 2], r / 6);  // des taches
    dessin.circle(l, [226, 214, 176], [r - r / 2, r - r / 3], r / 9);
    l.globalCompositeOperation = "destination-out";  // le croissant
    dessin.circle(l, [0, 0, 0], [c + r * 0.55, c - r * 0.3], r * 0.92);
    l.globalCompositeOperation = "source-over";
    s.save();
    s.translate(centre[0], centre[1]);
    s.rotate(15 * Math.PI / 180);  // pygame.transform.rotate(lune, -15) : dans le sens des aiguilles
    s.drawImage(lune.canvas, -c, -c, 2 * c, 2 * c);
    s.restore();
  }

  dessiner_bled(s) {
    const alpes = [[0, 300], [70, 250], [130, 272], [210, 226], [290, 262], [370, 214], [450, 258],
      [530, 232], [600, 280], [962, 280], [1040, 244], [1130, 270], [1210, 228], [L, 252], [L, 330],
      [0, 330]];
    montagnes(s, alpes.slice(0, -2), 330, false);
    const haut_basse = this.REZ - this.BASSE[2] * this.ETAGE;
    const haut_haute = this.REZ - this.HAUTE[2] * this.ETAGE;
    const bois = melange(MELEZE, [20, 14, 30], 0.6);                    // le mélèze, la nuit
    const dalle = [150, 150, 160], garde_corps = [176, 176, 186];      // béton clair, garde-corps blancs
    for (const [[x0, x1], haut] of [[this.BASSE, haut_basse], [this.HAUTE, haut_haute]]) {
      d.rect(s, bois, [x0, haut, x1 - x0, this.REZ - haut]);
      for (let x = x0; x < x1; x += 6)  // les lames de bois verticales
        d.line(s, melange(bois, [0, 0, 0], 0.22), [x, haut], [x, this.REZ], 1);
    }
    // l'aile haute fait un angle avec l'aile basse : son côté, dans l'ombre
    d.rect(s, melange(bois, [0, 0, 0], 0.35), [this.HAUTE[0], haut_haute, 18, haut_basse - haut_haute]);
    for (const [x0, x1, bas] of this.balcons) {  // les balcons filants, qui débordent aux angles
      d.rect(s, dalle, [x0 - 16, bas - 5, x1 - x0 + 32, 5]);
      d.line(s, garde_corps, [x0 - 16, bas - 17], [x1 + 16, bas - 17], 1);
      for (let x = x0 - 16; x < x1 + 17; x += 4)
        d.line(s, melange(garde_corps, [0, 0, 0], 0.25), [x, bas - 17], [x, bas - 5], 1);
    }
    for (const [x0, x1, haut] of [[this.BASSE[0], this.BASSE[1], haut_basse], [this.HAUTE[0], this.HAUTE[1], haut_haute]])
      d.rect(s, dalle, [x0 - 18, haut - 7, x1 - x0 + 36, 7]);  // le toit, épais
    // la terrasse du 5e, sur le toit de l'aile basse : la pergola, large et basse, à
    // l'écart de l'aile haute (la fête qui s'y passe se voit dessous)
    const poutre = melange([190, 144, 88], [20, 14, 30], 0.45);
    let r = FENETRES_BASE[3];
    for (const x of [r.x - 22, r.centerx - 4, r.right + 14])
      d.rect(s, poutre, [x, r.y - 12, 8, haut_basse - 7 - (r.y - 12)]);
    d.rect(s, poutre, [r.x - 30, r.y - 16, r.w + 60, 8]);
    for (let x = r.x - 30; x < r.right + 30; x += 14)  // les lattes de la pergola
      d.rect(s, melange(poutre, [0, 0, 0], 0.2), [x, r.y - 22, 5, 6]);
    // puis sa balustrade, tout le long du bord, devant la pergola
    const y0 = haut_basse - 22, y1 = haut_basse - 7;
    d.line(s, garde_corps, [this.BASSE[0] - 18, y0], [this.BASSE[1], y0], 2);
    for (let x = this.BASSE[0] - 18; x < this.BASSE[1] + 1; x += 4)
      d.line(s, melange(garde_corps, [0, 0, 0], 0.25), [x, y0], [x, y1], 1);
    // le rez, en béton clair, en retrait sous le premier balcon, posé sur le sol
    const rez = [96, 96, 106];
    const x0 = this.BASSE[0] + 10, x1 = this.HAUTE[1] - 10;
    d.rect(s, rez, [x0, this.REZ, x1 - x0, this.SOL - this.REZ]);
    d.rect(s, [60, 60, 70], [x0, this.REZ, x1 - x0, 6]);
    for (const x of [596, 686, 776, 866]) {  // des vitres du rez (l'épicerie, les bureaux…)
      d.rect(s, [24, 26, 40], [x, 410, 56, 74]);
      d.line(s, [60, 62, 74], [x + 28, 410], [x + 28, 484], 2);
    }
    // la porte d'entrée : un auvent, une lampe, deux battants vitrés, un paillasson
    d.rect(s, [130, 130, 140], [512, 400, 64, 6]);
    d.rect(s, [60, 60, 70], [512, 406, 64, 3]);
    d.circle(s, [255, 220, 150], [544, 414], 3);
    d.rect(s, [120, 120, 130], [518, 418, 52, 74]);
    for (const x of [522, 545]) {
      d.rect(s, [28, 40, 64], [x, 422, 21, 70]);
      d.line(s, [70, 90, 120], [x + 4, 432], [x + 12, 422], 2);   // un reflet
      d.line(s, [70, 90, 120], [x + 4, 446], [x + 18, 428], 1);
    }
    d.line(s, [190, 190, 200], [541, 446], [541, 466], 2);          // les poignées
    d.line(s, [190, 190, 200], [549, 446], [549, 466], 2);
    d.rect(s, [70, 50, 40], [514, 489, 60, 4]);
    // sous la cour, la terre, en coupe ; dedans, la Bricotine
    const terre = [44, 32, 30];
    d.rect(s, terre, [0, this.SOL, L, H - this.SOL]);
    const des = hasard(5);
    for (let i = 0; i < 220; i++) {  // des cailloux dans la terre
      const x = des.uniform(0, L), y = des.uniform(this.SOL + 10, H);
      d.ellipse(s, melange(terre, [90, 76, 66], des.uniform(0.2, 0.6)), [x, y, des.uniform(3, 7), 3]);
    }
    for (const y of [560, 630, 690])  // les couches de terre
      d.line(s, melange(terre, [0, 0, 0], 0.25), [0, y], [L, y + des.uniform(-6, 6)], 1);
    d.rect(s, melange(terre, [0, 0, 0], 0.3), [x0, this.SOL, x1 - x0, 10]);  // les fondations
    const c = CAVE;
    d.rect(s, [110, 110, 120], c, 0, 4);                          // les murs de béton de la cave
    d.rect(s, [30, 28, 36], c.inflate(-12, -12), 0, 2);
    for (const x of [c.x + 22, c.x + 70]) {  // des vélos de la vélostation, à côté de l'atelier
      d.circle(s, [76, 76, 86], [x, c.bottom - 20], 9, 2);
      d.circle(s, [76, 76, 86], [x + 24, c.bottom - 20], 9, 2);
      d.line(s, [110, 70, 70], [x, c.bottom - 20], [x + 12, c.bottom - 34], 2);
      d.line(s, [110, 70, 70], [x + 12, c.bottom - 34], [x + 24, c.bottom - 20], 2);
    }
    // le sol de la cour : une bande de gravier et d'herbe
    d.rect(s, [62, 60, 66], [0, this.SOL, L, 6]);
    for (let x = 0; x < L; x += 7)
      if (!(x0 - 6 < x && x < x1 + 6)) d.line(s, [40, 60, 40], [x, this.SOL], [x + 2, this.SOL - 5], 1);
    for (const [x, h] of [[66, 210], [1180, 230]]) {  // deux grands pins
      d.rect(s, [30, 22, 20], [x - 4, this.SOL - h * 0.2, 8, h * 0.2]);
      for (let k = 0; k < 3; k++) {
        const y = this.SOL - h * 0.2 - k * h * 0.25;
        const w = h * (0.32 - k * 0.07);
        d.polygon(s, [16, 30, 26], [[x - w, y], [x, y - h * 0.4], [x + w, y]]);
      }
    }
    for (const [x, h] of [[1100, 100]]) {  // un jeune arbre
      d.line(s, [40, 30, 26], [x, this.SOL], [x, this.SOL - h], 4);
      for (const [dx, dy, rr] of [[0, -h, 28], [-18, -h + 16, 20], [18, -h + 14, 22]])
        d.circle(s, [24, 40, 30], [x + dx, this.SOL + dy], rr);
    }
    for (const [x, y] of [[1050, 480], [1124, 484]]) {  // des rondins
      d.rect(s, [82, 64, 46], [x, y, 14, 12], 0, 3);
      d.ellipse(s, [130, 104, 72], [x, y - 3, 14, 6]);
    }
  }

  // ---- ce qui bouge ----

  /** vignettes : { i: toile } ; allumees : un Set d'indices (les salles finies). */
  dessiner(e, t, vignettes, allumees, cible = null) {
    const fete = allumees.size / FENETRES.length;
    if (this.compose[0] !== fete) this.composer(fete);
    coller(e, this.compose[1], 0, 0);
    for (const [x, y, r] of this.etoiles)
      dessin.circle(e, [230, 230, 255], [x, y], r * (0.6 + 0.4 * Math.sin(t * 2 + x)));
    const bleu = melange(melange(RIDEAU, [20, 14, 30], 0.55), RIDEAU, fete);
    for (const [x, y, decal] of this.rideaux) {  // les rideaux bleus flottent au vent
      const onde = 3 * Math.sin(t * 1.7 + decal);
      d.polygon(e, bleu, [[x, y], [x + 6, y], [x + 6 + onde, y + this.ETAGE - 7], [x + onde, y + this.ETAGE - 7]]);
    }
    if (fete > 0) {  // des guirlandes et des citrouilles sur les balcons
      const n = arrondi(fete * this.balcons.length);
      this.balcons.slice().reverse().slice(0, n).forEach(([x0, x1, bas], k) => {
        for (let i = 0, x = x0; x < x1; i++, x += 24) {
          const c = Math.trunc(t * 3 + i) % 4 ? FESTIF[(i + k) % 5] : BLANC;
          d.circle(e, c, [x + 12, bas - this.ETAGE + 5 + 3 * Math.sin(i)], 2);
        }
        citrouille(e, ...agrandi(x0 + 30 + (k * 97) % (x1 - x0 - 60), bas - 5), 6 * GRAND, true);
      });
    }
    FENETRES.forEach((r, i) => {
      if (vignettes[i]) coller(e, vignettes[i], r.x, r.y);
      else dessin.rect(e, [18, 16, 30], r.liste);
      dessin.rect(e, [34, 34, 42], r.inflate(6, 6).liste, 4, 4);
      if (i === cible) {
        const g = 10 + 4 * Math.sin(t * 6);
        dessin.rect(e, OR, r.inflate(g, g).liste, 3, 8);
      }
    });
    if (fete > 0) {  // des lampions sous la pergola
      const r = FENETRES_BASE[3];
      for (let k = 0, x = r.x - 20; x < r.right + 24; k++, x += 30) {  // accrochés à la poutre
        const y = r.y - 6 + 3 * Math.sin(t * 2 + k);
        d.line(e, [60, 50, 40], [x, r.y - 10], [x, y], 1);
        d.circle(e, FESTIF[k % 5], [x, y], 5);
      }
    }
    for (let k = 0; k < arrondi(4 * (1 - fete)); k++) {  // les chauves-souris s'en vont avec la fête
      const x = (((k * 370 + t * (60 + k * 15)) % (L + 200)) + (L + 200)) % (L + 200) - 100;
      const y = 150 + 40 * Math.sin(t * 1.3 + k) + k * 40;
      poser(e, anime("chauve_souris", t + k), x, y, { echelle: 0.5 });
    }
  }
}
