// Les décors des quatre salles du Bled (port de decors.py), dessinés une fois pour toutes,
// chacun en deux versions (lugubre et en fête) que la salle mélange selon sa fête :
// - la Bricotine (l'atelier de bricolage du sous-sol, avec la vélostation) ;
// - le foyer (au rez : boiseries en mélèze, bar, grandes vitres sur la cour) ;
// - la Tanière (la salle polyvalente : murs noirs, rideaux, écran, gradins, projecteurs) ;
// - la terrasse du 5e (dehors : pergola, bacs du potager, vue sur le lac et les Alpes).
//
// Pour chaque décor : le mur du fond (MOTIF points de large, répété), la frise du plafond
// (160 points de large, répétée) et les deux tuiles (le plein et la planche).
import { FESTIF, H, T, dessin, hasard, melange, range, toile, css } from "./outils.js";

export const MOTIF = 1920;               // largeur du motif du mur du fond
export const HAUT_FRISE = 80;
export const DECORS = ["bricotine", "foyer", "taniere", "terrasse"];

export const CIEL_NUIT = [[8, 10, 30], [34, 26, 66]], CIEL_FETE = [[26, 16, 64], [110, 52, 96]];
export const MELEZE = [176, 122, 66];    // le bois des façades et des boiseries du Bled
export const RIDEAU = [140, 190, 218];   // les rideaux bleus des balcons

const rad = a => a * Math.PI / 180;

function couleur(fete, nuit, jour) {
  return fete ? jour : nuit;
}

/** Remplit toute la toile d'une couleur (le fill() de pygame). */
function remplir(t, c) {
  t.ctx.fillStyle = css(c);
  t.ctx.fillRect(0, 0, t.w, t.h);
}

function degrade_vertical(s, x, y, w, h, haut, bas, pas = 4) {
  for (const k of range(0, h, pas)) dessin.rect(s, melange(haut, bas, k / h), [x, y + k, w, pas]);
}

/** Les points d'une guirlande qui pend de a à b. */
function points_pendants(a, b, creux, n) {
  return range(n + 1).map(k => [a[0] + (b[0] - a[0]) * k / n,
    a[1] + (b[1] - a[1]) * k / n + creux * Math.sin(k / n * Math.PI)]);
}

/** Une guirlande de fanions de a à b (en fête : en couleurs ; sinon : grise et déchirée). */
export function fanions(s, a, b, fete, creux = 24, n = 10) {
  const pts = points_pendants(a, b, creux, n);
  for (let k = 0; k < n; k++)
    dessin.line(s, fete ? [110, 100, 90] : [60, 58, 62], pts[k], pts[k + 1], 1);
  for (let k = 0; k < n; k++) {
    const [xa, ya] = pts[k], [xb, yb] = pts[k + 1];
    if (!fete && k % 3 === 1) continue;  // il en manque
    const c = fete ? FESTIF[k % 5] : [54, 52, 60];
    const bout = fete ? 18 : 12;
    dessin.polygon(s, c, [[xa + 2, ya], [xb - 2, yb], [(xa + xb) / 2, (ya + yb) / 2 + bout]]);
  }
}

/** Une citrouille posée (bas en y), côtelée : éteinte, ou lanterne qui brille. */
export function citrouille(s, x, y, r, allumee) {
  if (allumee) dessin.circle(s, [110, 56, 30], [x, y - r], r * 1.7);
  const corps = allumee ? [232, 122, 34] : [120, 74, 40];
  const sombre = melange(corps, [0, 0, 0], 0.3);
  for (const [dx, k] of [[-0.75, 0.75], [0.75, 0.75], [-0.35, 0.95], [0.35, 0.95]])  // les côtes
    dessin.ellipse(s, sombre, [x + dx * r - r * 0.6, y - r * 2 * k, r * 1.2, r * 2 * k]);
  dessin.ellipse(s, corps, [x - r * 0.7, y - r * 2, r * 1.4, r * 2]);
  dessin.ellipse(s, melange(corps, [255, 255, 255], 0.25), [x - r * 0.45, y - r * 1.7, r * 0.25, r * 0.7]);
  dessin.rect(s, [90, 74, 34], [x - 2, y - r * 2 - 6, 4, 8], 0, 2);
  dessin.line(s, [90, 130, 50], [x + 2, y - r * 2 - 4], [x + r * 0.6, y - r * 2 - 8], 2);
  if (allumee) {
    const oeil = [255, 220, 100];
    dessin.polygon(s, oeil, [[x - r * 0.7, y - r * 1.1], [x - r * 0.2, y - r * 1.1], [x - r * 0.45, y - r * 1.55]]);
    dessin.polygon(s, oeil, [[x + r * 0.7, y - r * 1.1], [x + r * 0.2, y - r * 1.1], [x + r * 0.45, y - r * 1.55]]);
    dessin.polygon(s, oeil, [[x - r * 0.75, y - r * 0.85], [x + r * 0.75, y - r * 0.85], [x + r * 0.45, y - r * 0.45],
      [x, y - r * 0.6], [x - r * 0.45, y - r * 0.45]]);
  }
}

/** Une guirlande d'ampoules (éteintes, ou allumées en couleurs). */
export function guirlande_lumineuse(s, a, b, fete, creux = 20, n = 14) {
  const pts = points_pendants(a, b, creux, n);
  for (let k = 0; k < n; k++) dessin.line(s, [50, 46, 50], pts[k], pts[k + 1], 1);
  pts.slice(1, -1).forEach(([x, y], k) => {
    if (fete) {
      const c = FESTIF[k % 5];
      dessin.circle(s, melange(c, [0, 0, 0], 0.5), [x, y + 5], 7);
      dessin.circle(s, c, [x, y + 5], 4);
    } else {
      dessin.circle(s, [70, 70, 76], [x, y + 5], 3);
    }
  });
}

// --------------------------------------------------------------------------
// La Bricotine : l'atelier et la vélostation, au sous-sol
// --------------------------------------------------------------------------

