/* Dessins animés fabriqués en SVG par le programme : chaque image est un SVG
différent (les os, les ailes, la fumée… dans une autre position), comme les pages
d'un folioscope. (Port de animations.py.)

Chaque fonction prend phase, de 0 à 1 (un cycle complet), et rend le texte du SVG.
ANIMES, en bas, dit combien d'images faire par cycle et à quelle vitesse les jouer.
N'importe rien de outils.js (qui importe ANIMES d'ici). */

export const TAU = 2 * Math.PI;
export const OS_LONG = 9.5;         // longueur d'un os de bras ou de jambe

const sin = Math.sin, cos = Math.cos, abs = Math.abs, max = Math.max, min = Math.min;
const PI = Math.PI;
const radians = a => a * (PI / 180);    // comme math.radians
const degrees = a => a * (180 / PI);    // comme math.degrees

/** Comme le f"{x:.{d}f}" de Python : arrondi au plus proche, à égalité au chiffre pair
 *  (sur la vraie valeur binaire), et « -0.0 » garde son signe. */
export function f(x, d = 1) {
  const neg = x < 0 || Object.is(x, -0);
  const a = abs(x);
  let s = a.toFixed(d);
  const long = a.toFixed(d + 25);
  const reste = long.slice(long.length - 25);
  if (/^50*$/.test(reste)) {          // pile au milieu : toFixed a arrondi vers le haut
    const bas = long.slice(0, long.length - 25);
    if (Number(bas[bas.length - 1]) % 2 === 0) s = bas;
  }
  return (neg ? "-" : "") + s;
}

function _svg(boite, contenu) {
  const [x, y, w, h] = boite;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" ` +
    `width="${w}" height="${h}">${contenu}</svg>`;
}

function _points(pts) {
  return pts.map(([x, y]) => `${f(x)},${f(y)}`).join(" ");
}

/** Bout d'un os. angle en degrés : 0 = vers le bas, 90 = vers l'avant (droite). */
function _bout(depart, angle, longueur = OS_LONG) {
  const a = radians(angle);
  return [depart[0] + longueur * sin(a), depart[1] + longueur * cos(a)];
}

/** Un bras ou une jambe en deux os : rend le trait SVG et le bout. */
function _membre(depart, angle1, angle2) {
  const coude = _bout(depart, angle1);
  const main = _bout(coude, angle2);
  return [`<polyline points="${_points([depart, coude, main])}"/>`, main];
}

// La danse du squelette en fête : 8 figures enchaînées en boucle. Chaque figure :
// (dx, dy, bras avant, bras arrière, jambe avant, jambe arrière, tête penchée, bouche)
// ; un membre = (angle de l'os du haut, angle de l'os du bas), 0 = vers le bas,
// 90 = vers l'avant, 180 = vers le haut ; bouche 0 = sourire, 1 = grande ouverte (il chante).
export const DANSE = [
  [0, 0, [125, 140], [-40, 35], [8, 0], [-8, 0], 6, 1.0],           // disco : doigt au ciel…
  [1, 1, [-30, -40], [-40, 35], [10, 0], [-10, 0], -4, 0.0],        // … puis vers le sol
  [0, 0, [125, 140], [-40, 35], [8, 0], [-8, 0], 6, 1.0],           // et encore au ciel
  [0, 4, [95, 110], [-95, -110], [40, -15], [-40, 15], 0, 0.8],     // accroupi, jazz hands
  [0, -9, [140, 160], [-140, -160], [40, -30], [-30, 35], 0, 1.0],  // grand saut, bras en l'air
  [-1, -1, [115, 140], [-115, -140], [85, 85], [-5, 0], -8, 0.4],   // coup de pied en avant
  [1, -1, [100, 130], [-140, -160], [5, 0], [-75, -85], 8, 0.4],    // coup de pied en arrière
  [-2, 1, [130, 100], [-130, -100], [15, 5], [-15, -5], -6, 0.0],   // il se déhanche
];

/** La pose de la danse à l'instant phase : on glisse d'une figure à la suivante,
 *  en marquant un petit arrêt sur chacune. */
function _pose_danse(phase) {
  const pos = phase * DANSE.length;
  const i = Math.trunc(pos) % DANSE.length;
  let u = min(1.0, (pos - Math.trunc(pos)) * 1.6);
  u = u * u * (3 - 2 * u);
  const a = DANSE[i], b = DANSE[(i + 1) % DANSE.length];
  const m = (x, y) => Array.isArray(x) ? x.map((p, k) => m(p, y[k])) : x + (y - x) * u;
  return a.map((x, k) => m(x, b[k]));
}

/** Le squelette à l'instant phase (0 à 1 = un cycle) : il marche en tendant les
 *  bras pour faire peur, ou (fete) il danse avec son chapeau pointu. */
