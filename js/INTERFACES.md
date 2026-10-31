# Halloween au Bled en JavaScript : le contrat entre les fichiers

Port fidèle de la version Python (les fichiers `*.py` à la racine de ce dépôt sont la
référence : même jeu, mêmes règles, mêmes dessins, mêmes textes). JavaScript simple,
modules ES (`import`/`export`), canvas 2D, Web Audio, **aucune bibliothèque, aucune
compilation** : `index.html` charge `main.js`, c'est tout.

## Conventions

- **Mêmes noms qu'en Python** (en français, snake_case : `dessiner_meuble`, `fete_vue`…),
  mêmes commentaires utiles (en français). Les classes gardent leur nom (`Partie`, `Chose`…).
- Couleurs : tableaux `[r, g, b]` ; tuples → tableaux ; `range` → `range()` de `outils.js`.
- Une `pygame.Surface` devient une **toile** : `{ canvas, ctx, w, h }` faite par
  `toile(w, h)`. Son `ctx` est déjà agrandi : on dessine **toujours en points du jeu**
  (écran 1280 x 720), jamais en vrais pixels. On colle une toile avec
  `coller(ctx, toile, x, y, alpha)` (alpha de 0 à 1).
- `dessin.rect/circle/ellipse/line/polygon(ctx, couleur, …)` : mêmes paramètres que dans
  le Python (`outils.dessin`), mais **déjà en points du jeu** : là où le Python passait par
  `_z(...)` ou `* ZOOM`, on enlève simplement le facteur.
- `set_alpha(a)` → `coller(..., a / 255)` ou `ctx.globalAlpha` ;
  `BLEND_RGB_ADD` → `ctx.globalCompositeOperation = "lighter"` ;
  `BLEND_RGB_MULT` → `"multiply"` (toujours remettre `"source-over"` après).
- `pygame.Rect`/`FRect` → `Rect` de `outils.js` (`x, y, w, h, right, bottom, centerx,
  centery, top, inflate(), colliderect(), collidepoint()`).
- `random.Random(graine)` → `hasard(graine)` ; le module `random` → `aleatoire`.
- Le temps : 60 images par seconde, `DT = 1/60`, comme en Python (la boucle de `main.js`
  appelle `Jeu.avancer(ecoule)`).
- On joue **au clavier** (public visé), la manette marche aussi. Textes : version
  « web » du Python (`niveaux.WEB` vrai) : « barre d'espace », « touche X »…

## Les fichiers et ce qu'ils exportent

### `outils.js` (fait) — voir le fichier
`L, H, DT, T, ECHELLE, BLANC, NOIR, OR, ORANGE, VIOLET, ROSE, VERT, FESTIF, TAILLES, css,
melange, toile, coller, degrade, dessin, police, largeur_texte, ecrire(ctx, msg, taille,
couleur, {centre:[x,y]} | {gauche:[x,y]}, ombre?), envelopper(ctx, texte, taille, largeur),
preparer_images (async), image(nom, gauche) → toile, anime(nom, t), poser(ctx, nom, cx, cy,
{gauche, angle, echelle, alpha}), hasard(graine), aleatoire, range, arrondi, Rect`.

### `commandes.js` (fait)
`ACTIONS, Commande, ensemble(commandes)`.

### `animations.js` — agent « dessins »
Port de `animations.py` : chaque fabrique renvoie une chaîne SVG (identique au Python).
Export : `ANIMES = { nom: [fabrique(phase), images_par_cycle, cycles_par_seconde] }`
(mêmes noms, mêmes nombres), plus les fonctions de dessin elles-mêmes si utile.

### `decors.js` — agent « décors »
Port de `decors.py`. Exports : `MOTIF, HAUT_FRISE, DECORS, MELEZE, RIDEAU, CIEL_NUIT,
CIEL_FETE, citrouille(ctx, x, y, r, allumee), montagnes(ctx, sommets, bas, fete,
decalage=0), fanions(...), guirlande_lumineuse(...), decor(nom)` → `[[mur_lugubre,
mur_fete], [frise_lugubre, frise_fete], [plein, planche]]` (des toiles, faites une fois
puis gardées), `dessiner_meuble(nom, ctx, x0, x1, y, sols, fete)`,
`animer(nom, ctx, x0, t, f)`.