/** Un vélo de profil, roues posées sur y. */
function velo(s, x, y, c, fete, r = 26) {
  const roue = [40, 40, 46];
  for (const cx of [x - 34, x + 34]) {
    dessin.circle(s, roue, [cx, y - r], r, 3);
    dessin.circle(s, [90, 90, 96], [cx, y - r], 3);
  }
  const a = [x - 34, y - r], b = [x + 34, y - r];
  const selle = [x - 8, y - r - 30], guidon = [x + 24, y - r - 34];
  const pedalier = [x, y - r];
  for (const [p, q] of [[a, pedalier], [pedalier, selle], [selle, a], [pedalier, guidon],
    [selle, [x + 20, y - r - 26]], [guidon, b]])
    dessin.line(s, c, p, q, 3);
  dessin.line(s, [30, 30, 34], [selle[0] - 8, selle[1] - 3], [selle[0] + 8, selle[1] - 3], 4);
  dessin.line(s, [30, 30, 34], guidon, [guidon[0] - 6, guidon[1] - 6], 3);
  if (fete) {  // un ballon attaché au guidon
    const bc = FESTIF[x % 5];
    dessin.line(s, [200, 200, 200], guidon, [guidon[0] + 6, guidon[1] - 60], 1);
    dessin.ellipse(s, bc, [guidon[0] - 6, guidon[1] - 86, 24, 30]);
  }
}

/** Une rangée d'outils variés accrochés au panneau : clé à molette, pince, mètre,
 *  niveau, serre-joint, tournevis, clé plate, maillet. */
function petits_outils(s, x, y, fete) {
  const acier = couleur(fete, [90, 92, 100], [196, 200, 208]);
  const rouge = couleur(fete, [90, 40, 40], [220, 60, 50]), jaune = couleur(fete, [100, 90, 40], [250, 200, 40]),
    bleu = couleur(fete, [40, 50, 90], [60, 120, 220]);
  // la clé à molette
  dessin.rect(s, acier, [x - 3, y + 4, 6, 50], 0, 3);
  dessin.circle(s, acier, [x, y + 4], 9);
  dessin.rect(s, melange(acier, [0, 0, 0], 0.5), [x - 3, y - 6, 6, 8]);
  // la pince
  x += 44;
  dessin.line(s, rouge, [x - 6, y + 56], [x - 1, y + 18], 4);
  dessin.line(s, rouge, [x + 6, y + 56], [x + 1, y + 18], 4);
  dessin.polygon(s, acier, [[x - 4, y + 18], [x + 4, y + 18], [x + 2, y], [x - 2, y]]);
  // le mètre ruban
  x += 44;
  dessin.circle(s, jaune, [x, y + 22], 14);
  dessin.circle(s, melange(jaune, [0, 0, 0], 0.4), [x, y + 22], 5);
  dessin.rect(s, jaune, [x + 10, y + 32, 18, 4]);
  // le niveau à bulle
  x += 38;
  dessin.rect(s, bleu, [x, y + 10, 70, 12], 0, 3);
  dessin.rect(s, couleur(fete, [60, 90, 60], [140, 240, 120]), [x + 28, y + 12, 14, 8], 0, 3);
  // le serre-joint
  x += 96;
  dessin.rect(s, acier, [x - 2, y, 5, 58]);
  dessin.rect(s, rouge, [x - 2, y, 26, 8]);
  dessin.rect(s, rouge, [x - 2, y + 40, 26, 8]);
  dessin.rect(s, couleur(fete, [60, 40, 30], [150, 90, 40]), [x + 22, y + 46, 8, 16], 0, 2);
  // des tournevis de couleur
  [jaune, bleu, rouge].forEach((c, k) => {
    const xx = x + 50 + k * 18;
    dessin.rect(s, c, [xx - 4, y, 8, 22], 0, 3);
    dessin.line(s, acier, [xx, y + 22], [xx, y + 54], 2);
  });
  // la clé plate et le maillet
  x += 120;
  dessin.line(s, acier, [x, y + 6], [x, y + 54], 4);
  dessin.circle(s, acier, [x, y + 6], 6, 3);
  dessin.circle(s, acier, [x, y + 54], 5, 3);
  x += 34;
  dessin.rect(s, couleur(fete, [80, 60, 40], [200, 160, 100]), [x - 2, y + 16, 5, 44]);
  dessin.rect(s, couleur(fete, [60, 60, 64], [120, 120, 126]), [x - 12, y + 4, 24, 14], 0, 3);
}

