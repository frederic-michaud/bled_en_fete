// Ce que fait un joueur pendant une image (port de manettes.Commande et manettes.ensemble).
// Pour chaque action : c.saut (le bouton est tenu) et c.saut_presse (il vient d'être appuyé).

export const ACTIONS = ["gauche", "droite", "haut", "bas", "saut", "action", "coucou", "pause"];

export class Commande {
  constructor() {
    for (const a of ACTIONS) {
      this[a] = false;
      this[a + "_presse"] = false;
    }
  }
}

/** Une Commande où chaque bouton est appuyé si un des joueurs l'appuie (pour les menus). */
export function ensemble(commandes) {
  const c = new Commande();
  for (const a of ACTIONS) {
    for (const nom of [a, a + "_presse"]) c[nom] = commandes.some(x => x[nom]);
  }
  return c;
}