export function squelette(phase, fete) {
  const p = phase * TAU;
  const s = sin(p);
  let dx, dy, bras, jambes, tete, machoire, os_, crane;
  if (fete) {
    let bras_av, bras_ar, jambe_av, jambe_ar, bouche;
    [dx, dy, bras_av, bras_ar, jambe_av, jambe_ar, tete, bouche] = _pose_danse(phase);
    bras = [bras_av, bras_ar]; jambes = [jambe_av, jambe_ar];
    machoire = 1.5 * bouche;
    os_ = "#f4f0e2"; crane = "#fbf8ee";
  } else {
    dx = 0.0; dy = -1.5 * abs(cos(p));           // il se dandine à chaque pas
    bras = [[70 + 12 * s, 95 + 10 * s], [35 - 20 * s, 60 - 15 * s]];
    jambes = [[28 * s, 28 * s - 25 * max(0.0, cos(p))],
              [-28 * s, -28 * s - 25 * max(0.0, -cos(p))]];
    tete = 3 * s; machoire = 1.5 * abs(sin(2 * p));  // la mâchoire claque
    os_ = "#cfc9b4"; crane = "#e4dfcc";
  }
  const cx = 24 + dx, epaule = 28 + dy, hanche = 44 + dy;
  const traits = [`<path d="M${f(cx)} ${f(epaule - 4)} L${f(cx)} ${f(hanche)}"/>`];
  for (const [y, demi] of [[epaule + 1, 9], [epaule + 6, 9], [epaule + 11, 7]]) {
    traits.push(`<path d="M${f(cx - demi)} ${f(y)} Q${f(cx)} ${f(y - 3)} ${f(cx + demi)} ${f(y)}"/>`);
  }
  traits.push(`<path d="M${f(cx - 7)} ${f(hanche)} L${f(cx + 7)} ${f(hanche)}"/>`);
  bras.forEach(([a1, a2], k) => {
    const [trait] = _membre([cx + (k === 0 ? 5 : -5), epaule], a1, a2);
    traits.push(trait);
  });
  const pieds = [];
  jambes.forEach(([a1, a2], k) => {
    const [trait, [px, py]] = _membre([cx + (k === 0 ? 4 : -4), hanche], a1, a2);
    traits.push(trait);
    pieds.push(`<path d="M${f(px)} ${f(py)} L${f(px + 4)} ${f(py)}"/>`);
  });
  const corps = `<g stroke="${os_}" stroke-width="3.5" stroke-linecap="round" ` +
    `stroke-linejoin="round" fill="none">${traits.concat(pieds).join("")}</g>`;
  // la tête : on la dessine autour de (0, 0) puis on la penche
  const hx = cx + tete * 0.3, hy = epaule - 15;
  let visage;
  if (fete) {
    visage = '<circle cx="-4" cy="-1" r="2.6" fill="#2a2a40"/><circle cx="4" cy="-1" r="2.6" fill="#2a2a40"/>' +
      '<circle cx="-3" cy="-2" r="0.9" fill="#fff"/><circle cx="5" cy="-2" r="0.9" fill="#fff"/>' +
      (machoire > 0.6 ?    // il chante
        `<ellipse cx="0" cy="${f(5.5 + machoire * 0.5)}" rx="3" ry="${f(1 + machoire * 1.3)}" ` +
        'fill="#2a2a40"/>' :
        `<path d="M-5 ${f(4 + machoire)} Q0 ${f(8 + machoire)} 5 ${f(4 + machoire)}" ` +
        'stroke="#2a2a40" stroke-width="1.5" fill="none" stroke-linecap="round"/>') +
      '<path d="M-9 -7 L6 -9 L-4 -16 Z" fill="#ff5aa0"/><circle cx="-4" cy="-15.5" r="2.4" fill="#ffd040"/>' +
      '<circle cx="-4" cy="-10" r="1" fill="#ffd040"/><circle cx="1" cy="-9.5" r="1" fill="#ffd040"/>' +
      '<path d="M0 12 L-7 8 L-7 16 Z M0 12 L7 8 L7 16 Z" fill="#9b4dff"/>';
  } else {
    visage = '<path d="M-9 -3 L-1 0 L-8 4 Z M9 -3 L1 0 L8 4 Z" fill="#1a1010"/>' +
      '<circle cx="-5" cy="1" r="1.3" fill="#ff3030"/><circle cx="5" cy="1" r="1.3" fill="#ff3030"/>' +
      `<path d="M-5 ${f(8.5 + machoire)} L5 ${f(8.5 + machoire)} M-3 6 L-3 ${f(11 + machoire)} ` +
      `M0 6 L0 ${f(11 + machoire)} M3 6 L3 ${f(11 + machoire)}" stroke="#1a1010" stroke-width="1.2"/>`;
  }
  const tete_svg = `<g transform="translate(${f(hx)} ${f(hy)}) rotate(${f(tete)})">` +
    `<rect x="-7" y="${f(5 + machoire)}" width="14" height="7" rx="2" fill="${crane}"/>` +
    `<ellipse cx="0" cy="0" rx="11" ry="${fete ? 9 : 10}" fill="${crane}"/>${visage}</g>`;
  return _svg([0, -8, 48, 72], corps + tete_svg);
}

/** Le vampire, tourné vers la droite : au repos (il respire et cligne des yeux),
 *  en marche (jambes, cape qui flotte derrière) ou en l'air (jambes repliées).
 *  doublure : la couleur du dedans de la cape et du col ; noeud : un nœud sur la tête. */
export function vampire(phase, etat = "repos", doublure = "#a3122a", noeud = null) {
  const p = phase * TAU;
  const s = sin(p), c = cos(p);
  let dy, flot, pieds;
  if (etat === "marche") {
    dy = -1.5 * abs(c); flot = 4 + 2 * sin(2 * p);
    pieds = [[6 * s, 3 * max(0.0, c)], [-6 * s, 3 * max(0.0, -c)]];
  } else if (etat === "saut") {
    dy = -1.0; flot = 7.0;
    pieds = [[4, 6], [-3, 4]];
  } else {
    dy = 0.6 * s; flot = 1 + 0.8 * s;
    pieds = [[0, 0], [0, 0]];
  }
  const vague = etat !== "repos" ? 2 * sin(2 * p) : 0.5 * s;
  const cligne = etat === "repos" && 0.88 < phase && phase < 0.96;
  // la cape : le côté arrière (gauche) flotte, le bas ondule
  const cape = `<path d="M8 ${f(26 + dy)} L${f(2 - flot)} ${f(58 - flot * 0.6)} ` +
    `Q${f(12)} ${f(58 + vague)} 24 ${f(54 + dy)} Q35 ${f(57 - vague)} 46 60 L40 ${f(26 + dy)} Z" fill="#2a0f2e"/>` +
    `<path d="M10 ${f(28 + dy)} L${f(6 - flot * 0.8)} ${f(55 - flot * 0.5)} ` +
    `Q14 ${f(54 + vague)} 24 ${f(51 + dy)} Q34 ${f(54 - vague)} 42 56 L38 ${f(28 + dy)} Z" fill="${doublure}"/>`;
  let jambes = [19, 29].map((x0, k) => {
    const [jx, lever] = pieds[k];
    return `<polyline points="${_points([[x0, 50 + dy], [x0 + jx, 61 - lever]])}"/>`;
  }).join("");
  jambes = `<g stroke="#1d1d2b" stroke-width="6" stroke-linecap="round" fill="none">${jambes}</g>`;
  let yeux;
  if (cligne) {
    yeux = '<path d="M20.5 18.5 L25.5 18.5 M27.5 18.5 L32.5 18.5" stroke="#141420" ' +
      'stroke-width="1.4" stroke-linecap="round"/>';
  } else {
    yeux = '<circle cx="23" cy="18" r="2.6" fill="#fff"/><circle cx="30" cy="18" r="2.6" fill="#fff"/>' +
      '<circle cx="24" cy="18.5" r="1.3" fill="#c0102a"/><circle cx="31" cy="18.5" r="1.3" fill="#c0102a"/>';
  }
  const haut = `<g transform="translate(0 ${f(dy)})">` +
    '<rect x="14" y="28" width="20" height="24" rx="5" fill="#1d1d2b"/>' +
    '<path d="M20 28 L24 38 L28 28 Z" fill="#f2f2f2"/>' +
    `<path d="M10 30 L14 16 L20 26 Z" fill="${doublure}"/><path d="M38 30 L34 16 L28 26 Z" fill="${doublure}"/>` +
    '<ellipse cx="24" cy="18" rx="10" ry="11" fill="#cfe3d6"/>' +
    '<path d="M13 16 Q14 5 24 6 Q34 5 35 16 Q30 10 24 14 Q18 10 13 16 Z" fill="#141420"/>' +
    `${yeux}` +
    '<path d="M23 24 Q27 27 31 24" stroke="#5a1020" stroke-width="1.2" fill="none"/>' +
    '<path d="M24.5 24.6 L25.5 27 L26.3 25.2 Z M28.3 25.2 L29 27 L29.8 24.6 Z" fill="#fff"/>' +
    (noeud ? `<path d="M24 7 L16 2 L17 11 Z M24 7 L32 2 L31 11 Z" fill="${noeud}"/>` +
      `<circle cx="24" cy="7" r="2.6" fill="${noeud}" stroke="#141420" stroke-width="0.6"/>`
      : '') + '</g>';
  return _svg([-6, 0, 54, 64], cape + jambes + haut);
}