function mur_bricotine(fete) {
  const t = toile(MOTIF, H), s = t.ctx;
  const beton = couleur(fete, [46, 48, 56], [128, 122, 116]);
  remplir(t, beton);
  const trait = melange(beton, [0, 0, 0], 0.18);
  for (const y of range(140, H, 130)) dessin.line(s, trait, [0, y], [MOTIF, y], 1);  // le béton brut : les joints de coffrage et les trous
  for (const x of range(60, MOTIF, 240))
    for (const y of range(200, 620, 130)) {
      dessin.circle(s, trait, [x, y], 3);
      dessin.circle(s, trait, [x + 120, y], 3);
    }
  dessin.rect(s, couleur(fete, [60, 34, 40], [170, 80, 78]), [0, 640, MOTIF, 40]);  // le sol rose
  // la vélostation : des râteliers à deux étages
  const metal = couleur(fete, [70, 74, 82], [170, 176, 184]);
  for (const y of [520, 650]) dessin.rect(s, metal, [60, y, 560, 6]);
  for (const x of range(80, 620, 120)) dessin.line(s, metal, [x, 400], [x, 652], 4);
  range(120, 600, 110).forEach((x, k) => {
    velo(s, x, 520, couleur(fete, [70, 40, 44], FESTIF[k % 5]), fete && k % 2 === 0);
    velo(s, x + 50, 650, couleur(fete, [50, 54, 64], FESTIF[(k + 2) % 5]), false);
  });
  // le panneau à outils au-dessus de l'établi
  const panneau = couleur(fete, [70, 60, 48], [196, 170, 128]);
  dessin.rect(s, panneau, [720, 300, 420, 230]);
  for (const x of range(730, 1140, 16))
    for (const y of range(310, 530, 16)) dessin.circle(s, melange(panneau, [0, 0, 0], 0.25), [x, y], 1);
  const manche = couleur(fete, [90, 40, 40], [220, 50, 50]);
  const acier = couleur(fete, [90, 92, 100], [190, 196, 204]);
  range(760, 1120, 46).forEach((x, k) => {  // marteaux, tournevis, clés, scie
    const genre = k % 4;
    if (genre === 0) {
      dessin.rect(s, manche, [x - 3, 340, 6, 70], 0, 2);
      dessin.rect(s, acier, [x - 14, 330, 28, 14], 0, 2);
    } else if (genre === 1) {
      dessin.rect(s, manche, [x - 5, 330, 10, 34], 0, 4);
      dessin.line(s, acier, [x, 364], [x, 420], 3);
    } else if (genre === 2) {
      dessin.line(s, acier, [x, 332], [x, 420], 5);
      dessin.circle(s, acier, [x, 332], 9, 3);
    } else {
      dessin.polygon(s, acier, [[x - 10, 330], [x + 20, 330], [x + 20, 380], [x - 10, 440]]);
      dessin.rect(s, manche, [x - 18, 322, 14, 26], 0, 4);
    }
  });
  petits_outils(s, 760, 444, fete);
  const bois = couleur(fete, [70, 50, 36], [150, 104, 62]);
  // l'étagère en bois avec des caisses de rangement
  for (const x of [1240, 1520]) dessin.rect(s, bois, [x, 260, 14, 380]);
  for (const y of [300, 420, 540]) {
    dessin.rect(s, bois, [1240, y, 294, 10]);
    [1262, 1352, 1442].forEach((x, k) => {  // les caisses tiennent dans l'étagère
      const c = couleur(fete, [56, 58, 66], FESTIF[(k + Math.floor(y / 120)) % 5]);
      dessin.rect(s, c, [x, y - 50, 70, 50], 0, 4);
      dessin.rect(s, melange(c, [255, 255, 255], 0.3), [x + 23, y - 40, 24, 8], 0, 3);
    });
  }
  // la scie circulaire verte et un tas de chutes de bois
  const vert = couleur(fete, [40, 60, 50], [70, 130, 90]);
  dessin.rect(s, vert, [1620, 560, 170, 30], 0, 4);
  dessin.rect(s, melange(vert, [0, 0, 0], 0.3), [1660, 590, 90, 50]);
  dessin.circle(s, acier, [1705, 556], 22);
  dessin.rect(s, vert, [1620, 560, 170, 8]);
  const des = hasard(4);
  for (let i = 0; i < 14; i++) {
    const x = des.uniform(1810, 1900), y = des.uniform(600, 636);
    dessin.rect(s, couleur(fete, [90, 70, 50], [210, 170, 110]), [x, y, des.uniform(16, 34), 10]);
  }
  // l'affiche de l'atelier
  dessin.rect(s, couleur(fete, [110, 108, 104], [240, 236, 226]), [1630, 300, 110, 150]);
  for (const y of range(330, 440, 18))
    dessin.line(s, couleur(fete, [60, 60, 66], [90, 90, 100]), [1645, y], [1725, y], 2);
  dessin.rect(s, couleur(fete, [100, 40, 40], [220, 60, 60]), [1645, 310, 80, 12]);
  if (fete) {
    fanions(s, [40, 130], [680, 130], true);
    fanions(s, [1220, 130], [1880, 130], true);
  } else {  // des toiles d'araignée dans les coins
    for (const [x, y] of [[700, 300], [1534, 260]])
      for (const a of range(0, 100, 22)) {
        const u = rad(a);
        dessin.line(s, [90, 92, 100], [x, y], [x + 40 * Math.cos(u), y + 40 * Math.sin(u)], 1);
      }
  }
  return t;
}

function frise_bricotine(fete) {
  const t = toile(160, HAUT_FRISE), s = t.ctx;
  remplir(t, couleur(fete, [38, 40, 48], [104, 100, 96]));
  const tuyau = couleur(fete, [70, 72, 80], [196, 198, 204]);
  dessin.rect(s, tuyau, [0, 22, 160, 18], 0, 9);                       // la gaine de ventilation
  dessin.line(s, melange(tuyau, [255, 255, 255], 0.3), [0, 26], [160, 26], 2);
  dessin.rect(s, melange(tuyau, [0, 0, 0], 0.2), [60, 20, 8, 22]);     // un collier
  dessin.rect(s, couleur(fete, [60, 40, 40], [200, 70, 60]), [0, 46, 160, 6]);  // un câble rouge
  dessin.line(s, [60, 60, 66], [40, 52], [40, 66], 2);  // le néon pendu
  dessin.line(s, [60, 60, 66], [120, 52], [120, 66], 2);
  dessin.rect(s, [80, 80, 86], [24, 64, 112, 12], 0, 4);
  dessin.rect(s, fete ? [255, 252, 230] : [110, 112, 120], [28, 67, 104, 6], 0, 3);
  return t;
}

function tuiles_bricotine() {
  const plein = toile(T, T), p = plein.ctx;
  remplir(plein, [112, 110, 108]);
  dessin.rect(p, [136, 134, 130], [0, 0, T, 4]);
  dessin.rect(p, [92, 90, 90], [0, T - 3, T, 3]);
  dessin.circle(p, [96, 94, 92], [T * 0.7, T * 0.6], 2);
  const planche = toile(T, 14), q = planche.ctx;  // une étagère en pin
  dessin.rect(q, [196, 156, 100], [0, 0, T, 14], 0, 2);
  dessin.line(q, [226, 190, 130], [2, 3], [T - 2, 3], 2);
  dessin.line(q, [150, 110, 66], [T - 1, 0], [T - 1, 14], 2);
  return [plein, planche];
}

// --------------------------------------------------------------------------
// Le foyer : au rez, des boiseries en mélèze, le bar, les vitres sur la cour
// --------------------------------------------------------------------------

/** La cour du Bled vue par une grande vitre : l'aile d'en face, ses balcons, des pins
 *  (rien ne dépasse de la vitre). */
