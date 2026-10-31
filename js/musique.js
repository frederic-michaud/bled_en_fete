// La musique, fabriquée par le programme (port de musique.py) : quatre ambiances, de la
// plus lugubre à la fête. Elles ont le même tempo et la même longueur et tournent toutes
// en même temps, en boucle ; on passe de l'une à l'autre en baissant doucement le volume
// de l'une et en montant celui de la suivante (elles restent donc toujours en rythme).
//
// Comme pour les bruitages, la fabrication des échantillons (echantillons_voix,
// echantillons_ambiances) ne dépend pas du navigateur. Les voix d'une ambiance sont
// additionnées en un seul AudioBuffer (le Python les jouait sur des canaux séparés, de
// même volume : cela revient au même) ; chaque ambiance a son GainNode.
import { FREQ, quand_debloque, tampon } from "./sons.js";

export const TEMPO = 104;
export const FONDU = 2.0;           // secondes pour passer d'une ambiance à l'autre
export const LUGUBRE = 0, MYSTERE = 1, GAI = 2, FETE = 3;

// Huit mesures de huit croches. Accords (notes MIDI) : la mineur, puis la majeur.
export const MINEUR = [[69, 72, 76], [69, 72, 76], [65, 69, 72], [65, 69, 72],
  [62, 65, 69], [62, 65, 69], [64, 68, 71], [64, 68, 71]];
export const MAJEUR = [[69, 73, 76], [69, 73, 76], [66, 69, 73], [66, 69, 73],
  [62, 66, 69], [62, 66, 69], [64, 68, 71], [64, 68, 71]];

const TAU = 2 * Math.PI;
const fois = (liste, n) => Array.from({ length: n }, () => liste).flat();  // liste * n

/** Le round() de Python (au plus proche, et au pair en cas d'égalité). */
function round_py(x) {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
}

/** Une mélodie de croches : chaque motif donne, pour chaque croche, la note de l'accord à
 * jouer (0, 1, 2 ; 3 = la première une octave plus haut ; null = silence). */
function _arpege(accords, motifs, octave = 0) {
  const notes = [];
  accords.forEach((accord, k) => {
    for (const i of motifs[k % motifs.length]) {
      notes.push([i === null ? null : accord[i % 3] + 12 * Math.floor(i / 3) + 12 * octave, 1]);
    }
  });
  return notes;
}

/** Une basse en croches : écarts (demi-tons) au-dessus de la fondamentale, null = silence. */
function _basse_sautee(accords, motif) {
  const notes = [];
  for (const accord of accords) {
    const racine = accord[0] - 24;
    for (const e of motif) notes.push([e === null ? null : racine + e, 1]);
  }
  return notes;
}

/** Les quatre ambiances. Chacune : liste de voix [notes, timbre, volume, tenue] ; une note
 * = [MIDI ou null, durée en croches] ; la batterie : [coup ou null, 1]. */
export function ambiances() {
  const racines_m = MINEUR.map(a => [a[0] - 24, 8]);
  const lugubre = [
    [racines_m, "orgue", 0.10, 0.98],
    [[[76, 4], [72, 4], [69, 6], [null, 2], [77, 4], [76, 2], [74, 2], [72, 6], [null, 2],
      [74, 4], [77, 4], [69, 2], [68, 2], [69, 2], [71, 2], [68, 4], [71, 4], [64, 6], [null, 2]],
    "triangle", 0.08, 0.95],
    [fois([[88, 2], [null, 14]], 4), "cloche", 0.05, 1.0],
  ];
  const mystere = [
    [_basse_sautee(MINEUR, [0, null, 7, null, 12, null, 7, null]), "triangle", 0.14, 0.5],
    [_arpege(MINEUR, [[2, null, 1, 0, null, 1, 2, 1], [0, 1, 2, 3, 2, null, 1, null]]),
      "carre", 0.022, 0.6],
    [fois([[88, 2], [null, 14]], 4), "cloche", 0.035, 1.0],
  ];
  const gai = [
    [_basse_sautee(MAJEUR, [0, 12, 7, 12, 0, 12, 7, 12]), "triangle", 0.12, 0.6],
    [_arpege(MAJEUR, [[0, 1, 2, 1, 3, 2, 1, 2], [3, null, 2, 1, 2, null, 0, null]]),
      "carre", 0.028, 0.7],
    [fois([[null, 1], ["h", 1]], 32), "batterie", 0.05, 1.0],
  ];
  const fete = [
    [_basse_sautee(MAJEUR, [0, 12, 7, 12, 0, 12, 7, 12]), "triangle", 0.12, 0.6],
    [_arpege(MAJEUR, [[0, 2, 1, 3, 2, 3, 1, 2], [3, 2, 3, 4, 3, 2, 1, 2]], 1),
      "carre", 0.024, 0.7],
    [fois([["k", 1], ["h", 1], ["s", 1], ["h", 1]], 16), "batterie", 0.07, 1.0],
  ];
  return [lugubre, mystere, gai, fete];
}