/** Elle bat des ailes (le corps monte quand les ailes descendent). */
export function chauve_souris(phase) {
  const a = sin(phase * TAU);
  const up = 9 * a;
  const aile = [[32, 18], [20, 8 - up * 0.5], [14, 12 - up * 0.8], [4, 6 - up], [6, 16 - up * 0.8],
    [0, 22 - up * 0.6], [10, 22 - up * 0.4], [14, 30 - up * 0.3], [22, 24], [32, 28]];
  const miroir = aile.map(([x, y]) => [64 - x, y]);
  const dy = -1.5 * a;
  return _svg([0, -8, 64, 48],
    `<polygon points="${_points(aile)}" fill="#2a2236"/>` +
    `<polygon points="${_points(miroir)}" fill="#2a2236"/>` +
    `<g transform="translate(0 ${f(dy)})">` +
    '<polygon points="26,14 27,5 30,13" fill="#3a3048"/><polygon points="38,14 37,5 34,13" fill="#3a3048"/>' +
    '<ellipse cx="32" cy="22" rx="8" ry="10" fill="#3a3048"/>' +
    '<ellipse cx="29" cy="20" rx="2" ry="1.3" fill="#ff2020"/><ellipse cx="35" cy="20" rx="2" ry="1.3" fill="#ff2020"/>' +
    '<polygon points="30,26 31,29.5 32,26" fill="#fff"/><polygon points="32,26 33,29.5 34,26" fill="#fff"/></g>');
}

/** Le bas d'un fantôme qui ondule, de droite à gauche. */
function _bas_fantome(p, gauche, droite, haut_dent, bas_dent, dents, arrondi) {
  const pts = [];
  for (let i = 0; i < dents * 2 + 1; i++) {
    const x = droite - (droite - gauche) * i / (dents * 2);
    const y = (i % 2 === 0 ? bas_dent : haut_dent) + 2 * sin(p + i * 0.9);
    pts.push([x, y]);
  }
  if (!arrondi) return pts.map(([x, y]) => `L${f(x)} ${f(y)}`).join(" ");
  let chemin = `L${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i += 2) {
    chemin += ` Q${f(pts[i][0])} ${f(pts[i][1])} ${f(pts[i + 1][0])} ${f(pts[i + 1][1])}`;
  }
  return chemin;
}

/** Il agite les bras, sa bouche s'ouvre et se ferme (« Hououou… »). */
export function fantome_peur(phase) {
  const p = phase * TAU;
  const bras = 4 * sin(p * 2);
  const bouche = 8 + 2 * sin(p);
  return _svg([0, 0, 64, 64],
    `<path d="M10 30 L1 ${f(19 - bras)} L13 23 Z M54 30 L63 ${f(19 + bras)} L51 23 Z" fill="#a8b0bc"/>` +
    `<path d="M10 28 Q10 5 32 5 Q54 5 54 28 ${_bas_fantome(p, 10, 54, 53, 62, 3, false)} Z" fill="#b8c0cc"/>` +
    '<ellipse cx="23" cy="26" rx="5" ry="7" fill="#121218"/><ellipse cx="41" cy="26" rx="5" ry="7" fill="#121218"/>' +
    `<ellipse cx="32" cy="44" rx="${f(5 + bouche * 0.15)}" ry="${f(bouche)}" fill="#121218"/>` +
    '<path d="M16 15 L28 21 M48 15 L36 21" stroke="#121218" stroke-width="3" stroke-linecap="round"/>');
}

/** Son bas ondule doucement, il cligne des yeux, son nœud frétille. */
export function fantome_gentil(phase) {
  const p = phase * TAU;
  const cligne = 0.9 < phase && phase < 0.97;
  const yeux = cligne ?
    '<path d="M22 29 Q25 31 28 29 M36 29 Q39 31 42 29" stroke="#2a2a40" stroke-width="1.8" ' +
    'fill="none" stroke-linecap="round"/>' :
    '<circle cx="25" cy="29" r="3.5" fill="#2a2a40"/><circle cx="39" cy="29" r="3.5" fill="#2a2a40"/>' +
    '<circle cx="26" cy="28" r="1.2" fill="#fff"/><circle cx="40" cy="28" r="1.2" fill="#fff"/>';
  const noeud = 2 * sin(p * 3);
  return _svg([0, 0, 64, 64],
    `<path d="M12 30 Q12 9 32 9 Q52 9 52 30 ${_bas_fantome(p, 12, 52, 53, 60, 4, true)} Z" fill="#fbfbff"/>` +
    yeux +
    '<ellipse cx="20" cy="36" rx="4" ry="2.5" fill="#ffb0c8"/><ellipse cx="44" cy="36" rx="4" ry="2.5" fill="#ffb0c8"/>' +
    '<path d="M27 38 Q32 43 37 38" stroke="#2a2a40" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    `<path d="M32 10 L21 ${f(3 - noeud)} L21 ${f(17 - noeud)} Z M32 10 L43 ${f(3 + noeud)} L43 ${f(17 + noeud)} Z" fill="#ff5aa0"/>` +
    '<circle cx="32" cy="10" r="3" fill="#ff8ac0"/>');
}

/** Trois volutes de fumée qui montent et s'effacent, des bulles qui éclatent. */
export function soupe(phase) {
  let fumee = "";
  for (let i = 0; i < 3; i++) {
    const u = (phase + i / 3) % 1;
    const x = 22 + 10 * i + 3 * sin(u * TAU + i), y = 20 - 18 * u;
    const alpha = sin(u * PI) * 0.75;
    fumee += `<path d="M${f(x)} ${f(y + 5)} Q${f(x - 4)} ${f(y + 1)} ${f(x)} ${f(y - 2)} ` +
      `Q${f(x + 4)} ${f(y - 5)} ${f(x)} ${f(y - 8)}" stroke="#ffffff" stroke-width="2.2" ` +
      `fill="none" stroke-linecap="round" opacity="${f(alpha, 2)}"/>`;
  }
  let bulles = "";
  [22, 34, 42].forEach((bx, i) => {
    const r = 2.6 * sin(PI * ((phase * 2 + i * 0.37) % 1));
    if (r > 0.3) bulles += `<circle cx="${bx}" cy="24" r="${f(r)}" fill="#ffd060"/>`;
  });
  return _svg([0, -8, 64, 72],
    fumee +
    '<path d="M6 24 Q6 56 32 58 Q58 56 58 24 Z" fill="#3a3550"/>' +
    '<rect x="14" y="54" width="6" height="8" fill="#3a3550"/><rect x="44" y="54" width="6" height="8" fill="#3a3550"/>' +
    '<ellipse cx="32" cy="24" rx="26" ry="6" fill="#5a5470"/>' +
    '<ellipse cx="32" cy="24" rx="22" ry="4" fill="#ff9a2a"/>' + bulles +
    '<circle cx="25" cy="37" r="2.2" fill="#ffb040"/><circle cx="39" cy="37" r="2.2" fill="#ffb040"/>' +
    '<path d="M26 43 Q32 49 38 43" stroke="#ffb040" stroke-width="2.5" fill="none" stroke-linecap="round"/>');
}

