// Les outils de dessin communs (port de outils.py) : taille de l'écran, couleurs, dessin
// en coordonnées du jeu, texte, images (les SVG fabriqués par animations.js) et hasard.
//
// Tout le jeu est pensé sur un écran de 1280 x 720 « points du jeu ». Chaque toile (le
// canvas de la page, ou une toile hors écran) est ECHELLE fois plus fine en vrais pixels
// (2 sur un écran Retina) ; son contexte est déjà agrandi : on dessine toujours en points
// du jeu.
import { ANIMES } from "./animations.js";

export const L = 1280, H = 720;      // taille de l'écran de jeu
export const DT = 1 / 60;            // 60 images par seconde
export const T = 40;                 // taille d'une tuile des salles

// 2 sur un écran haute définition, 1 sinon (?sd dans l'adresse force la simple définition).
export const ECHELLE = new URLSearchParams(location.search).has("sd") ? 1
  : Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1)));

export const BLANC = [255, 255, 255], NOIR = [20, 20, 30], OR = [255, 206, 60];
export const ORANGE = [255, 138, 30], VIOLET = [155, 77, 255], ROSE = [255, 90, 160], VERT = [76, 217, 100];
export const FESTIF = [ORANGE, VIOLET, ROSE, VERT, OR];

// Taille d'affichage de chaque image, en points du jeu (les dessins sont dans animations.js).
export const TAILLES = {
  vampire: [54, 64], vampire_marche: [54, 64], vampire_saut: [54, 64],
  vampirette: [54, 64], vampirette_marche: [54, 64], vampirette_saut: [54, 64],
  parent: [54, 64], parent_marche: [54, 64], parent_saut: [54, 64],
  petit: [41, 48], petit_marche: [41, 48], petit_saut: [41, 48],
  courge: [56, 56], soupe: [60, 68],
  squelette: [40, 60], squelette_danse: [40, 60], squelette_tas: [44, 33],
  fantome_peur: [60, 60], fantome_gentil: [56, 56],
  chauve_souris: [56, 42], ballon: [42, 56],
  toile: [60, 60], guirlande: [72, 72],
  chandelier_eteint: [64, 64], chandelier_allume: [64, 68],
  neon_eteint: [96, 40], neon_allume: [96, 40], suspension_eteinte: [64, 64],
  suspension_allumee: [64, 64], projecteur_eteint: [64, 64], projecteur_allume: [64, 64],
  lampion_eteint: [64, 64], lampion_allume: [64, 64],
  corbeau_vol: [86, 67], corbeau_picore: [86, 67], corbeau_ricane: [86, 67],
  couteau: [33, 12], bonbon: [36, 24],
};

// ---- couleurs ----

/** Une couleur [r, g, b] (ou [r, g, b, a] avec a de 0 à 255) en couleur CSS. */
export function css(c, alpha = 1) {
  const a = (c.length > 3 ? c[3] / 255 : 1) * alpha;
  return a >= 1 ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

export function melange(a, b, u) {
  return [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * u));
}

// ---- toiles (les « Surface » de pygame) ----

/** Une toile hors écran de w x h points du jeu : { canvas, ctx, w, h }, ctx déjà agrandi. */
export function toile(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * ECHELLE));
  canvas.height = Math.max(1, Math.round(h * ECHELLE));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ECHELLE, 0, 0, ECHELLE, 0, 0);
  return { canvas, ctx, w, h };
}

/** Colle une toile (ou une image) en (x, y), en points du jeu ; alpha de 0 à 1. */
export function coller(ctx, t, x, y, alpha = 1) {
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * alpha;
  ctx.drawImage(t.canvas || t, x, y, t.w ?? t.width / ECHELLE, t.h ?? t.height / ECHELLE);
  ctx.globalAlpha = a;
}

/** Un dégradé vertical de haut à bas, sur une toile de w x h. */
export function degrade(w, h, haut, bas) {
  const t = toile(w, h);
  const g = t.ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, css(haut));
  g.addColorStop(1, css(bas));
  t.ctx.fillStyle = g;
  t.ctx.fillRect(0, 0, w, h);
  return t;
}

// ---- dessin, comme pygame.draw (mêmes paramètres, en points du jeu) ----

function chemin_rect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (r > 0 && ctx.roundRect) ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
  else ctx.rect(x, y, w, h);
}