function cour_de_nuit(s, x, y, w, h, fete) {
  s.save();
  s.beginPath();
  s.rect(x, y, w, h);
  s.clip();
  degrade_vertical(s, x, y, w, h, ...(fete ? CIEL_FETE : CIEL_NUIT));
  const facade = couleur(fete, [52, 40, 32], [120, 82, 50]);
  dessin.rect(s, facade, [x, y + 40, w, h - 40]);
  const des = hasard(x);
  for (const yy of range(y + 60, y + h - 20, 48)) {
    dessin.rect(s, fete ? [150, 150, 150] : [80, 80, 84], [x, yy + 30, w, 4]);  // la dalle du balcon
    for (const xx of range(x + 10, x + w - 20, 40)) {
      const allume = des.random() < (fete ? 0.45 : 0.15);
      dessin.rect(s, allume ? [255, 206, 120] : [24, 26, 40], [xx, yy, 26, 26]);
    }
    for (const xx of range(x, x + w, 8))
      dessin.line(s, fete ? [110, 110, 116] : [66, 66, 72], [xx, yy + 18], [xx, yy + 30], 1);
    for (const xx of range(x + 30, x + w, 90))  // les rideaux bleus
      dessin.rect(s, couleur(fete, [50, 66, 80], RIDEAU), [xx, yy - 6, 10, 36]);
  }
  for (const xx of range(x + 30, x + w, 150))  // des pins dans la cour
    dessin.polygon(s, couleur(fete, [14, 22, 20], [26, 50, 36]),
      [[xx, y + h], [xx + 40, y + h - 150], [xx + 80, y + h]]);
  s.restore();
}

/** Un canapé posé au sol (y = 680), avec ses accoudoirs et deux coussins. */
function canape(s, x, tissu, pieds, fete, largeur = 150) {
  dessin.rect(s, tissu, [x, 560, largeur, 70], 0, 14);                                    // le dossier
  dessin.rect(s, melange(tissu, [255, 255, 255], 0.1), [x, 610, largeur, 50], 0, 10);     // l'assise
  for (const xx of [x - 8, x + largeur - 14])
    dessin.rect(s, melange(tissu, [0, 0, 0], 0.2), [xx, 590, 22, 70], 0, 10);             // les accoudoirs
  [x + 30, x + largeur - 60].forEach((xx, k) =>
    dessin.rect(s, couleur(fete, [60, 50, 60], FESTIF[(Math.floor(x / 50) + k) % 5]), [xx, 580, 30, 30], 0, 8));
  for (const xx of [x + 6, x + largeur - 14]) dessin.rect(s, pieds, [xx, 660, 8, 20]);
}

function mur_foyer(fete) {
  const t = toile(MOTIF, H), s = t.ctx;
  const bois = couleur(fete, [60, 44, 32], MELEZE);
  remplir(t, bois);
  for (const x of range(0, MOTIF, 18)) dessin.line(s, melange(bois, [0, 0, 0], 0.2), [x, 0], [x, H], 1);  // les lames verticales
  // deux grandes vitres sur la cour
  for (const x0 of [90, 1060]) {
    cour_de_nuit(s, x0, 170, 520, 400, fete);
    for (const x of range(x0, x0 + 521, 130)) dessin.rect(s, [24, 24, 28], [x - 4, 166, 8, 410]);
    dessin.rect(s, [24, 24, 28], [x0 - 4, 166, 528, 8]);
    dessin.rect(s, [24, 24, 28], [x0 - 4, 568, 528, 8]);
    if (fete) guirlande_lumineuse(s, [x0, 190], [x0 + 520, 190], true, 40);
  }
  // le bar
  const sombre = melange(bois, [0, 0, 0], 0.35);
  dessin.rect(s, sombre, [660, 300, 360, 14]);  // l'étagère du bar et ses verres
  range(676, 1010, 26).forEach((x, k) => {
    const bouteille = couleur(fete, [40, 50, 50], FESTIF[k % 5]);
    dessin.rect(s, bouteille, [x, 262, 12, 38], 0, 3);
    dessin.rect(s, bouteille, [x + 3, 250, 6, 14]);
  });
  dessin.rect(s, sombre, [660, 400, 360, 14]);
  for (const x of range(676, 1010, 30))
    dessin.rect(s, couleur(fete, [90, 96, 110], [220, 230, 240]), [x, 374, 14, 26], 0, 2);
  dessin.rect(s, couleur(fete, [70, 70, 80], [180, 184, 196]), [900, 430, 80, 70], 0, 6);  // la machine à café
  dessin.rect(s, [30, 30, 34], [920, 470, 40, 16]);
  dessin.rect(s, couleur(fete, [40, 30, 24], [100, 68, 40]), [640, 520, 400, 20]);  // le comptoir
  dessin.rect(s, melange(bois, [0, 0, 0], 0.15), [650, 540, 380, 140]);
  for (const x of range(660, 1030, 40)) dessin.line(s, melange(bois, [0, 0, 0], 0.3), [x, 540], [x, 680], 2);
  if (fete) for (const x of [700, 820, 960]) citrouille(s, x, 520, 16, true);
  // la bibliothèque, pleine de livres
  const etagere = melange(bois, [0, 0, 0], 0.3);
  dessin.rect(s, etagere, [1610, 200, 170, 480]);
  const des = hasard(8);
  for (const y of range(214, 660, 92)) {
    dessin.rect(s, melange(etagere, [0, 0, 0], 0.3), [1622, y, 146, 78]);
    let x = 1624;
    while (x < 1760) {
      const w = des.uniform(8, 16), h = des.uniform(48, 74);
      const c = fete ? FESTIF[des.randrange(5)] : melange(FESTIF[des.randrange(5)], [30, 26, 34], 0.75);
      if (x + w > 1766) break;
      dessin.rect(s, c, [x, y + 78 - h, w, h], 0, 1);
      x += w + 2;
    }
    dessin.rect(s, etagere, [1610, y + 78, 170, 8]);
  }
  // des canapés, devant les vitres et à côté de la bibliothèque
  for (const [x, tissu] of [[300, [70, 110, 170]], [1250, [170, 80, 90]], [1800, [80, 140, 110]]])
    canape(s, x, couleur(fete, melange(tissu, [20, 20, 30], 0.65), tissu), melange(bois, [0, 0, 0], 0.4), fete);
  if (fete) citrouille(s, 1700, 200, 14, true);
  if (!fete) fanions(s, [660, 140], [1020, 140], false, 24, 6);
  else fanions(s, [640, 130], [1040, 130], true, 24, 8);
  return t;
}