### `dehors.js` — agent « décors »
Port de `dehors.py`. Exports : `GRAND, CENTRE, agrandi(x, y) → [x, y], rect_agrandi(r)`,
`FENETRES_BASE, FENETRES` (des `Rect`, une par salle), `CAVE, ARRIVEE, SORTIE, VOL, ENTREE,
bezier(a, b, u, hauteur=130), doux(u), zoomer(ctx, apercu, depart, arrivee, u)`
(`apercu` : une toile 1280 x 720 ; `depart`/`arrivee` : `[x, y, w, h]`),
`vignette(source, r, sombre) → toile` (l'écran d'une salle réduit à la fenêtre `r`),
`class Dehors` (`REZ, ETAGE, BASSE, HAUTE`, `dessiner(ctx, t, vignettes, allumees,
cible=null)` où `vignettes` est un objet `{i: toile}` et `allumees` un `Set` d'indices).
Garder les optimisations du Python : `composer(fete)` (décor fixe en une image),
étoiles seulement dans le ciel.

### `niveaux.js` et `partie.js` — agent « salles »
`niveaux.js` : port de `niveaux.py` en version web (clavier). Exports : `BOUTONS, CROIX,
le(nom), MODES, RANGS, NIVEAUX, GENRES, PAS_DE_BONBON, AU_SOL`.
`partie.js` : port de `partie.py`. Exports : les constantes (`GRAVITE, SAUT, VITESSE,
CORBEAU_PERCHE, PLAFOND, HAUT_FRISE, ECART_MAX, LAISSE, LAISSE_MAX, PERSONNAGES`…),
`class Partie(i_niveau, son = nom => {}, mode = "solo")` avec `maj(cmds)` (une `Commande`
ou un tableau, une par joueur), `dessiner(ctx, apercu = false)`, `fete()`, `lancer_bonbon(v)`,
et les attributs du Python (`vampires, vampire, choses, gagne_t, fete_vue, i_niveau,
niveau, camera, t, messages, particules, poche, corbeau…`) ; `Chose`, `Vampire`,
`Corbeau`, `BonbonLance`. La nuit : une seule image multipliée (`ombre(f)`), comme en Python.

### `jeu.js`, `entrees.js`, `palmares.js`, `main.js`, `index.html` — agent « écrans »
`jeu.js` : port de `jeu.py` (`class Jeu`, tous les écrans : honneur, nom, confirmer,
titre, voyage, jeu, fin ; `avancer(ecoule)`, `image(cmds = null, dessiner = true)`,
`dessiner()`). Pas de réglage des manettes (touche C) ni de « quitter ».
`entrees.js` : clavier (mêmes touches que `manettes.CLAVIER_DUO`, désignées par la
lettre écrite dessus : `event.key`) + manettes du navigateur (Gamepad API, disposition
standard : bouton 0 = bas = saut, 1 = droite = bonbon, 3 = haut = couteau, 2 ou 9 = pause,
croix 12-15, joystick). `class Entrees` avec `lire(joueurs = 1, clavier = true) →
[Commande]`, `nom(joueur)`, et la liste des touches tapées (pour écrire son nom).
`palmares.js` : port de `palmares.py` (gardé dans `localStorage`, clé
`bled_en_fete_palmares`). `main.js` : charge tout (`await preparer_images()`, un petit
écran « chargement »), crée le `Jeu`, boucle `requestAnimationFrame` → `jeu.avancer()`,
débloque le son au premier clic ou à la première touche, F = plein écran, adapte le
canvas à la fenêtre (proportions gardées). Expose `window.jeu` (pour les essais).

### `sons.js`, `musique.js` — agent « sons »
Port de `sons.py` et `musique.py` avec Web Audio (mêmes sons fabriqués par calcul, même
musique : 4 ambiances de même tempo qui jouent ensemble, fondu de l'une à l'autre).
Exports : `debloquer_audio()` (à appeler au premier geste de l'utilisateur),
`creer_sons() → { nom: { play() } }` (mêmes noms : fusee, detonation, saut, clic, magie,
sort, bouh, croa, bonbon, vide, crac, couteau, tchac, bravo…), `class Musique`
(`active`, `maj(ambiance, dt)`), `ambiance_de(fete)`, `LUGUBRE, MYSTERE, GAI, FETE`.
