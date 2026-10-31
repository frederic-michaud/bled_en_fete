// Les salles du Bled et ce qui s'y cache (port de niveaux.py, version web : on joue au
// clavier). C'est ici qu'on change ou qu'on ajoute une salle (et alors une fenêtre dans
// dehors.FENETRES).

// Dans le navigateur, on joue au clavier : on nomme les touches (voir manettes.CLAVIER_DUO).
export const WEB = true;
export const BOUTONS = { saut: "barre d'espace", action: "touche X", coucou: "touche C", pause: "touche P" };
export const CROIX = "les flèches";

/** « le bouton du bas », « la barre d'espace », « la touche X ». */
export function le(nom) {
  return (["barre", "touche"].includes(nom.split(" ")[0]) ? "la " : "le ") + nom;
}

/** Comme str.capitalize() de Python, mais sans mettre le reste en minuscules
 * (« Touche X » et non « Touche x »). */
export function majuscule(texte) {
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

// Les façons de jouer : [nom dans le code, nom affiché, explication].
export const MODES = [
  ["solo", "Seul", "Un vampire, un joueur."],
  ["duo", "À deux", "Deux vampires, les mêmes pouvoirs. Restez ensemble : "
    + "personne ne peut sortir de l'écran !"],
  ["parent", "Parent et enfant", "Le parent mène la danse. Le petit vampire le suit "
    + "au bout de sa laisse magique."],
];

// ---- Les salles du Bled (de la cave au toit) ----
// Le plafond (rangées 0 et 1 : la frise, où il ne se passe rien), le sol (rangée 17) et
// les murs des deux bouts sont mis tout seuls.
// Chaque élément du plan : [rangée, colonne, contenu], une lettre par tuile.
//   #  pierre      -  planche (on la traverse par-dessous)      =  meuble (pareil, mais dessiné selon la salle : établi, table, pergola)      V  départ du vampire
//   c  courge      s  squelette     f  fantôme      b  chauve-souris
//   t  toile d'araignée              l  lampe (selon la salle)      o  bonbon à ramasser
// Pour chaque salle : nom, décor (voir decors.js), objets (les lampes de la salle), largeur
// (colonnes), plan, bonbons en poche au départ, corbeau ([premier passage, [attente entre
// deux passages], vitesse] ; null : pas de corbeau) et aides ([colonne à partir de laquelle
// on affiche le conseil, conseil]).
export const RANGS = 18;
export const NIVEAUX = [
  {
    nom: "La Bricotine", decor: "bricotine",
    objets: { l: ["neon_eteint", "neon_allume"] }, cols: 48, poche: 3, corbeau: null,
    plan: [
      [16, 3, "V"], [16, 8, "c"], [13, 14, "l"], [14, 20, "b"], [16, 23, "o"],
      [15, 11, "====="], [15, 24, "====="],               // deux établis (on monte dessus)
      [12, 16, "----"], [9, 19, "----"], [5, 21, "l"],     // des étagères jusqu'à un néon
      [8, 36, "-----"], [4, 38, "l"],                      // et un autre, tout en haut
      [13, 28, "f"], [14, 31, "-----"], [11, 36, "-----"], [8, 41, "t"], [10, 37, "o"],
      [15, 34, "#"], [16, 34, "#"], [16, 41, "s"], [16, 45, "o"],
    ],
    aides: [[1, `Va à côté de la courge, puis ${BOUTONS.coucou} : le couteau !`],
      [11, "Touche le néon pour l'allumer"],
      [17, `Saute sur la chauve-souris (${BOUTONS.saut}) !`],
      [22, `Ramasse le bonbon, puis ${BOUTONS.action} pour le lancer`],
      [25, `Le fantôme n'a peur que des bonbons : ${BOUTONS.action} !`],
      [31, "Grimpe et touche la toile d'araignée"],
      [38, "Le squelette : saute-lui dessus deux fois ! Les bonbons ne marchent pas"]],
  },
  {
    nom: "Le foyer", decor: "foyer",
    objets: { l: ["suspension_eteinte", "suspension_allumee"] }, cols: 64, poche: 3, corbeau: [30.0, [20.0, 28.0], 90.0],
    plan: [
      [16, 3, "V"],
      [15, 18, "#"], [16, 18, "#"], [15, 48, "#"], [16, 48, "#"],
      [15, 30, "######"], [16, 30, "######"],             // le comptoir du bar
      [14, 12, "-----"], [13, 37, "-----"], [14, 52, "-----"],
      [11, 18, "------"], [11, 40, "------"],
      [8, 12, "-----"], [8, 26, "------"], [8, 38, "---"], [8, 44, "------"], [8, 56, "------"],
      [5, 5, "-------"], [5, 22, "-------"], [5, 50, "------"],
      [16, 10, "c"], [16, 44, "c"],
      [16, 24, "s"], [16, 56, "s"],
      [12, 30, "f"], [9, 50, "f"],
      [13, 15, "b"], [6, 40, "b"],
      [2, 8, "t"], [2, 53, "t"],
      [3, 25, "l"],
      [16, 6, "o"], [10, 20, "o"], [7, 36, "o"], [13, 54, "o"], [16, 61, "o"],
    ],
    aides: [[1, "Plusieurs créatures de chaque sorte : transforme-les toutes !"],
      [9, ""],
      [20, "Un corbeau grognon viendra défaire tes décorations : touche-le pour le chasser"],
      [30, ""]],
  },
  {
    nom: "La Tanière", decor: "taniere",
    objets: { l: ["projecteur_eteint", "projecteur_allume"] }, cols: 80, poche: 3, corbeau: [20.0, [14.0, 22.0], 110.0],
    plan: [
      [2, 2, "t"], [2, 37, "t"], [2, 77, "t"],
      [3, 32, "l"], [3, 55, "l"], [3, 66, "l"],
      [4, 42, "b"], [3, 61, "b"], [7, 12, "b"],
      [5, 30, "-----"], [5, 52, "------"],
      [8, 2, "-----"], [8, 24, "------"], [8, 36, "-------"], [8, 44, "------"], [8, 62, "-----"],
      [8, 69, "----------"],
      [11, 8, "-----"], [11, 18, "------"], [11, 36, "------"], [11, 54, "------"], [11, 70, "------"],
      [16, 1, "########"], [15, 1, "######"], [14, 1, "####"], [13, 1, "##"],  // les gradins
      [15, 38, "===="],                                    // une table
      [16, 66, "##########"],                              // l'estrade
      [14, 30, "------"], [14, 46, "-----"], [14, 62, "------"],
      [12, 27, "f"], [9, 50, "f"], [6, 71, "f"],
      [15, 28, "#"], [16, 28, "#"], [15, 48, "#"], [16, 48, "#"], [15, 64, "#"], [16, 64, "#"],
      [13, 15, "o"], [13, 32, "o"], [10, 38, "o"], [7, 46, "o"], [4, 54, "o"], [10, 72, "o"],
      [16, 60, "o"], [12, 1, "o"],
      [16, 10, "V"], [16, 14, "c"], [16, 22, "s"], [14, 40, "c"], [16, 55, "s"], [15, 72, "c"],
    ],
    aides: [],
  },
  {
    nom: "La terrasse du 5e", decor: "terrasse",
    objets: { l: ["lampion_eteint", "lampion_allume"] }, cols: 96, poche: 2, corbeau: [12.0, [9.0, 15.0], 140.0],
    plan: [
      [15, 22, "###"], [16, 22, "###"],                    // les bacs du potager
      [14, 47, "###"], [15, 47, "###"], [16, 47, "###"],
      [15, 70, "###"], [16, 70, "###"],
      [14, 8, "-----"], [14, 30, "-----"], [14, 44, "---"], [14, 56, "-----"], [14, 78, "-----"],
      [11, 14, "------"], [11, 36, "------"], [11, 50, "------"], [11, 64, "------"], [11, 86, "------"],
      [8, 8, "-----"], [8, 20, "------"], [8, 42, "------"], [8, 58, "------"], [8, 65, "----"],
      [8, 74, "------"], [8, 88, "-----"],
      [5, 28, "------"], [5, 52, "------"], [5, 82, "------"],
      [16, 3, "V"],
      [16, 12, "c"], [16, 40, "c"], [16, 84, "c"],
      [16, 18, "s"], [16, 60, "s"], [16, 90, "s"],
      [12, 27, "f"], [9, 52, "f"], [6, 66, "f"], [12, 80, "f"],
      [4, 20, "b"], [3, 44, "b"], [7, 70, "b"], [3, 90, "b"],
      [2, 10, "t"], [2, 47, "t"], [2, 76, "t"],
      [12, 1, "======"], [12, 24, "======"], [12, 70, "======="],   // la pergola (on y grimpe)
      [14, 3, "l"], [14, 27, "l"], [14, 74, "l"],          // les lampions, accrochés dessous
      [13, 10, "o"], [10, 38, "o"], [7, 45, "o"], [16, 66, "o"], [4, 30, "o"], [10, 88, "o"],
    ],
    aides: [],
  },
];

// Ce qui se cache au Bled : [image effrayante, image de fête, règle, message].
// Règles : « couteau » = se mettre à côté et sortir le couteau (touche C) ;
// « touche » = il suffit de la toucher ; « mechant » = lui sauter dessus, mais le
// toucher de côté fait « Bouh ! » (le squelette : deux fois, il tombe d'abord en tas
// d'os) ; « bonbon » = seul un bonbon lancé marche, on passe à travers et ça fait
// « Bouh ! ». Un bonbon lancé (touche X) transforme tout sauf PAS_DE_BONBON.
export const GENRES = {
  c: ["courge", "soupe", "couteau", "Miam, de la soupe !"],
  s: ["squelette", "squelette_danse", "mechant", "Ça danse !"],
  f: ["fantome_peur", "fantome_gentil", "bonbon", "Il est tout gentil !"],
  b: ["chauve_souris", "ballon", "mechant", "Un ballon !"],
  t: ["toile", "guirlande", "touche", "Une guirlande !"],
  l: ["chandelier_eteint", "chandelier_allume", "touche", "De la lumière !"],
};
export const PAS_DE_BONBON = { c: "Il faut un couteau !", s: "Il n'aime pas les bonbons !" };
export const AU_SOL = "cs";             // posés sur le sol (les autres flottent ou pendent)
