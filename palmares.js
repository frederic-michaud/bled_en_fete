// Le tableau d'honneur (port de palmares.py) : tous les joueurs (seuls, à deux, parent et
// enfant), où ils en sont et leur meilleur temps. Chaque équipe : {mode, noms, ouvertes
// (salles atteintes, de 1 à 4), fini (le Bled entier est en fête), chrono (le temps passé
// dans les salles depuis qu'ils ont commencé, sans les pauses ni les voyages), meilleur
// (le meilleur temps, ou null)}. Pas de mot de passe : on choisit son nom.
// Dans le navigateur, c'est gardé dans localStorage.

export const CLE_WEB = "bled_en_fete_palmares";

function _lire_texte() {
  try {
    return localStorage.getItem(CLE_WEB) || "";
  } catch (e) {
    return "";   // stockage interdit (navigation privée…) : tableau vide
  }
}

export function lire() {
  let donnees;
  try {
    donnees = JSON.parse(_lire_texte());
  } catch (e) {
    return [];
  }
  if (Array.isArray(donnees)) {  // l'ancien tableau : seulement des réussites
    const equipes = new Map();
    for (const r of donnees) {
      const cle = JSON.stringify([r.mode, r.noms]);
      if (!equipes.has(cle) || r.temps < equipes.get(cle).meilleur) {
        equipes.set(cle, nouvelle(r.mode, r.noms, true, r.temps));
      }
    }
    return [...equipes.values()];
  }
  return (donnees && donnees.equipes) || [];
}

export function enregistrer(equipes) {
  const texte = JSON.stringify({ equipes }, null, 1);
  try {
    localStorage.setItem(CLE_WEB, texte);
  } catch (e) {
    // pas de stockage possible : tant pis, le tableau ne sera pas gardé
  }
}

export function nouvelle(mode, noms, fini = false, meilleur = null) {
  return { mode, noms: [...noms], ouvertes: fini ? 4 : 1, fini, chrono: 0.0, meilleur };
}

/** Les équipes d'une façon de jouer : d'abord celles qui ont un temps (la plus rapide
 * d'abord), puis les autres (les plus avancées d'abord). */
export function classement(equipes, mode) {
  const sans = e => e.meilleur === null || e.meilleur === undefined;
  return equipes.filter(e => e.mode === mode).sort((a, b) =>
    (sans(a) - sans(b)) || ((a.meilleur || 0) - (b.meilleur || 0)) || (b.ouvertes - a.ouvertes));
}

export function duree(secondes) {
  const total = Math.trunc(secondes);
  const m = Math.floor(total / 60), s = total % 60;
  return m ? `${m} min ${String(s).padStart(2, "0")} s` : `${s} s`;
}
