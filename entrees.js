// Lecture du clavier et des manettes du navigateur (port de manettes.py), pour un ou deux
// joueurs. Dans une salle, chaque joueur a ses touches (réglables : voir touches.js) et sa
// manette ; seul, toutes les manettes pilotent le joueur. Dans les menus, les touches sont
// toujours les mêmes : flèches pour choisir, espace (ou Entrée) pour valider. On garde aussi
// les touches tapées (pour écrire son nom, Échap, Entrée, régler les touches…).
import { ACTIONS, Commande } from "./commandes.js";
import { RESERVEES, touches, toutes } from "./touches.js";

// Les menus : des touches fixes, quel que soit le réglage des joueurs.
export const CLAVIER_MENU = { gauche: ["ArrowLeft"], droite: ["ArrowRight"], haut: ["ArrowUp"],
  bas: ["ArrowDown"], saut: [" "], action: [], coucou: [], pause: [] };

// Manettes du navigateur, disposition « standard » : bouton 0 = bas (saut), 1 = droite
// (bonbon), 3 = haut (couteau), 2 = gauche et 9 = Start (pause) ; croix 12 haut, 13 bas,
// 14 gauche, 15 droite ; joystick gauche : axes 0 et 1.
const BOUTONS_MANETTE = { saut: [0], action: [1], coucou: [3], pause: [2, 9],
                          haut: [12], bas: [13], gauche: [14], droite: [15] };
const AXES = { gauche: [0, -1], droite: [0, 1], haut: [1, -1], bas: [1, 1] };
const SEUIL = 0.5;

// Les touches dont on empêche l'effet du navigateur (défiler la page, revenir en arrière…).
function du_jeu(nom) {
  return RESERVEES.has(nom) || toutes().has(nom) || nom.startsWith("Arrow") || nom === " ";
}

/** Le nom d'une touche, comme dans touches.js. */
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
    // ce qui était appuyé à la lecture d'avant : joueur 1, joueur 2, menus
    this.precedent = [0, 1, 2].map(() => Object.fromEntries(ACTIONS.map(a => [a, false])));
    cible.addEventListener("keydown", ev => {
      const nom = nom_touche(ev);
      if (!(ev.ctrlKey || ev.metaKey || ev.altKey) && du_jeu(nom)) ev.preventDefault();
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

  /** Une Commande d'après ces touches et ces manettes ; i : sa place dans precedent. */
  commande(i, clavier, manettes, tenues) {
    const c = new Commande();
    for (const a of ACTIONS) {
      const actif = (clavier !== null && (clavier[a] || []).some(k => tenues.has(k)))
        || manettes.some(pad => manette_active(pad, a));
      c[a] = actif;
      c[a + "_presse"] = actif && !this.precedent[i][a];
      this.precedent[i][a] = actif;
    }
    return c;
  }

  tenues() {
    const t = new Set([...this.enfoncees.values(), ...this.frappees]);
    this.frappees.clear();
    return t;
  }

  /** Dans une salle : une Commande par joueur, avec ses touches et sa manette. */
  lire(joueurs = 1) {
    const tenues = this.tenues(), joys = this.joys(), t = touches();
    return [...Array(joueurs).keys()].map(i =>
      this.commande(i, t[i], joueurs === 1 ? joys : joys.slice(i, i + 1), tenues));
  }

  /** Dans les menus : une seule Commande, touches fixes et toutes les manettes
   * (clavier = false : les manettes seulement, pendant qu'on tape son nom). */
  lire_menu(clavier = true) {
    return this.commande(2, clavier ? CLAVIER_MENU : null, this.joys(), this.tenues());
  }
}