/** L'araignée fait le tour de sa toile en remuant les pattes. */
export function toile(phase) {
  const p = phase * TAU;
  let web = '<g stroke="#8f96a4" stroke-width="1.4" fill="none">' +
    '<path d="M32 30 L62 30 M32 30 L53.2 51.2 M32 30 L32 60 M32 30 L10.8 51.2 M32 30 L2 30 ' +
    'M32 30 L10.8 8.8 M32 30 L32 0 M32 30 L53.2 8.8"/>';
  for (const r of [10, 18, 26]) {
    const pts = [];
    for (let k = 0; k < 8; k++) pts.push([32 + r * cos(k * TAU / 8), 30 + r * sin(k * TAU / 8)]);
    web += `<polygon points="${_points(pts)}"/>`;
  }
  web += '</g>';
  // elle avance sur l'anneau du milieu, la tête dans le sens de la marche
  const x = 32 + 18 * cos(p), y = 30 + 18 * sin(p);
  const angle = degrees(p) + 180;
  let pattes = "";
  for (const cote of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const bouge = 1.5 * sin(p * 16 + i * PI / 2 + (cote > 0 ? 1 : 0) * PI);
      const y0 = -3 + i * 2;
      pattes += `<polyline points="${_points([[cote * 3, y0], [cote * 7, y0 - 3 + bouge], [cote * 10, y0 + 1 + i + bouge]])}"/>`;
    }
  }
  const araignee = `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)})">` +
    `<g stroke="#15121c" stroke-width="1.4" stroke-linecap="round" fill="none">${pattes}</g>` +
    '<ellipse cx="0" cy="2" rx="4.5" ry="5.5" fill="#15121c"/><circle cx="0" cy="-4" r="3" fill="#15121c"/>' +
    '<circle cx="-1.2" cy="-5" r="0.9" fill="#ff3030"/><circle cx="1.2" cy="-5" r="0.9" fill="#ff3030"/></g>';
  return _svg([0, 0, 64, 64], web + araignee);
}

/** Le vieux chandelier éteint, plein de toiles, qui se balance un peu. */
export function chandelier_eteint(phase) {
  const angle = 3 * sin(phase * TAU);
  return _svg([0, 0, 64, 64],
    `<g transform="rotate(${f(angle)} 32 0)">` +
    '<rect x="31" y="0" width="2" height="16" fill="#3a3a44"/>' +
    '<path d="M32 16 L32 34" stroke="#3a3a44" stroke-width="3"/>' +
    '<path d="M8 34 Q32 52 56 34" stroke="#3a3a44" stroke-width="4" fill="none"/>' +
    '<ellipse cx="32" cy="40" rx="6" ry="8" fill="#3a3a44"/>' +
    '<rect x="4" y="30" width="10" height="5" rx="1" fill="#3a3a44"/>' +
    '<rect x="27" y="22" width="10" height="5" rx="1" fill="#3a3a44"/>' +
    '<rect x="50" y="30" width="10" height="5" rx="1" fill="#3a3a44"/>' +
    '<rect x="7" y="22" width="4" height="8" fill="#7a7a80"/>' +
    '<rect x="30" y="14" width="4" height="8" fill="#7a7a80"/>' +
    '<rect x="53" y="20" width="4" height="10" fill="#7a7a80"/>' +
    '<path d="M10 22 Q22 30 30 16" stroke="#aaaaaa" stroke-width="0.8" fill="none" opacity="0.6"/>' +
    '<path d="M34 16 Q44 28 54 20" stroke="#aaaaaa" stroke-width="0.8" fill="none" opacity="0.6"/>' +
    '</g>');
}