function frise_foyer(fete) {
  const t = toile(160, HAUT_FRISE), s = t.ctx;
  const bois = couleur(fete, [44, 32, 24], [140, 96, 54]);
  remplir(t, melange(bois, [0, 0, 0], 0.3));
  for (const x of range(0, 160, 20)) dessin.rect(s, bois, [x + 2, 0, 14, 60]);  // le plafond à lattes
  dessin.rect(s, melange(bois, [0, 0, 0], 0.15), [0, 58, 160, 12]);
  dessin.line(s, [30, 26, 24], [80, 70], [80, 80], 2);  // le fil d'une suspension
  return t;
}

function tuiles_foyer() {
  const plein = toile(T, T), p = plein.ctx;
  remplir(plein, [150, 142, 130]);  // le béton ciré
  dessin.rect(p, [176, 168, 156], [0, 0, T, 4]);
  dessin.line(p, [128, 120, 110], [0, T - 1], [T, T - 1], 2);
  const planche = toile(T, 14), q = planche.ctx;  // une planche de mélèze
  dessin.rect(q, [186, 128, 70], [0, 0, T, 14], 0, 2);
  dessin.line(q, [214, 160, 96], [2, 3], [T - 2, 3], 2);
  dessin.line(q, [130, 86, 46], [T - 1, 0], [T - 1, 14], 2);
  return [plein, planche];
}

// --------------------------------------------------------------------------
// La Tanière : la salle polyvalente (murs noirs, rideaux, grand écran, gradins)
// --------------------------------------------------------------------------

function mur_taniere(fete) {
  const t = toile(MOTIF, H), s = t.ctx;
  const noir = couleur(fete, [18, 18, 22], [40, 32, 52]);
  remplir(t, noir);
  // les rideaux noirs, à plis
  for (const x of range(0, 760, 24)) {
    dessin.rect(s, melange(noir, [255, 255, 255], 0.06), [x, 100, 12, 580]);
    dessin.line(s, melange(noir, [0, 0, 0], 0.4), [x + 23, 100], [x + 23, 680], 2);
  }
  dessin.rect(s, melange(noir, [255, 255, 255], 0.12), [0, 96, 760, 6]);  // le rail
  // les faisceaux des projecteurs (en fête)
  if (fete)
    [[300, 0], [980, 0]].forEach(([x, y], k) => {
      const c = melange(noir, FESTIF[k + 1], 0.22);
      dessin.polygon(s, c, [[x - 10, y], [x + 10, y], [x + 200, 680], [x - 160, 680]]);
    });
  // le grand écran
  dessin.rect(s, [12, 12, 14], [856, 150, 12, 30]);
  dessin.rect(s, [12, 12, 14], [1352, 150, 12, 30]);
  const ecran = couleur(fete, [70, 72, 80], [240, 236, 226]);
  dessin.rect(s, ecran, [820, 176, 580, 330]);
  if (fete) {  // le film : une fête de citrouilles sous la lune
    dessin.rect(s, [60, 30, 90], [840, 196, 540, 290]);
    dessin.circle(s, [255, 220, 120], [1300, 250], 34);
    range(900, 1340, 90).forEach((x, k) => citrouille(s, x, 470, 20 + 6 * (k % 2), true));
    fanions(s, [850, 220], [1250, 220], true, 30, 8);
  } else {  // un vieux film en noir et blanc : des immeubles inquiétants
    dessin.rect(s, [40, 40, 44], [840, 196, 540, 290]);
    range(860, 1380, 60).forEach((x, k) => {
      const h = 120 + (k * 53) % 140;
      dessin.rect(s, [66, 66, 72], [x, 486 - h, 46, h]);
      for (const yy of range(486 - h + 10, 480, 22)) dessin.rect(s, [110, 110, 116], [x + 8, yy, 8, 10]);
    });
    dessin.polygon(s, [80, 80, 86], [[1110, 196], [1130, 196], [1240, 486], [980, 486]]);
  }
  // la porte de la loge, entrouverte sur un coin éclairé
  dessin.rect(s, [12, 12, 14], [1560, 440, 150, 240]);
  dessin.rect(s, couleur(fete, [90, 70, 46], [220, 170, 100]), [1590, 456, 70, 224]);
  dessin.rect(s, [24, 24, 28], [1660, 446, 46, 234]);
  // le panneau « sortie »
  dessin.rect(s, couleur(fete, [20, 90, 50], [40, 200, 110]), [1605, 404, 60, 30], 0, 3);
  dessin.rect(s, [240, 255, 240], [1632, 408, 6, 10]);                      // la flèche, vers le bas
  dessin.polygon(s, [240, 255, 240], [[1625, 417], [1645, 417], [1635, 429]]);
  return t;
}

function frise_taniere(fete) {
  const t = toile(160, HAUT_FRISE), s = t.ctx;
  remplir(t, [16, 16, 20]);
  for (const y of [14, 44]) dessin.rect(s, [40, 40, 46], [0, y, 160, 5]);  // les grilles des projecteurs
  for (const x of [0, 80]) dessin.rect(s, [40, 40, 46], [x + 36, 0, 5, 60]);
  [20, 100].forEach((x, k) => {  // deux projecteurs
    dessin.rect(s, [30, 30, 34], [x - 10, 50, 24, 20], 0, 4);
    dessin.line(s, [40, 40, 46], [x + 2, 48], [x + 2, 44], 3);
    const lentille = fete ? FESTIF[(k * 2 + 1) % 5] : [50, 50, 56];
    dessin.circle(s, lentille, [x + 2, 70], 7);
  });
  if (fete) {  // une boule à facettes
    dessin.line(s, [60, 60, 66], [140, 0], [140, 52], 1);
    dessin.circle(s, [210, 210, 220], [140, 62], 10);
    for (const a of range(0, 360, 60)) {
      const u = rad(a);
      dessin.circle(s, [255, 255, 255], [140 + 6 * Math.cos(u), 62 + 6 * Math.sin(u)], 1);
    }
  }
  return t;
}