export const dessin = {
  /** r = [x, y, w, h] ; width > 0 : seulement le contour, de cette épaisseur. */
  rect(ctx, couleur, r, width = 0, border_radius = 0) {
    const [x, y, w, h] = r;
    if (width > 0) {
      chemin_rect(ctx, x + width / 2, y + width / 2, w - width, h - width, border_radius);
      ctx.strokeStyle = css(couleur);
      ctx.lineWidth = width;
      ctx.stroke();
    } else {
      chemin_rect(ctx, x, y, w, h, border_radius);
      ctx.fillStyle = css(couleur);
      ctx.fill();
    }
  },
  circle(ctx, couleur, centre, rayon, width = 0) {
    if (rayon <= 0) return;
    ctx.beginPath();
    if (width > 0) {
      ctx.arc(centre[0], centre[1], Math.max(0.1, rayon - width / 2), 0, Math.PI * 2);
      ctx.strokeStyle = css(couleur);
      ctx.lineWidth = width;
      ctx.stroke();
    } else {
      ctx.arc(centre[0], centre[1], rayon, 0, Math.PI * 2);
      ctx.fillStyle = css(couleur);
      ctx.fill();
    }
  },
  ellipse(ctx, couleur, r, width = 0) {
    const [x, y, w, h] = r;
    if (w <= 0 || h <= 0) return;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    if (width > 0) {
      ctx.strokeStyle = css(couleur);
      ctx.lineWidth = width;
      ctx.stroke();
    } else {
      ctx.fillStyle = css(couleur);
      ctx.fill();
    }
  },
  line(ctx, couleur, a, b, width = 1) {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.strokeStyle = css(couleur);
    ctx.lineWidth = width;
    ctx.lineCap = "butt";
    ctx.stroke();
  },
  polygon(ctx, couleur, points) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    ctx.fillStyle = css(couleur);
    ctx.fill();
  },
};

// ---- texte ----