/** Les flammes vacillent. */
export function chandelier_allume(phase) {
  const p = phase * TAU;
  let flammes = "";
  [[9, 11], [32, 5], [55, 11]].forEach(([x, y], i) => {
    const h = 5 + 1.2 * sin(p * (2 + i) + i);
    const dx = 0.8 * sin(p * (3 + i));
    const lueur = 0.22 + 0.08 * sin(p * (2 + i));
    flammes += `<circle cx="${x}" cy="${y}" r="9" fill="#ffd040" opacity="${f(lueur, 2)}"/>` +
      `<ellipse cx="${f(x + dx)}" cy="${f(y + 5 - h)}" rx="3" ry="${f(h)}" fill="#ff9a2a"/>` +
      `<ellipse cx="${f(x + dx)}" cy="${f(y + 6 - h * 0.6)}" rx="1.5" ry="${f(h * 0.6)}" fill="#fff4a0"/>`;
  });
  return _svg([0, -4, 64, 68],
    '<rect x="31" y="-4" width="2" height="20" fill="#c99a20"/>' +
    '<path d="M32 16 L32 34" stroke="#e8b830" stroke-width="3"/>' +
    '<path d="M8 34 Q32 52 56 34" stroke="#e8b830" stroke-width="4" fill="none"/>' +
    '<ellipse cx="32" cy="40" rx="6" ry="8" fill="#e8b830"/><circle cx="32" cy="40" r="2.5" fill="#ff5aa0"/>' +
    '<rect x="4" y="30" width="10" height="5" rx="1" fill="#e8b830"/>' +
    '<rect x="27" y="22" width="10" height="5" rx="1" fill="#e8b830"/>' +
    '<rect x="50" y="30" width="10" height="5" rx="1" fill="#e8b830"/>' +
    '<rect x="7" y="16" width="4" height="14" fill="#ff7ab8"/>' +
    '<rect x="30" y="10" width="4" height="12" fill="#b070ff"/>' +
    '<rect x="53" y="16" width="4" height="14" fill="#ff9a2a"/>' + flammes);
}

/** Les fanions se balancent, les ampoules clignotent chacune leur tour. */
export function guirlande(phase) {
  const p = phase * TAU;
  const couleurs = ["#ff8a1e", "#9b4dff", "#4cd964", "#ff5aa0"];
  const lampes = ["#ffd040", "#ff8a1e", "#b070ff", "#4cd964"];
  let fanions = "", ampoules = "";
  [[8, 10.4], [24, 15.4], [40, 15.4], [56, 10.4]].forEach(([x, y], i) => {
    const dx = 2 * sin(p + i);
    fanions += `<polygon points="${_points([[x - 7, y - 1], [x + 7, y + 1], [x + dx, y + 16]])}" fill="${couleurs[i]}"/>`;
    const allume = (Math.trunc(phase * 4) + i) % 2 === 0;
    const ly = y + 28;
    ampoules += `<circle cx="${x}" cy="${ly}" r="8" fill="${lampes[i]}" opacity="${allume ? 0.4 : 0.08}"/>` +
      `<circle cx="${x}" cy="${f(ly + 1.6)}" r="4" fill="${lampes[i]}" opacity="${allume ? 1 : 0.55}"/>`;
  });
  return _svg([0, 0, 64, 64],
    '<path d="M0 6 Q32 26 64 6" stroke="#6a4a3a" stroke-width="2" fill="none"/>' + fanions +
    '<path d="M0 34 Q32 54 64 34" stroke="#3a3a3a" stroke-width="1.5" fill="none"/>' + ampoules);
}

/** Le ballon chauve-souris remue ses petites ailes, sa ficelle ondule. */
export function ballon(phase) {
  const p = phase * TAU;
  const fl = 4 * sin(p), a = 3 * sin(p * 2);
  return _svg([0, 0, 48, 64],
    `<path d="M24 45 Q${f(19 + fl)} 52 ${f(25 - fl * 0.5)} 57 Q${f(30 - fl)} 61 ${f(24 + fl * 0.5)} 64" ` +
    'stroke="#d0c0e0" stroke-width="1.2" fill="none"/>' +
    `<path d="M7 20 L1 ${f(14 - a)} L3 24 L0 ${f(30 - a * 0.5)} L8 28 Z ` +
    `M41 20 L47 ${f(14 - a)} L45 24 L48 ${f(30 - a * 0.5)} L40 28 Z" fill="#7a35d0"/>` +
    '<polygon points="13,9 15,1 20,7" fill="#8a45e0"/><polygon points="35,9 33,1 28,7" fill="#8a45e0"/>' +
    '<ellipse cx="24" cy="23" rx="17" ry="20" fill="#9b4dff"/>' +
    '<polygon points="21,46 27,46 24,42" fill="#7a35d0"/>' +
    '<ellipse cx="17" cy="14" rx="4" ry="6" fill="#fff" opacity="0.35"/>' +
    '<circle cx="19" cy="22" r="2.6" fill="#2a1a40"/><circle cx="29" cy="22" r="2.6" fill="#2a1a40"/>' +
    '<circle cx="20" cy="21" r="0.9" fill="#fff"/><circle cx="30" cy="21" r="0.9" fill="#fff"/>' +
    '<ellipse cx="15" cy="28" rx="3" ry="2" fill="#ff8ac0"/><ellipse cx="33" cy="28" rx="3" ry="2" fill="#ff8ac0"/>' +
    '<path d="M20 29 Q24 33 28 29" stroke="#2a1a40" stroke-width="1.6" fill="none" stroke-linecap="round"/>');
}

/** Le squelette effondré en tas d'os, tout étourdi (des étoiles tournent). */
export function squelette_tas(phase) {
  const p = phase * TAU;
  let etoiles = "";
  for (let i = 0; i < 3; i++) {
    const a = p + i * TAU / 3;
    const x = 24 + 13 * cos(a), y = 5 + 3 * sin(a);
    etoiles += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.4 + 0.6 * sin(a))}" fill="#ffd040"/>`;
  }
  return _svg([0, 0, 48, 36],
    '<g stroke="#cfc9b4" stroke-width="3.5" stroke-linecap="round">' +
    '<path d="M6 32 L22 28 M18 33 L38 31 M28 27 L44 32 M10 26 L24 31 M30 33 L36 25"/></g>' +
    '<ellipse cx="24" cy="17" rx="10" ry="9" fill="#e4dfcc"/>' +
    '<rect x="18" y="21" width="12" height="5" rx="2" fill="#e4dfcc"/>' +
    '<g stroke="#1a1010" stroke-width="1.2" fill="none">' +
    '<circle cx="20" cy="16" r="2.6"/><circle cx="28" cy="16" r="2.6"/>' +
    '<path d="M20 24 L28 24"/></g>' +
    '<circle cx="20" cy="16" r="0.9" fill="#1a1010"/><circle cx="28" cy="16" r="0.9" fill="#1a1010"/>' +
    etoiles);
}