function tuiles_taniere() {
  const plein = toile(T, T), p = plein.ctx;
  remplir(plein, [34, 34, 40]);  // une estrade noire
  dessin.rect(p, [76, 74, 84], [0, 0, T, 4]);
  dessin.line(p, [24, 24, 28], [0, T / 2], [T, T / 2], 1);
  const planche = toile(T, 14), q = planche.ctx;  // un praticable de scène
  dessin.rect(q, [46, 46, 54], [0, 0, T, 14], 0, 2);
  dessin.line(q, [110, 108, 120], [1, 2], [T - 1, 2], 2);
  dessin.line(q, [20, 20, 24], [T - 1, 0], [T - 1, 14], 2);
  return [plein, planche];
}

// --------------------------------------------------------------------------
// La terrasse du 5e : dehors, la pergola, le potager, le lac et les Alpes
// --------------------------------------------------------------------------

const ALPES = [[0, 470], [90, 430], [170, 452], [260, 392], [330, 430], [420, 372], [500, 418], [600, 384],
  [700, 440], [790, 400], [880, 446], [980, 380], [1060, 424], [1160, 396], [1250, 448],
  [1340, 408], [1440, 440], [1520, 388], [1620, 430], [1720, 404], [1820, 446], [1920, 470]];

/** Une chaîne de montagnes : un versant éclairé, un versant à l'ombre, et de la
 *  neige accrochée aux sommets, qui descend en dents dans les creux. */
export function montagnes(s, sommets, bas, fete, decalage = 0) {
  const clair = couleur(fete, [52, 54, 84], [110, 84, 140]);
  const ombre = melange(clair, [0, 0, 0], 0.35);
  dessin.polygon(s, ombre, [...sommets.map(([x, y]) => [x + decalage, y]),
    [sommets[sommets.length - 1][0] + decalage, bas], [sommets[0][0] + decalage, bas]]);
  const neige = couleur(fete, [176, 182, 206], [246, 232, 246]);
  const neige_ombre = melange(neige, [60, 60, 100], 0.35);
  for (let i = 0; i + 2 < sommets.length; i++) {
    let [xa, ya] = sommets[i], [xb, yb] = sommets[i + 1], [xc, yc] = sommets[i + 2];
    if (!(yb < ya && yb < yc)) continue;
    xa += decalage; xb += decalage; xc += decalage;
    // le versant de gauche, au soleil (ou à la lune)
    dessin.polygon(s, clair, [[xb, yb], [xa, ya], [xa + (xb - xa) * 0.15, bas], [xb, bas]]);
    const h = Math.min(ya, yc) - yb;
    const u = Math.min(0.55, 34 / Math.max(h, 1));  // la neige couvre le haut du sommet
    const g = [xb + (xa - xb) * u, yb + (ya - yb) * u];
    const d = [xb + (xc - xb) * u, yb + (yc - yb) * u];
    const bas_neige = yb + h * u;
    const dents = [g];
    for (let k = 1; k < 6; k++) {  // le bord de la neige, en dents
      const x = g[0] + (d[0] - g[0]) * k / 6;
      dents.push([x, bas_neige + (k % 2 ? 6 : -2)]);
    }
    dents.push(d);
    dessin.polygon(s, neige_ombre, [[xb, yb], ...dents]);
    dessin.polygon(s, neige, [[xb, yb], ...dents.slice(0, 4), [xb, dents[3][1]]]);
  }
}

const TOUR = [1420, 198, 470, 482, 118];    // la tour au fond de la terrasse : x, y, largeur, hauteur, étage

/** Les rideaux bleus de la tour (x, haut, hauteur) : ils bougent au vent (voir animer). */
function rideaux_tour() {
  const [x, y, w, h, etage] = TOUR;
  const r = [];
  for (const yy of range(y + etage, y + h + 1, etage))
    for (const xx of range(x + 100, x + w - 10, 150)) r.push([xx, yy - etage + 6, etage - 16]);
  return r;
}
const RIDEAUX_TOUR = rideaux_tour();

/** Ce qui bouge dans le décor (dessiné par-dessus le mur du fond placé en x0). */
export function animer(nom, e, x0, t, f) {
  if (nom === "terrasse") {
    const bleu = melange([48, 62, 78], RIDEAU, f);
    const trait = melange(bleu, [0, 0, 0], 0.25);
    for (const [x, y, h] of RIDEAUX_TOUR) {
      const onde = 7 * Math.sin(t * 1.4 + x * 0.013 + y * 0.021);
      dessin.polygon(e, bleu, [[x0 + x, y], [x0 + x + 22, y], [x0 + x + 22 + onde, y + h],
        [x0 + x + onde * 0.7, y + h]]);
      dessin.line(e, trait, [x0 + x + 11, y], [x0 + x + 11 + onde * 0.8, y + h], 1);
    }
  }
}

/** Un morceau de la façade côté cour, vu de près : mélèze, grandes portes vitrées,
 *  balcons filants, rideaux bleus. */
function facade_du_bled(s, x, y, w, h, fete, etage = 118) {
  const bois = couleur(fete, [56, 42, 30], MELEZE);
  dessin.rect(s, bois, [x, y, w, h]);
  for (const xx of range(x, x + w, 10)) dessin.line(s, melange(bois, [0, 0, 0], 0.2), [xx, y], [xx, y + h], 1);
  const des = hasard(x + y);
  for (const yy of range(y + etage, y + h + 1, etage)) {
    for (const xx of range(x + 24, x + w - 60, 150)) {
      const allume = des.random() < (fete ? 0.75 : 0.2);
      dessin.rect(s, allume ? [255, 206, 120] : [24, 26, 40], [xx, yy - etage + 14, 70, etage - 26]);
      dessin.line(s, [40, 40, 50], [xx + 35, yy - etage + 14], [xx + 35, yy - 12], 2);
    }
    dessin.rect(s, couleur(fete, [110, 112, 118], [226, 228, 230]), [x - 16, yy - 10, w + 32, 10]);
    if (yy < 600) {  // en bas, c'est la balustrade de la terrasse qui est devant
      const blanc = couleur(fete, [86, 88, 94], [236, 238, 240]);
      for (const xx of range(x - 16, x + w + 16, 10)) dessin.line(s, blanc, [xx, yy - 46], [xx, yy - 10], 2);
      dessin.line(s, blanc, [x - 16, yy - 46], [x + w + 16, yy - 46], 3);
    }
    if (fete)
      guirlande_lumineuse(s, [x - 10, yy - etage + 8], [x + w + 10, yy - etage + 8], true, 12, 8);
  }
}