function onde(forme, u) {
  if (forme === "carre") return u < 0.5 ? 1 : -1;
  if (forme === "triangle") return u < 0.5 ? 4 * u - 1 : 3 - 4 * u;
  // l'orgue : un son doux avec son octave et sa quinte
  const a = TAU * u;
  return 0.6 * Math.sin(a) + 0.3 * Math.sin(2 * a) + 0.15 * Math.sin(3 * a);
}

/** Un coup de batterie : grosse caisse, caisse claire ou charleston (entiers 16 bits). */
function coup(genre, volume, freq) {
  const n = Math.trunc(freq * (genre === "k" ? 0.12 : genre === "s" ? 0.07 : 0.03));
  const buf = new Int16Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    let v;
    if (genre === "k") {
      phase += (110 - 70 * u) / freq;
      v = Math.sin(TAU * phase);
    } else {
      v = (Math.random() * 2 - 1) * (genre === "s" ? 0.7 : 0.4);
    }
    buf[i] = Math.trunc(v * (1 - u) ** 2 * volume * 32767);
  }
  return buf;
}

/** Les échantillons d'une voix, en entiers 16 bits (comme le array("h") du Python). */
export function echantillons_voix(notes, forme, volume, tenue, freq = FREQ) {
  const croche = Math.trunc(freq * 60 / TEMPO / 2);
  let total = 0;
  for (const [, duree] of notes) total += croche * duree;
  const buf = new Int16Array(total);           // déjà plein de silence
  const coups = {};
  if (forme === "batterie") for (const g of "ksh") coups[g] = coup(g, volume, freq);
  let k = 0;
  for (const [note, duree] of notes) {
    const n = croche * duree;
    if (note === null) {
      // silence
    } else if (forme === "batterie") {
      buf.set(coups[note].subarray(0, n), k);
    } else if (forme === "cloche") {         // une note qui s'éteint doucement
      const f = 440 * 2 ** ((note - 69) / 12);
      for (let i = 0; i < n; i++) {
        const a = Math.sin(TAU * f * i / freq) * (1 - i / n) ** 3;
        buf[k + i] = Math.trunc(a * volume * 32767);
      }
    } else {
      const periode = Math.max(2, round_py(freq / (440 * 2 ** ((note - 69) / 12))));
      const cycle = new Int16Array(periode);
      for (let i = 0; i < periode; i++) {    // une seule vague, recopiée ensuite
        cycle[i] = Math.trunc(onde(forme, i / periode) * volume * 32767);
      }
      const tours = Math.trunc(Math.trunc(n * tenue) / periode);
      for (let t = 0; t < tours; t++) buf.set(cycle, k + t * periode);
    }
    k += n;
  }
  return buf;
}

/** Les quatre ambiances, chacune en un Float32Array (ses voix additionnées). */
export function echantillons_ambiances(freq = FREQ) {
  return ambiances().map(ambiance => {
    const voix = ambiance.map(v => echantillons_voix(...v, freq));
    const n = Math.max(...voix.map(b => b.length));
    const somme = new Float32Array(n);
    for (const b of voix) for (let i = 0; i < b.length; i++) somme[i] += b[i] / 32768;
    return somme;
  });
}

/** Toutes les ambiances jouent en même temps ; seule celle voulue s'entend. */
export class Musique {
  constructor() {
    this.active = true;               // touche M
    this.volumes = [0, 0, 0, 0];
    this.gains = [];                  // un GainNode par ambiance (vide avant le déblocage)
    this.ctx = null;
    // La musique est fabriquée et démarre dès que l'audio est débloqué.
    quand_debloque(ctx => this._demarrer(ctx));
  }

  _demarrer(ctx) {
    try {
      const sons = echantillons_ambiances(ctx.sampleRate);
      const debut = ctx.currentTime + 0.1;   // toutes ensemble : elles restent en rythme
      this.gains = sons.map((echantillons, i) => {
        const gain = ctx.createGain();
        gain.gain.value = this.volumes[i];
        gain.connect(ctx.destination);
        const source = ctx.createBufferSource();
        source.buffer = tampon(ctx, echantillons, ctx.sampleRate);
        source.loop = true;
        source.connect(gain);
        source.start(debut);
        return gain;
      });
      this.ctx = ctx;
    } catch (e) {
      console.warn("Pas de musique :", e);
      this.gains = [];
    }
  }

  /** Rapproche les volumes de l'ambiance voulue (null : silence). */
  maj(ambiance, dt) {
    for (let i = 0; i < this.volumes.length; i++) {
      const cible = i === ambiance && this.active ? 1 : 0;
      const v = this.volumes[i] + Math.max(-dt / FONDU, Math.min(dt / FONDU, cible - this.volumes[i]));
      if (v !== this.volumes[i]) {
        this.volumes[i] = v;
        if (this.gains[i]) this.gains[i].gain.setValueAtTime(v, this.ctx.currentTime);
      }
    }
  }
}

/** L'ambiance qui va avec une proportion de fête (de 0 à 1). */
export function ambiance_de(fete) {
  if (fete >= 1) return FETE;
  return fete < 0.25 ? LUGUBRE : fete < 0.55 ? MYSTERE : fete < 0.9 ? GAI : FETE;
}