/** Une aile de corbeau (plumes au bout), tournée de angle degrés autour de l'épaule :
 *  0 = à l'horizontale vers l'arrière, positif = levée, négatif = baissée. */
function _aile(epaule, angle, echelle = 1.0) {
  const base = [[0, -3], [-12, -7], [-26, -8], [-38, -5], [-34, -1], [-37, 2], [-30, 1], [-32, 5],
    [-25, 3], [-25, 7], [-18, 4], [-17, 7], [-10, 4], [0, 5]];
  const a = radians(angle);
  const ca = cos(a), sa = sin(a);
  return base.map(([x, y]) => [epaule[0] + echelle * (x * ca - y * sa), epaule[1] + echelle * (x * sa + y * ca)]);
}

/** Le corbeau grognon, tourné vers la droite. etat : « vol » (il bat des ailes),
 *  « picore » (il donne des coups de bec) ou « ricane » (bec ouvert, il sautille). */
export function corbeau(phase, etat = "vol") {
  const p = phase * TAU;
  let tete = [0.0, 0.0], bec = 0.0, pattes = true, angle, dy;
  if (etat === "vol") {
    angle = 10 + 50 * cos(p); dy = 2 * cos(p); pattes = false;
  } else if (etat === "picore") {
    angle = -18; dy = 0.0;
    tete = [4 * abs(sin(p)), 12 * abs(sin(p))];
  } else {
    angle = -12 + 14 * max(0.0, sin(2 * p)); dy = -3 * abs(sin(p));
    bec = sin(4 * p) > 0 ? 1.0 : 0.3;
  }
  const aile_loin = _points(_aile([44, 24 + dy], angle + 8, 0.85));
  const aile_pres = _points(_aile([40, 27 + dy], angle));
  let jambes;
  if (pattes) {
    jambes = '<path d="M38 40 L36 50 M44 40 L46 50 M32 50 L40 50 M42 50 L50 50" stroke="#e8a020" ' +
      'stroke-width="2" stroke-linecap="round" fill="none"/>';
  } else {
    jambes = '<path d="M40 39 L33 44 M44 39 L37 45" stroke="#e8a020" stroke-width="2" ' +
      'stroke-linecap="round" fill="none"/>';
  }
  const [tx, ty] = tete;
  const bas_bec = `${f(65 + tx)},${f(22 + ty)} ${f(76 - 2 * bec + tx)},${f(21.5 + 9 * bec + ty)} ` +
    `${f(64 + tx)},${f(24.5 + 1.5 * bec + ty)}`;
  return _svg([-2, -12, 82, 64],
    `<polygon points="${aile_loin}" fill="#120f18"/>` +
    jambes +
    `<g transform="translate(0 ${f(dy)})">` +
    '<polygon points="22,31 3,26 5,31 2,34 6,36 4,40 22,36" fill="#18141f"/>' +
    '<path d="M20 30 Q30 22 46 22 Q58 22 60 30 Q58 40 44 41 Q30 42 20 36 Z" fill="#1e1a28"/>' +
    '<path d="M30 27 Q40 24 50 26" stroke="#4a4880" stroke-width="1.5" fill="none" opacity="0.8"/>' +
    '<ellipse cx="54" cy="26" rx="7" ry="6" fill="#1e1a28"/>' +
    `<g transform="translate(${f(tx)} ${f(ty)})">` +
    '<circle cx="57" cy="20" r="9.5" fill="#211c2c"/>' +
    '<path d="M51 15 Q56 12 61 13" stroke="#4a4880" stroke-width="1.2" fill="none" opacity="0.8"/>' +
    '<polygon points="64,16 78,20 65,22" fill="#f0a828"/></g>' +
    `<polygon points="${bas_bec}" fill="#d08818"/>` +
    `<g transform="translate(${f(tx)} ${f(ty)})">` +
    '<circle cx="60" cy="18" r="2.8" fill="#ffd040"/><circle cx="60.8" cy="18.2" r="1.3" fill="#000"/>' +
    '<path d="M55 14 L64 16.5" stroke="#000" stroke-width="2.2" stroke-linecap="round"/></g>' +
    '</g>' +
    `<polygon points="${aile_pres}" fill="#272135" stroke="#3a3450" stroke-width="0.8"/>`);
}

/** Un bonbon emballé : ses papillotes frétillent et il brille de temps en temps. */
export function bonbon(phase) {
  const p = phase * TAU;
  const e = 1 + 0.25 * sin(p * 2);
  let brille = "";
  if (phase < 0.2) {
    const r = 4 * sin(phase / 0.2 * PI);
    brille = `<path d="M30 ${f(9 - r)} L30 ${f(9 + r)} M${f(30 - r)} 9 L${f(30 + r)} 9" ` +
      'stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>';
  }
  return _svg([0, 0, 48, 32],
    `<polygon points="${_points([[15, 16], [3, 16 - 8 * e], [6, 16], [3, 16 + 8 * e]])}" fill="#b070ff"/>` +
    `<polygon points="${_points([[33, 16], [45, 16 - 8 * e], [42, 16], [45, 16 + 8 * e]])}" fill="#b070ff"/>` +
    '<ellipse cx="24" cy="16" rx="11" ry="9" fill="#ff8a1e"/>' +
    '<path d="M17 9 L22 23 M24 7 L29 24 M31 9 L33 16" stroke="#ffd040" stroke-width="2.2" stroke-linecap="round"/>' +
    brille);
}

/** Le couteau de cuisine du vampire (pour la courge), lame vers la droite. */
export function couteau(phase) {
  return _svg([0, 0, 44, 16],
    '<rect x="0" y="5" width="14" height="6" rx="2" fill="#6a3a1a"/>' +
    '<rect x="12" y="3" width="3" height="10" rx="1" fill="#888888"/>' +
    '<path d="M15 4 L40 6 Q44 8 40 10 L15 12 Z" fill="#dfe6ee"/>' +
    '<path d="M15 4 L40 6 L15 7 Z" fill="#ffffff" opacity="0.6"/>');
}