/** Une plante du potager posée en y : tomate tuteurée, salade, tournesol, haricots
 *  grimpants. Fanée et brune quand c'est lugubre, verte et en fruits en fête. */
function plante(s, x, y, genre, fete) {
  const vert = couleur(fete, [92, 76, 46], [76, 160, 70]), fonce = couleur(fete, [66, 52, 34], [46, 116, 50]);
  if (genre === 0) {  // la tomate, sur son tuteur
    dessin.line(s, couleur(fete, [90, 70, 46], [170, 130, 80]), [x, y], [x, y - 76], 3);
    for (let k = 0; k < 4; k++) {
      const yy = y - 16 - k * 16;
      const pend = fete ? 0 : 6;  // les feuilles fanées pendent
      dessin.ellipse(s, k % 2 ? vert : fonce, [x - 16, yy - 6 + pend, 14, 9]);
      dessin.ellipse(s, k % 2 === 0 ? vert : fonce, [x + 2, yy - 4 + pend, 14, 9]);
    }
    if (fete)
      for (const [dx, dy] of [[-8, -30], [7, -48], [-6, -62]]) {
        dessin.circle(s, [224, 50, 40], [x + dx, y + dy], 5);
        dessin.circle(s, [255, 140, 120], [x + dx - 1.5, y + dy - 1.5], 1.5);
      }
  } else if (genre === 1) {  // la salade, en rosette
    [[-14, 18], [-4, 20], [6, 18], [-9, 16], [1, 16]].forEach(([dx, w], k) =>
      dessin.ellipse(s, k > 2 ? couleur(fete, [110, 92, 52], [130, 200, 90]) : vert,
        [x + dx - 6, y - 18 - (k > 2 ? 6 : 0), w, 18]));
  } else if (genre === 2) {  // le tournesol
    if (fete) {
      dessin.line(s, fonce, [x, y], [x, y - 92], 3);
      dessin.ellipse(s, vert, [x - 18, y - 50, 16, 9]);
      dessin.ellipse(s, vert, [x + 2, y - 66, 16, 9]);
      for (const a of range(0, 360, 30)) {
        const u = rad(a);
        dessin.circle(s, [255, 206, 40], [x + 12 * Math.cos(u), y - 96 + 12 * Math.sin(u)], 6);
      }
      dessin.circle(s, [110, 70, 30], [x, y - 96], 8);
    } else {  // tout penché, la tête basse
      dessin.line(s, fonce, [x, y], [x + 4, y - 70], 3);
      dessin.line(s, fonce, [x + 4, y - 70], [x + 18, y - 56], 3);
      dessin.circle(s, [70, 54, 34], [x + 20, y - 52], 8);
    }
  } else {  // les haricots, sur deux perches en tipi
    const perche = couleur(fete, [90, 70, 46], [170, 130, 80]);
    dessin.line(s, perche, [x - 12, y], [x + 2, y - 84], 2);
    dessin.line(s, perche, [x + 12, y], [x - 2, y - 84], 2);
    for (let k = 0; k < 6; k++) {
      const yy = y - 12 - k * 12;
      dessin.ellipse(s, k % 2 ? vert : fonce, [x - 12 + (k % 2) * 8, yy - 4, 12, 8]);
      if (fete && k % 2) dessin.line(s, [110, 190, 80], [x - 4 + k, yy], [x - 4 + k, yy + 14], 2);
    }
  }
}

function mur_terrasse(fete) {
  const t = toile(MOTIF, H), s = t.ctx;
  const [haut, bas] = fete ? CIEL_FETE : CIEL_NUIT;
  degrade_vertical(s, 0, 0, MOTIF, H, haut, bas);
  const des = hasard(11);
  for (let i = 0; i < 90; i++)
    dessin.circle(s, fete ? [230, 230, 250] : [150, 150, 180], [des.uniform(0, MOTIF), des.uniform(80, 360)],
      des.choice([1, 1, 2]));
  dessin.circle(s, !fete ? [210, 210, 196] : [255, 226, 150], [700, 190], 30);  // la lune
  dessin.circle(s, haut, [714, 180], 26);
  // les Alpes, le lac et les lumières de la ville
  montagnes(s, ALPES, 520, fete);
  const lac = couleur(fete, [14, 18, 40], [50, 40, 100]);
  dessin.rect(s, lac, [0, 470, MOTIF, 50]);
  for (let i = 0; i < 40; i++) {
    const x = des.uniform(0, MOTIF);
    const y = des.uniform(478, 512);
    dessin.line(s, melange(lac, [255, 255, 255], 0.25), [x, y], [x + 20, y], 1);
  }
  dessin.rect(s, couleur(fete, [16, 16, 22], [40, 30, 50]), [0, 520, MOTIF, 160]);
  for (let i = 0; i < (fete ? 160 : 70); i++)
    dessin.circle(s, [255, 200, 110], [des.uniform(0, MOTIF), des.uniform(526, 590)], 1);
  // un morceau de l'aile haute du Bled, avec ses balcons filants
  const [x, y, w, h, etage] = TOUR;
  facade_du_bled(s, x, y, w, h, fete, etage);
  dessin.rect(s, couleur(fete, [110, 112, 118], [226, 228, 230]), [x - 20, y - 12, w + 40, 14]);  // le toit
  // la balustrade blanche, au bord de la terrasse
  const blanc = couleur(fete, [90, 92, 100], [236, 238, 240]);
  dessin.rect(s, blanc, [0, 590, MOTIF, 5]);
  for (const xx of range(0, MOTIF, 12)) dessin.line(s, blanc, [xx, 594], [xx, 680], 2);
  // les bacs du potager
  const caisse = couleur(fete, [74, 64, 52], [170, 150, 120]);
  for (const xx of [220, 860, 1180]) {
    dessin.rect(s, caisse, [xx, 600, 200, 80]);
    for (const yy of [620, 650]) dessin.line(s, melange(caisse, [0, 0, 0], 0.25), [xx, yy], [xx + 200, yy], 2);
    for (let k = 0; k < 5; k++) plante(s, xx + 22 + k * 39, 600, k % 4, fete);
  }
  return t;
}