/** La police d'une taille donnée (même taille apparente que la police de pygame). */
export function police(taille) {
  return `bold ${Math.round(taille * 0.72)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
}

export function largeur_texte(ctx, msg, taille) {
  ctx.font = police(taille);
  return ctx.measureText(msg).width;
}

/**
 * Écrit msg, centré sur o.centre = [x, y] ou à partir du coin haut gauche o.gauche = [x, y],
 * avec une petite ombre (o.ombre : une couleur, ou null pour aucune ; NOIR par défaut).
 * Renvoie le rectangle occupé { x, y, w, h }.
 */
export function ecrire(ctx, msg, taille, couleur, o = {}) {
  const ombre = o.ombre === undefined ? NOIR : o.ombre;
  ctx.font = police(taille);
  ctx.textBaseline = "middle";
  const w = ctx.measureText(msg).width, h = taille * 0.75;
  let x, y;
  if (o.centre) { x = o.centre[0] - w / 2; y = o.centre[1]; }
  else { x = o.gauche[0]; y = o.gauche[1] + h / 2; }
  if (ombre) {
    ctx.fillStyle = css(ombre);
    ctx.fillText(msg, x + 1.5, y + 1.5);
  }
  ctx.fillStyle = css(couleur);
  ctx.fillText(msg, x, y);
  return { x, y: y - h / 2, w, h };
}

/** Coupe texte en lignes qui tiennent dans largeur (points du jeu). */
export function envelopper(ctx, texte, taille, largeur) {
  ctx.font = police(taille);
  const lignes = [];
  let ligne = "";
  for (const mot of texte.split(/\s+/).filter(Boolean)) {
    const essai = (ligne + " " + mot).trim();
    if (ctx.measureText(essai).width > largeur && ligne) {
      lignes.push(ligne);
      ligne = mot;
    } else ligne = essai;
  }
  return [...lignes, ligne];
}

// ---- images : chaque image de chaque dessin animé, faite d'avance en toile ----

const _images = new Map();

/** Fabrique toutes les images (à attendre une fois au lancement : await preparer_images()). */
export async function preparer_images(progres = () => {}) {
  const taches = [];
  let faites = 0, total = 0;
  for (const [nom, [, n]] of Object.entries(ANIMES)) total += n;
  for (const [nom, [fabrique, n]] of Object.entries(ANIMES)) {
    const [w, h] = TAILLES[nom];
    for (let k = 0; k < n; k++) {
      const svg = fabrique(k / n);
      const img = new Image();
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      taches.push(img.decode().then(() => {
        const t = toile(w, h);
        t.ctx.drawImage(img, 0, 0, w, h);
        _images.set(`${nom}@${k}`, t);
        progres(++faites / total);
      }));
    }
  }
  await Promise.all(taches);
}

/** L'image « squelette@3 » (image n° 3 du dessin animé du squelette), retournée si gauche. */
export function image(nom, gauche = false) {
  if (!nom.includes("@")) nom += "@0";
  const cle = gauche ? nom + "<" : nom;
  let t = _images.get(cle);
  if (!t && gauche) {
    const droite = image(nom);
    t = toile(droite.w, droite.h);
    t.ctx.translate(droite.w, 0);
    t.ctx.scale(-1, 1);
    t.ctx.drawImage(droite.canvas, 0, 0, droite.w, droite.h);
    _images.set(cle, t);
  }
  if (!t) throw new Error("image inconnue : " + nom);
  return t;
}

/** Nom de l'image du dessin animé nom à l'instant t (secondes). */
export function anime(nom, t) {
  const [, n, vitesse] = ANIMES[nom];
  return `${nom}@${((Math.floor(t * vitesse * n) % n) + n) % n}`;
}

/**
 * Dessine l'image nom centrée sur (cx, cy). o.gauche : retournée ; o.angle : en degrés,
 * sens inverse des aiguilles d'une montre (comme pygame) ; o.echelle ; o.alpha (0 à 255).
 */
export function poser(ctx, nom, cx, cy, o = {}) {
  const im = image(nom, o.gauche || false);
  const e = o.echelle ?? 1, angle = o.angle || 0, alpha = o.alpha ?? 255;
  ctx.save();
  if (alpha < 255) ctx.globalAlpha *= alpha / 255;
  ctx.translate(cx, cy);
  if (angle) ctx.rotate(-angle * Math.PI / 180);
  ctx.drawImage(im.canvas, -im.w * e / 2, -im.h * e / 2, im.w * e, im.h * e);
  ctx.restore();
}

// ---- hasard reproductible (comme random.Random(graine) en Python) ----

/** Un générateur de hasard qui donne toujours la même suite pour la même graine. */
export function hasard(graine = 1) {
  let s = (graine * 2654435761) >>> 0 || 1;
  const random = () => {   // mulberry32
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    random,
    uniform: (a, b) => a + (b - a) * random(),
    choice: arr => arr[Math.floor(random() * arr.length)],
    randrange: n => Math.floor(random() * n),
  };
}

/** Le hasard ordinaire (comme le module random de Python). */
export const aleatoire = {
  random: Math.random,
  uniform: (a, b) => a + (b - a) * Math.random(),
  choice: arr => arr[Math.floor(Math.random() * arr.length)],
  randrange: n => Math.floor(Math.random() * n),
};

/** range(a, b, pas) de Python. */
export function range(a, b, pas = 1) {
  if (b === undefined) { b = a; a = 0; }
  const r = [];
  if (pas > 0) for (let x = a; x < b; x += pas) r.push(x);
  else for (let x = a; x > b; x += pas) r.push(x);
  return r;
}

/** Arrondi comme le round() de Python (au pair le plus proche pour les .5). */
export function arrondi(x) {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
}

// ---- rectangles (comme pygame.Rect / FRect) ----

export class Rect {
  constructor(x, y, w, h) { this.x = x; this.y = y; this.w = w; this.h = h; }
  get left() { return this.x; }
  get top() { return this.y; }
  get right() { return this.x + this.w; }
  get bottom() { return this.y + this.h; }
  get centerx() { return this.x + this.w / 2; }
  get centery() { return this.y + this.h / 2; }
  get center() { return [this.centerx, this.centery]; }
  /** Pour passer le rectangle aux fonctions de dessin : [x, y, w, h]. */
  get liste() { return [this.x, this.y, this.w, this.h]; }
  inflate(dx, dy) { return new Rect(this.x - dx / 2, this.y - dy / 2, this.w + dx, this.h + dy); }
  move(dx, dy) { return new Rect(this.x + dx, this.y + dy, this.w, this.h); }
  copy() { return new Rect(this.x, this.y, this.w, this.h); }
  colliderect(r) {
    if (Array.isArray(r)) r = new Rect(...r);
    return this.x < r.x + r.w && r.x < this.x + this.w && this.y < r.y + r.h && r.y < this.y + this.h;
  }
  collidepoint(x, y) { return x >= this.x && x < this.x + this.w && y >= this.y && y < this.y + this.h; }
}