/** La courge grognonne : bien ronde, côtelée, avec sa tige en tire-bouchon et une
 *  feuille. Elle respire, une lueur palpite dans ses yeux et sa bouche taillés, elle
 *  fronce les sourcils, cligne des yeux et grogne en claquant des dents. */
export function courge(phase) {
  const p = phase * TAU;
  const souffle = 1 + 0.04 * sin(p * 2);
  const lueur = 0.55 + 0.35 * sin(p * 4) * sin(p * 3);
  const cligne = 0.82 < phase && phase < 0.9;
  const b = 2.5 * max(0.0, sin(p * 3));   // elle grogne : la bouche s'ouvre
  const oeil_g = !cligne ? "15,30 28,35 17,41" : "15,36 28,36 28,37.5 15,37.5";
  const oeil_d = !cligne ? "49,30 36,35 47,41" : "49,36 36,36 36,37.5 49,37.5";
  const trous = `<polygon points="${oeil_g}"/><polygon points="${oeil_d}"/>` +
    `<path d="M14 ${f(47 - b * 0.3)} Q32 ${f(53 - b * 0.3)} 50 ${f(47 - b * 0.3)} L46 ${f(54 + b)} ` +
    `L41 ${f(51 + b)} L37 ${f(56 + b)} L32 ${f(52 + b)} L27 ${f(56 + b)} L23 ${f(51 + b)} L18 ${f(54 + b)} Z"/>`;
  return _svg([0, 0, 64, 64],
    '<defs><radialGradient id="peau" cx="0.4" cy="0.35" r="0.7">' +
    '<stop offset="0" stop-color="#ffa64a"/><stop offset="0.6" stop-color="#e2741e"/>' +
    '<stop offset="1" stop-color="#a84a12"/></radialGradient>' +
    '<radialGradient id="cote" cx="0.5" cy="0.4" r="0.7">' +
    '<stop offset="0" stop-color="#e07a26"/><stop offset="1" stop-color="#93400e"/></radialGradient></defs>' +
    '<ellipse cx="32" cy="61" rx="24" ry="3" fill="#000" opacity="0.3"/>' +
    `<g transform="translate(0 ${f(64 - 64 * souffle)}) scale(1 ${f(souffle, 3)})">` +
    '<path d="M31 18 Q28 9 33 3 L37 5 Q33 10 35 18 Z" fill="#5b4a22"/>' +
    '<path d="M34 6 Q44 2 46 9 Q42 7 39 11" stroke="#6a8a30" stroke-width="1.6" fill="none"/>' +
    '<path d="M36 12 Q46 10 50 16 Q42 19 36 12 Z" fill="#6a9a34"/>' +
    '<ellipse cx="14" cy="40" rx="11" ry="19" fill="url(#cote)"/>' +
    '<ellipse cx="50" cy="40" rx="11" ry="19" fill="url(#cote)"/>' +
    '<ellipse cx="22" cy="40" rx="13" ry="21" fill="url(#cote)"/>' +
    '<ellipse cx="42" cy="40" rx="13" ry="21" fill="url(#cote)"/>' +
    '<ellipse cx="32" cy="40" rx="14" ry="22" fill="url(#peau)"/>' +
    '<path d="M25 21 Q21 40 25 60 M39 21 Q43 40 39 60" stroke="#8a3c0c" stroke-width="1.1" fill="none" opacity="0.7"/>' +
    '<path d="M27 24 Q24 30 25 36" stroke="#ffd08a" stroke-width="1.6" fill="none" opacity="0.6"/>' +
    '<path d="M13 26 L27 30 M51 26 L37 30" stroke="#5a2408" stroke-width="2.2" stroke-linecap="round"/>' +
    `<g fill="#2a1006">${trous}</g>` +
    `<g fill="#ff7a10" opacity="${f(lueur, 2)}">${trous}</g>` +
    `<g fill="#ffe070" opacity="${f(lueur * 0.6, 2)}" transform="translate(32 40) scale(0.6) translate(-32 -40)">${trous}</g>` +
    '</g>');
}

// ---- les lampes propres à chaque salle du Bled (à la place du chandelier) ----

/** Le néon de la Bricotine, large, pendu à deux fils : éteint (il grésille parfois),
 *  ou allumé. */
export function neon(phase, allume) {
  const gresille = !allume && 0.80 < phase && phase < 0.84;
  const tube = allume ? "#ffffff" : (gresille ? "#c8d8e8" : "#5a5e6a");
  const lueur = allume ? '<ellipse cx="48" cy="26" rx="52" ry="14" fill="#f0f8ff" opacity="0.35"/>' :
    gresille ? '<ellipse cx="48" cy="26" rx="40" ry="8" fill="#c8d8e8" opacity="0.25"/>' : "";
  const toile = allume ? '' : '<path d="M10 22 Q18 32 28 22" stroke="#aaaaaa" stroke-width="0.8" fill="none" opacity="0.6"/>';
  return _svg([0, 0, 96, 40],
    '<rect x="6" y="2" width="4" height="6" fill="#3a3a44"/><rect x="86" y="2" width="4" height="6" fill="#3a3a44"/>' +
    `${lueur}<rect x="2" y="8" width="92" height="12" rx="3" fill="#6a6e78"/>` +
    '<rect x="2" y="8" width="92" height="3" rx="1.5" fill="#868a94"/>' +
    `<rect x="5" y="18" width="86" height="7" rx="3.5" fill="${tube}"/>${toile}`);
}

/** La suspension du foyer : éteinte et poussiéreuse, ou allumée, chaude. */
export function suspension(phase, allume) {
  const angle = 3 * sin(phase * TAU);
  const abat = allume ? "#c88a48" : "#3a3440";
  const ampoule = allume ? "#fff2b0" : "#55505a";
  const lueur = allume ? '<ellipse cx="32" cy="46" rx="28" ry="16" fill="#ffd27a" opacity="0.35"/>' : "";
  const toile = allume ? '' : '<path d="M14 40 Q24 30 32 38" stroke="#aaaaaa" stroke-width="0.8" fill="none" opacity="0.6"/>';
  return _svg([0, 0, 64, 64],
    `<g transform="rotate(${f(angle)} 32 0)">` +
    `<path d="M32 0 L32 22" stroke="#2a2630" stroke-width="2"/>${lueur}` +
    `<path d="M14 42 Q16 22 32 22 Q48 22 50 42 Z" fill="${abat}"/>` +
    `<circle cx="32" cy="44" r="6" fill="${ampoule}"/>${toile}</g>`);
}