/** Le ciel, tout en haut : des étoiles (et une guirlande quand c'est la fête). */
function frise_terrasse(fete) {
  const t = toile(160, HAUT_FRISE), s = t.ctx;
  remplir(t, (fete ? CIEL_FETE : CIEL_NUIT)[0]);
  for (const [x, y] of [[20, 14], [70, 40], [118, 22], [146, 58], [44, 66]])
    dessin.circle(s, [220, 220, 250], [x, y], 1);
  if (fete) guirlande_lumineuse(s, [0, 50], [160, 50], true, 10, 6);
  return t;
}

function tuiles_terrasse() {
  const plein = toile(T, T), p = plein.ctx;
  remplir(plein, [130, 112, 92]);  // le platelage en bois
  for (const y of [0, 13, 26]) dessin.line(p, [100, 84, 68], [0, y], [T, y], 2);
  dessin.rect(p, [156, 136, 112], [0, 0, T, 3]);
  const planche = toile(T, 14), q = planche.ctx;  // le bord d'un bac en bois
  dessin.rect(q, [166, 146, 116], [0, 0, T, 14], 0, 2);
  dessin.line(q, [196, 176, 146], [2, 3], [T - 2, 3], 2);
  dessin.line(q, [120, 104, 80], [T - 1, 0], [T - 1, 14], 2);
  return [plein, planche];
}

// --------------------------------------------------------------------------
// Les meubles sur lesquels on peut monter (lettre = du plan) : l'établi de la Bricotine,
// une table, la pergola de la terrasse. Dessinés à l'écran, entre x0 et x1, dessus en y.
// --------------------------------------------------------------------------

/** sols : le sol sous le pied de gauche et sous celui de droite. */
export function dessiner_meuble(nom, e, x0, x1, y, sols, fete) {
  const sol = Math.max(...sols);
  if (nom === "bricotine") {  // l'établi : un plateau épais, des pieds, une étagère dessous, un étau
    const bois = [150, 104, 62];
    dessin.rect(e, bois, [x0, y, x1 - x0, 16]);
    dessin.line(e, [186, 138, 88], [x0, y + 2], [x1, y + 2], 2);
    [x0 + 6, x1 - 18].forEach((x, i) => dessin.rect(e, [110, 74, 44], [x, y + 16, 12, sols[i] - y - 16]));
    dessin.rect(e, [110, 74, 44], [x0 + 6, sol - 30, x1 - x0 - 12, 8]);
    range(Math.trunc(x0) + 26, Math.trunc(x1) - 40, 34).forEach((x, k) =>  // des caisses à outils
      dessin.rect(e, [[200, 60, 50], [60, 120, 200]][k % 2], [x, sol - 52, 28, 22], 0, 3));
    dessin.rect(e, [90, 92, 100], [x1 - 34, y - 12, 26, 12], 0, 2);  // l'étau
    dessin.line(e, [150, 150, 160], [x1 - 40, y - 6], [x1 - 2, y - 6], 2);
  } else if (nom === "terrasse") {  // la pergola : une poutre, des chevrons, des poteaux, des fanions
    const bois = fete ? [190, 144, 88] : [120, 92, 60];
    [x0 + 4, x1 - 16].forEach((x, i) =>
      dessin.rect(e, melange(bois, [0, 0, 0], 0.15), [x, y + 14, 12, sols[i] - y - 14]));
    for (const x of range(Math.trunc(x0), Math.trunc(x1), 20))
      dessin.rect(e, melange(bois, [0, 0, 0], 0.25), [x + 6, y - 10, 8, 12]);
    dessin.rect(e, bois, [x0 - 10, y, x1 - x0 + 20, 14]);
    dessin.line(e, melange(bois, [255, 255, 255], 0.25), [x0 - 10, y + 2], [x1 + 10, y + 2], 2);
    fanions(e, [x0 + 12, y + 16], [x1 - 12, y + 16], fete, 14, Math.max(3, Math.floor((x1 - x0) / 34)));
  } else {  // une table
    const dessus = nom === "taniere" ? [60, 56, 70] : [150, 104, 62];
    dessin.rect(e, dessus, [x0, y, x1 - x0, 12], 0, 3);
    dessin.line(e, melange(dessus, [255, 255, 255], 0.25), [x0 + 3, y + 2], [x1 - 3, y + 2], 2);
    [x0 + 8, x1 - 16].forEach((x, i) =>
      dessin.rect(e, melange(dessus, [0, 0, 0], 0.3), [x, y + 12, 8, sols[i] - y - 12]));
  }
}

const MURS = { bricotine: mur_bricotine, foyer: mur_foyer, taniere: mur_taniere, terrasse: mur_terrasse };
const FRISES = { bricotine: frise_bricotine, foyer: frise_foyer, taniere: frise_taniere, terrasse: frise_terrasse };
const TUILES = { bricotine: tuiles_bricotine, foyer: tuiles_foyer, taniere: tuiles_taniere, terrasse: tuiles_terrasse };
const _cache = {};

/** [[murs lugubre et en fête], [frises lugubre et en fête], [tuiles plein et planche]],
 *  fabriqués une seule fois par décor. */
export function decor(nom) {
  if (!(nom in _cache))
    _cache[nom] = [[MURS[nom](false), MURS[nom](true)], [FRISES[nom](false), FRISES[nom](true)], TUILES[nom]()];
  return _cache[nom];
}
