# Vampire en fête — jeu d'Halloween, un joueur à la manette

Un vampire redécore son château lugubre pour Halloween. Il traverse 4 salles et doit
transformer chaque créature ou objet effrayant en sa version fête ; plus la salle se
transforme, plus la lumière, la musique et le décor deviennent gais.

On parle français avec l'utilisateur, et le code (noms, commentaires) est en français.
Le jeu est pensé pour des joueurs qui ne connaissent pas les manettes : dans les textes,
on dit « la croix » et « le bouton du bas / de droite / du haut / de gauche », jamais
« Saut », « Action », « A », « X »… (voir `niveaux.BOUTONS`).

## Lancer, vérifier
- Python 3.14 (Homebrew) + **pygame-ce 2.5.8** (pas pygame classique) dans `.venv`.
- Jouer : double-clic sur « Lancer le jeu.command », ou `.venv/bin/python jeu.py`.
- Vérifier après chaque changement : `.venv/bin/python verifier.py` (sans écran ni son ;
  salles, corbeau attrapable, règles des créatures, enchaînement des écrans, vitesse).
- Pour voir un écran sans fenêtre : `SDL_VIDEODRIVER=dummy SDL_AUDIODRIVER=dummy`, puis
  `Jeu().image(commande)` image par image et `pygame.image.save(jeu.ecran, ...)`.
- Touches : F plein écran, M musique, C (à l'accueil) réglage des manettes, Échap
  accueil / quitter, R recommencer la salle.

## Règles du jeu (choisies avec l'utilisateur)
- La croix pour bouger. Bouton du bas : sauter. Bouton de droite : lancer un bonbon (il
  file vers la créature la plus proche devant). Bouton du haut : le couteau (seulement
  à côté d'une courge). Bouton de gauche : pause.
- Une méthode par créature (`niveaux.GENRES`) : courge = couteau (ni saut ni bonbon) ;
  squelette = deux sauts (il tombe 4 s en tas d'os, puis se relève), pas de bonbon ;
  fantôme = seulement un bonbon (on passe à travers : « Bouh ! ») ; chauve-souris = un
  saut ; toile d'araignée et chandelier = les toucher. Toucher de côté une créature
  méchante : « Bouh ! », le vampire recule. **Pas de vies ni de cœurs** (refusé).
- Bonbons : 3 en poche au départ (5 au plus) ; on en ramasse dans la salle, ils
  repoussent 20 s plus tard.
- Le corbeau grognon (à partir de la salle 2) défait les décorations l'une après l'autre
  et ne part jamais tout seul : il faut le toucher, de n'importe quel côté (même par en
  dessous). Les bonbons ne lui font rien. Il est lent exprès.
- En haut à gauche : les bonbons en poche et un compteur « transformées / total ». Pas
  d'autre jauge (la lumière, la musique et le décor montrent la progression).
- Le haut de chaque salle (les 2 premières rangées, `PLAFOND`) est une frise décorative
  où il ne se passe rien : la poche, le compteur et les conseils s'y affichent.

## Fichiers
- `jeu.py` : la classe `Jeu` (fenêtre, boucle à 60 images/s, écrans). États :
  « titre » (accueil : le vampire arrive au château), « voyage » (on recule jusqu'à la
  fenêtre de la salle finie, qui continue sa fête ; le vampire vole à la suivante ; on
  plonge dedans), « jeu », « fin » (château tout en fête, feux d'artifice). Les salles
  finies restent vivantes (`Jeu.salles`) et s'affichent dans leur fenêtre.
- `partie.py` : une salle. `Partie` (grille, choses, bonbons, corbeau, dessin avec la
  lumière qui change avec la fête), `Vampire`, `Chose` (créature ou objet),
  `BonbonLance`, `Corbeau`, et le décor (mur du fond, frise, tuiles, voiles de nuit).
  Les réglages du jeu (saut, vitesses, durées) sont en haut du fichier.
- `niveaux.py` : **les données** : `NIVEAUX` (les 4 salles : plan, bonbons, corbeau,
  conseils), `GENRES`, `BOUTONS`. Ajouter une salle = l'ajouter ici + une fenêtre dans
  `dehors.FENETRES`.
- `dehors.py` : le château vu de dehors (`Dehors`, `FENETRES`), le zoom et le vol.
- `animations.py` : **tous les dessins**, en SVG fabriqués par le programme, une image
  par instant (pygame n'anime pas les SVG). `ANIMES` : nom → (fabrique, images par
  cycle, cycles par seconde). Il n'y a aucun fichier image.
- `outils.py` : écran (`L`, `H`, `ZOOM`, `T`, `DT`), couleurs, `dessin` (comme
  pygame.draw mais en coordonnées du jeu), `ecrire`, `image("nom@k")`, `anime(nom, t)`,
  `poser`, et `TAILLES` (taille d'affichage de chaque dessin).
- `musique.py` : 4 ambiances (lugubre, mystère, gai, fête), même tempo et même longueur,
  qui jouent toutes en même temps ; on passe de l'une à l'autre par fondu.
- `sons.py` : les bruitages (fabriqués, pas de fichiers son).
- `manettes.py` + `manettes.json` : voir plus bas. `verifier.py` : les vérifications.

## Technique à garder
- Écran pensé en 1280×720, dessiné `ZOOM`=2 fois plus fin (Retina) sur une Surface,
  affichée par `pygame.Window(resizable, allow_high_dpi)` + `video.Renderer(vsync)` +
  `Texture(streaming=True)`. Si l'écran n'existe pas, le jeu tourne quand même.
- Manettes : `os.environ["SDL_JOYSTICK_MFI"]="0"` **avant** `import pygame` (sinon la
  Logitech Precision est invisible) : toujours importer `manettes` avant `pygame`.
  Toutes les manettes branchées pilotent le vampire, le clavier marche aussi.
  `manettes.json` (clé = GUID) garde les réglages faits avec la touche C ; sinon les
  boutons sont devinés d'après leur place. Manettes de l'utilisateur : « PS3/USB Corded
  Gamepad » (Logitech ChillStream), « Logitech Precision Gamepad », « 8BitDo Ultimate 2C ».
- Vitesse : rester sous 16 ms par image (`verifier.py` le mesure). Ce qui coûte : les
  grandes surfaces transparentes. On évite de dessiner ce qui est caché.

## Règles de construction des salles
- Grille de 18 rangées de 40 px ; rangées 0-1 = frise, 17 = sol. Lettres du plan : voir
  `niveaux.py`.
- Les plateformes se suivent tous les 3 rangs au plus (saut ≈ 3 tuiles), avec 2 ou 3
  colonnes d'écart au plus.
- Le corbeau doit toujours être attrapable : sous chaque décoration, une plateforme d'où
  un saut le touche quand il s'y pose (il ne se pose pas plus haut que `CORBEAU_PERCHE`).
  `verifier.py` le contrôle.