/** Un projecteur de la Tanière : éteint, ou allumé avec un faisceau de couleur. */
export function projecteur(phase, allume) {
  const p = phase * TAU;
  const angle = allume ? 12 * sin(p) : -8;
  const couleur = ["#ff8a1e", "#9b4dff", "#ff5aa0", "#4cd964"][Math.trunc(phase * 4) % 4];
  const faisceau = allume ? `<path d="M26 36 L38 36 L58 64 L6 64 Z" fill="${couleur}" opacity="0.35"/>` : "";
  const lentille = allume ? couleur : "#30303a";
  return _svg([0, 0, 64, 64],
    '<path d="M32 0 L32 14" stroke="#2a2a30" stroke-width="3"/>' +
    '<path d="M20 14 L44 14 L44 20 L20 20 Z" fill="#2a2a30"/>' +
    `<g transform="rotate(${f(angle)} 32 18)">${faisceau}` +
    '<rect x="23" y="16" width="18" height="20" rx="3" fill="#1e1e24"/>' +
    `<ellipse cx="32" cy="36" rx="8" ry="3" fill="${lentille}"/></g>`);
}

/** Le lampion de la terrasse : déchiré et éteint, ou rond et lumineux. */
export function lampion(phase, allume) {
  const angle = 6 * sin(phase * TAU);
  let corps;
  if (allume) {
    corps = '<circle cx="32" cy="38" r="26" fill="#ffb040" opacity="0.25"/>' +
      '<ellipse cx="32" cy="38" rx="18" ry="16" fill="#ff8a1e"/>' +
      '<path d="M20 38 Q32 30 44 38 M18 44 Q32 52 46 44 M32 22 L32 54" stroke="#ffd27a" stroke-width="1.5" fill="none"/>' +
      '<ellipse cx="32" cy="38" rx="7" ry="8" fill="#fff0b0" opacity="0.8"/>';
  } else {
    corps = '<path d="M16 34 Q18 22 32 22 Q46 22 46 34 L42 50 L36 44 L30 54 L22 46 Z" fill="#4a4450"/>' +
      '<path d="M20 34 L44 34 M22 44 L40 42" stroke="#2a2630" stroke-width="1.2"/>';
  }
  return _svg([0, 0, 64, 64],
    `<g transform="rotate(${f(angle)} 32 0)">` +
    '<path d="M32 0 L32 22" stroke="#2a2630" stroke-width="1.5"/>' +
    '<rect x="26" y="20" width="12" height="4" fill="#2a2630"/>' +
    `${corps}<rect x="27" y="52" width="10" height="3" fill="#2a2630"/></g>`);
}

// nom : [fabrique, images par cycle, cycles par seconde]
export const ANIMES = {
  "vampire": [ph => vampire(ph, "repos"), 16, 0.25],
  "vampire_marche": [ph => vampire(ph, "marche"), 12, 1.0],  // suit les pas, pas le temps
  "vampire_saut": [ph => vampire(ph, "saut"), 1, 1.0],
  // la vampirette (deuxième joueur à deux), le parent (cape orange) et l'enfant (rouge)
  "vampirette": [ph => vampire(ph, "repos", "#7a2bd6", "#ff5aa0"), 16, 0.25],
  "vampirette_marche": [ph => vampire(ph, "marche", "#7a2bd6", "#ff5aa0"), 12, 1.0],
  "vampirette_saut": [ph => vampire(ph, "saut", "#7a2bd6", "#ff5aa0"), 1, 1.0],
  "parent": [ph => vampire(ph, "repos", "#e8781e"), 16, 0.25],
  "parent_marche": [ph => vampire(ph, "marche", "#e8781e"), 12, 1.0],
  "parent_saut": [ph => vampire(ph, "saut", "#e8781e"), 1, 1.0],
  "petit": [ph => vampire(ph, "repos"), 16, 0.3],
  "petit_marche": [ph => vampire(ph, "marche"), 12, 1.0],
  "petit_saut": [ph => vampire(ph, "saut"), 1, 1.0],
  "squelette": [ph => squelette(ph, false), 12, 1.5],
  "squelette_danse": [ph => squelette(ph, true), 40, 0.32],
  "chauve_souris": [chauve_souris, 8, 3.0],
  "fantome_peur": [fantome_peur, 16, 0.6],
  "fantome_gentil": [fantome_gentil, 16, 0.3],
  "soupe": [soupe, 16, 0.5],
  "toile": [toile, 48, 0.12],
  "chandelier_allume": [chandelier_allume, 12, 1.0],
  "guirlande": [guirlande, 8, 0.5],
  "ballon": [ballon, 12, 0.5],
  "squelette_tas": [squelette_tas, 12, 1.2],
  "corbeau_vol": [ph => corbeau(ph, "vol"), 10, 3.0],
  "corbeau_picore": [ph => corbeau(ph, "picore"), 8, 2.5],
  "corbeau_ricane": [ph => corbeau(ph, "ricane"), 8, 1.5],
  "bonbon": [bonbon, 16, 0.6],
  "couteau": [couteau, 1, 1.0],
  "chandelier_eteint": [chandelier_eteint, 12, 0.3],
  "neon_eteint": [ph => neon(ph, false), 25, 0.2],
  "neon_allume": [ph => neon(ph, true), 12, 0.3],
  "suspension_eteinte": [ph => suspension(ph, false), 12, 0.3],
  "suspension_allumee": [ph => suspension(ph, true), 12, 0.3],
  "projecteur_eteint": [ph => projecteur(ph, false), 1, 1.0],
  "projecteur_allume": [ph => projecteur(ph, true), 32, 0.25],
  "lampion_eteint": [ph => lampion(ph, false), 12, 0.4],
  "lampion_allume": [ph => lampion(ph, true), 12, 0.4],
  "courge": [courge, 16, 0.6],
};
