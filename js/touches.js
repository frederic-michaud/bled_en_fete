// Les touches du clavier de chaque joueur, réglables (écran « touches » du jeu) et gardées
// dans le navigateur. Pensé pour un clavier suisse (QWERTZ) : on désigne les touches par
// ce qui est écrit dessus (event.key), les flèches par « ArrowLeft »…, l'espace par " ".
// Seul, on joue avec les touches du joueur 1.

export const CLE = "bled_en_fete_touches";

// Joueur 1 (et seul) : les flèches, la flèche du bas pour le couteau, l'espace pour lancer
// un bonbon. Joueur 2 : la même chose avec W A S D (même place en QWERTZ) et Q pour le bonbon.
export const TOUCHES_DEPART = [
  { gauche: ["ArrowLeft"], droite: ["ArrowRight"], saut: ["ArrowUp"], coucou: ["ArrowDown"],
    action: [" "], pause: ["p"] },
  { gauche: ["a"], droite: ["d"], saut: ["w"], coucou: ["s"], action: ["q"], pause: ["p"] },
];

// Ce qu'on peut régler, dans l'ordre de l'écran « touches ».
export const REGLABLES = [["gauche", "Aller à gauche"], ["droite", "Aller à droite"], ["saut", "Sauter"],
  ["action", "Lancer un bonbon"], ["coucou", "Le couteau"], ["pause", "Pause"]];

// Les touches qu'on ne peut pas prendre : elles servent aux menus et au navigateur.
export const RESERVEES = new Set(["Escape", "Enter", "Tab", "Backspace", "f", "m", "t"]);

function copie(t) {
  return t.map(j => Object.fromEntries(Object.entries(j).map(([a, k]) => [a, [...k]])));
}

let actuelles = null;

/** Les touches des deux joueurs : [{ action: [touches] }, …]. */
export function touches() {
  if (!actuelles) {
    try {
      const lu = JSON.parse(localStorage.getItem(CLE) || "null");
      actuelles = Array.isArray(lu) && lu.length === 2 ? lu : copie(TOUCHES_DEPART);
    } catch (e) {
      actuelles = copie(TOUCHES_DEPART);
    }
    for (let j = 0; j < 2; j++) {   // une action oubliée (ancienne sauvegarde) reprend sa touche de départ
      for (const [a] of REGLABLES) actuelles[j][a] = actuelles[j][a] || [...TOUCHES_DEPART[j][a]];
    }
  }
  return actuelles;
}

function enregistrer() {
  try {
    localStorage.setItem(CLE, JSON.stringify(actuelles));
  } catch (e) { /* navigateur sans stockage : tant pis, le réglage dure jusqu'à la fermeture */ }
}

/** Donne la touche à l'action du joueur, et la retire partout ailleurs (sauf la pause,
 * qui peut être commune aux deux joueurs). */
export function changer(joueur, action, touche) {
  const t = touches();
  for (let j = 0; j < 2; j++) {
    for (const [a] of REGLABLES) {
      const commune = a === "pause" && action === "pause";
      if ((j !== joueur || a !== action) && !commune) t[j][a] = t[j][a].filter(k => k !== touche);
    }
  }
  t[joueur][action] = [touche];
  enregistrer();
}

export function remettre() {
  actuelles = copie(TOUCHES_DEPART);
  enregistrer();
}

const NOMS = {
  " ": "barre d'espace", ArrowLeft: "flèche de gauche", ArrowRight: "flèche de droite",
  ArrowUp: "flèche du haut", ArrowDown: "flèche du bas", ShiftLeft: "Maj de gauche",
  ShiftRight: "Maj de droite", Shift: "Maj", Control: "Ctrl", Alt: "Alt", Meta: "Cmd",
  CapsLock: "Verr. maj.", Delete: "Suppr",
};
const COURTS = { " ": "espace", ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓" };

/** Le nom d'une touche dans une phrase : « flèche du bas », « barre d'espace », « touche Q ». */
export function nom_long(k) {
  if (!k) return "aucune touche";
  return NOMS[k] || "touche " + (k.length === 1 ? k.toUpperCase() : k);
}

/** Le nom court d'une touche : « ↓ », « espace », « Q ». */
export function nom_court(k) {
  if (!k) return "–";
  return COURTS[k] || NOMS[k] || (k.length === 1 ? k.toUpperCase() : k);
}

/** La touche d'une action pour un joueur, en toutes lettres. */
export function libelle(joueur, action) {
  return nom_long(touches()[joueur][action][0]);
}

/** La touche d'une action pour tous ceux qui jouent : « flèche du bas », ou à deux
 * « flèche du bas (ou touche S) ». */
export function libelle_pour(action, joueurs) {
  const a = libelle(0, action);
  return joueurs > 1 ? `${a} (ou ${libelle(1, action)})` : a;
}

/** Les touches d'un joueur en bref, pour un rappel : « ← → bouger, ↑ sauter, … ». */
export function resume(joueur) {
  const t = touches()[joueur];
  const c = a => nom_court(t[a][0]);
  return `${c("gauche")} ${c("droite")} bouger, ${c("saut")} sauter, ${c("action")} bonbon, ${c("coucou")} couteau`;
}

/** Toutes les touches utilisées (pour empêcher le navigateur de défiler, etc.). */
export function toutes() {
  return new Set(touches().flatMap(j => Object.values(j).flat()));
}
