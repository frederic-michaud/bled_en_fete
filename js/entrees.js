// Lecture du clavier et des manettes du navigateur (port de manettes.py), pour un ou deux
// joueurs. Seul, tout le clavier et toutes les manettes pilotent le joueur ; à deux, le
// joueur 1 a la manette 1 et la moitié gauche du clavier, le joueur 2 la manette 2 et la
// moitié droite. On garde aussi les touches tapées (pour écrire son nom, Échap, Entrée…).
import { ACTIONS, Commande } from "./commandes.js";

// On désigne les touches par la lettre écrite dessus (event.key en minuscules) : ça marche
// en AZERTY, QWERTZ et QWERTY. Flèches : « ArrowLeft »… ; espace : " " ; Maj de droite :
// « ShiftRight ». Joueur 1 à gauche du clavier (Q ou A, D, espace, X, C), joueur 2 à
// droite (flèches, K, L).
export const CLAVIER_DUO = [
  { gauche: ["q", "a"], droite: ["d"], haut: [], bas: ["s"],
    saut: [" ", "z", "w"], action: ["x"], coucou: ["c"], pause: ["p"] },
  { gauche: ["ArrowLeft"], droite: ["ArrowRight"], haut: [], bas: ["ArrowDown"],
    saut: ["ArrowUp", "ShiftRight"], action: ["k"], coucou: ["l"], pause: ["p"] },
];
// seul : tout le clavier
export const CLAVIER = Object.fromEntries(ACTIONS.map(a => [a, [...CLAVIER_DUO[0][a], ...CLAVIER_DUO[1][a]]]));
export const NOM_CLAVIER = "Clavier : flèches, espace, X, C";
export const NOMS_CLAVIER_DUO = ["clavier : Q D, espace, X, C", "clavier : flèches, K, L"];

// Manettes du navigateur, disposition « standard » : bouton 0 = bas (saut), 1 = droite
// (bonbon), 3 = haut (couteau), 2 = gauche et 9 = Start (pause) ; croix 12 haut, 13 bas,
// 14 gauche, 15 droite ; joystick gauche : axes 0 et 1.
const BOUTONS_MANETTE = { saut: [0], action: [1], coucou: [3], pause: [2, 9],
                          haut: [12], bas: [13], gauche: [14], droite: [15] };
const AXES = { gauche: [0, -1], droite: [0, 1], haut: [1, -1], bas: [1, 1] };
const SEUIL = 0.5;

// Les touches dont on empêche l'effet du navigateur (défiler la page, revenir en arrière…).
const TOUCHES_DU_JEU = new Set([...Object.values(CLAVIER).flat(),
  "Backspace", "Enter", "Escape", "ArrowUp", "Tab", "f", "m", "r"]);

/** Le nom d'une touche, comme dans CLAVIER_DUO. */
export function nom_touche(ev) {
  if (ev.code === "ShiftRight") return "ShiftRight";
  return ev.key && ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
}

function manette_active(pad, action) {
  for (const i of BOUTONS_MANETTE[action]) {
    const b = pad.buttons[i];
    if (b && (b.pressed || b.value > SEUIL)) return true;
  }
  const axe = AXES[action];
  if (axe && pad.axes.length > axe[0]) return pad.axes[axe[0]] * axe[1] > SEUIL;
  return false;
}

export class Entrees {
  constructor(cible = window) {
    this.enfoncees = new Map();   // code de la touche → son nom (touches tenues)
    this.tapees = [];             // les touches appuyées depuis la dernière lecture
    this.frappees = new Set();    // touches appuyées depuis la dernière lecture (même déjà lâchées)
    this.precedent = [0, 1].map(() => Object.fromEntries(ACTIONS.map(a => [a, false])));
    cible.addEventListener("keydown", ev => {
      const nom = nom_touche(ev);
      if (!(ev.ctrlKey || ev.metaKey || ev.altKey) && TOUCHES_DU_JEU.has(nom)) ev.preventDefault();
      this.enfoncees.set(ev.code || nom, nom);
      this.frappees.add(nom);   // une touche vite tapée et lâchée entre deux images compte quand même
      if (!ev.repeat) this.tapees.push({ nom, key: ev.key, ctrl: ev.ctrlKey || ev.metaKey || ev.altKey });
    });
    cible.addEventListener("keyup", ev => {
      this.enfoncees.delete(ev.code || nom_touche(ev));
    });
    cible.addEventListener("blur", () => this.enfoncees.clear());  // plus rien n'est tenu
  }

  /** Les touches tapées depuis la dernière fois (et on les oublie). */
  prendre_touches() {
    const t = this.tapees;
    this.tapees = [];
    return t;
  }

  joys() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    return [...pads].filter(p => p && p.connected);
  }

  /** Les manettes (seul), ou ce qui pilote ce joueur (à deux). */
  nom(joueur = null) {
    const joys = this.joys();
    if (joueur === null) return joys.map(j => j.id).join(", ") || NOM_CLAVIER;
    if (joueur < joys.length) return joys[joueur].id;
    return NOMS_CLAVIER_DUO[joueur];
  }

  /** Une Commande par joueur (clavier = false : les manettes seulement, pendant qu'on
   * tape son nom au clavier). */
  lire(joueurs = 1, clavier = true) {
    const tenues = new Set([...this.enfoncees.values(), ...this.frappees]);
    this.frappees.clear();
    const joys = this.joys();
    const resultat = [];
    for (let i = 0; i < joueurs; i++) {
      const touches = joueurs === 1 ? CLAVIER : CLAVIER_DUO[i];
      const manettes = joueurs === 1 ? joys : joys.slice(i, i + 1);
      const c = new Commande();
      for (const a of ACTIONS) {
        const actif = (clavier && touches[a].some(k => tenues.has(k)))
          || manettes.some(pad => manette_active(pad, a));
        c[a] = actif;
        c[a + "_presse"] = actif && !this.precedent[i][a];
        this.precedent[i][a] = actif;
      }
      resultat.push(c);
    }
    return resultat;
  }
}
