# Halloween au Bled — jeu d'Halloween à la manette, seul ou à deux

**Version JavaScript** (branche `js`, dossier `js/`) : le même jeu réécrit en JavaScript
simple (modules ES, canvas 2D, Web Audio, aucune bibliothèque ni compilation), pour le web :
chargement immédiat, haute définition, 60 images/s. C'est un port fidèle des fichiers
Python (mêmes noms, mêmes règles : la logique des salles donne les mêmes trajectoires) ;
`js/INTERFACES.md` décrit le rôle de chaque fichier et les conventions (toiles, points du
jeu). Essayer : `python3 -m http.server` à la racine puis `http://localhost:8000/js/`.
`js/publier.sh` la publie sur GitHub Pages, à la racine du site
(https://frederic-michaud.github.io/bled_en_fete/) ; l'ancienne version Python pour le web
est à `…/ancienne-version-python-pygbag/` (étiquette `archive/web-pygbag`, branche `web`).
Clavier (suisse, QWERTZ ; `js/touches.js`) : seul ou joueur 1 : ← → bouger, ↑ sauter,
↓ couteau, espace bonbon, P pause ; joueur 2 : A D, W, S couteau, Q bonbon, P. Réglables
depuis le tableau d'honneur (touche T), gardées dans le navigateur. Les textes des salles
nomment les touches réglées (`touches.libelle`). Les menus ont des touches fixes : flèches,
espace ou Entrée, Échap. Pas de touche R (trop facile de recommencer par erreur). Les essais automatiques
(Playwright, comparaisons avec le Python) vont dans `js/essais/`, ignoré par git.

**Version web** (branche `web`) : le même jeu dans un navigateur, avec pygbag (Python en
WebAssembly). `./construire_web.sh` copie les fichiers du jeu dans `site/` (pas dans git),
fait aussi chaque image en PNG (si le navigateur ne lit pas les SVG) et fabrique
`site/bled_en_fete/build/web` (index.html + archives) ; `./publier_web.sh` le publie sur `gh-pages`
(GitHub Pages). Dans le navigateur (`outils.WEB`) : `main.py` lance la boucle (qui rend la
main au navigateur à chaque image), simple définition, affichage par `display.set_mode`,
tableau d'honneur gardé dans le navigateur (localStorage), pas de « quitter » ni de réglage
des manettes. Le public visé joue au clavier : les textes nomment les touches
(`niveaux.BOUTONS`, `CROIX`, `le()`) ; seul : flèches, espace, X bonbon, C couteau, P pause ;
à deux : joueur 1 à gauche (Q/A D, espace, X, C), joueur 2 à droite (flèches, ↑, K, L).
Le jeu avance selon le temps réel (`Jeu.avancer`) : s'il rame, il saute des images au lieu
de ralentir. Pour aller vite : textes gardés (`outils.ecrire`), décor du Bled composé en
une image (`Dehors.composer`), fond des menus figé (`Jeu.fond_menu`).
Sur ordinateur, à la manette, rien ne change.

**Variante « Bled »** (branche `bled`) : au lieu d'un château anonyme, le Bled, la
coopérative d'habitants des Plaines-du-Loup à Lausanne où vit l'utilisateur (projet de
TRIBU architecture). Vu de la cour la nuit (`dehors.py`), avec 4 salles de bas en haut :
la Bricotine (atelier du sous-sol + vélostation), le foyer (rez, mélèze, bar, vitres sur
la cour, inventé), la Tanière (salle polyvalente : noire, écran, gradins, projecteurs),
la terrasse du 5e (dehors : pergola, potager, lac et Alpes). Les décors sont dans
`decors.py` (un mur, une frise et des tuiles par salle, lugubres et en fête). Chaque salle a
aussi ses lampes à allumer (`NIVEAUX[i]["objets"]` : néon, suspension, projecteur, lampion,
à la place du chandelier) et un plan qui rappelle le lieu (établi, comptoir du bar, gradins
et estrade, bacs du potager). La lettre `=` du plan est un meuble sur lequel on monte (comme une
planche) : établi à la Bricotine, table, pergola sur la terrasse (dessiné par
`decors.dessiner_meuble`, avec ses pieds jusqu'au sol) ; une lampe pend du meuble ou du
plafond juste au-dessus d'elle (`Chose.accroche`).

Déroulement de la variante (`jeu.py`) : au lancement, le **tableau d'honneur** (une colonne
par façon de jouer : « + Nouveau » puis chaque équipe, avec son meilleur temps ou la salle
où elle en est). On crée une équipe (noms) ou on en choisit une, sans mot de passe. Une
équipe en cours reprend avec exactement ses salles atteintes (déjà en fête dans le Bled) ;
une équipe qui a fini doit confirmer pour recommencer à la salle 1 (son meilleur temps
reste). Puis le Bled, avec ses 1 ou 2 personnages dans la cour ; Échap ou bouton de gauche :
retour au tableau. Après le feu d'artifice final : retour au tableau. `palmares.json`
garde les équipes (`palmares.py` : ouvertes, chrono, fini, meilleur) ; il est enregistré
à chaque salle finie, au retour au tableau et en quittant. Les photos
du site ont servi de modèle seulement : aucune image n'est copiée dans le jeu.

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
- Le jeu démarre en plein écran. Touches : F plein écran / fenêtre, M musique, C (à l'accueil) réglage des manettes, Échap
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
- Trois façons de jouer (`niveaux.MODES`, `partie.PERSONNAGES`). On choisit le mode puis
  chacun écrit son nom (clavier à l'écran, à la manette, ou au vrai clavier) **une seule
  fois**, au premier départ depuis l'accueil ; ensuite l'accueil les rappelle et le bouton
  de droite permet d'en changer (`Jeu.pret`) :
  - **Seul** : le vampire.
  - **À deux** (« duo ») : le vampire et la vampirette, mêmes pouvoirs. La caméra est entre
    les deux ; on ne peut pas s'éloigner au point que l'autre sorte de l'écran (`ECART_MAX`).
  - **Parent et enfant** (« parent ») : la caméra suit le parent ; le petit vampire est
    ramené par une laisse magique élastique et discrète (`LAISSE`, `ELASTIQUE`) et, s'il est coincé ou trop loin, il
    s'envole à travers tout jusqu'au parent. Il a sinon les mêmes pouvoirs.
  À deux, la manette 1 est au joueur 1, la manette 2 au joueur 2 ; s'il en manque une, le
  clavier est partagé (flèches/P/O et ZQSD/espace/E/X). Bonbons en poche : communs.
- Tableau d'honneur (`palmares.py`, fichier `palmares.json`, pas dans git) : ceux qui ont
  fini les 4 salles en partant de la salle 1 sans repasser par l'accueil, avec leur temps
  total (temps dans les salles, sans pauses ni voyages), classés par façon de jouer. Le
  chrono s'affiche en haut à droite de la frise. À l'accueil, bouton du haut : le tableau.
- À l'accueil, la croix ne choisit que parmi les salles déjà atteintes (`Jeu.ouvertes`,
  oublié quand on quitte le jeu) : la salle suivante s'ouvre quand on finit une salle.
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
  « titre » (accueil : le vampire arrive au château), « mode », « nom » (clavier à l'écran,
  `GRILLE`), « honneur » (tableau d'honneur), « voyage » (on recule jusqu'à la
  fenêtre de la salle finie, qui continue sa fête ; le vampire vole à la suivante ; on
  plonge dedans), « jeu », « fin » (château tout en fête, feux d'artifice). Les salles
  finies restent vivantes (`Jeu.salles`) et s'affichent dans leur fenêtre.
- `partie.py` : une salle. `Partie(i, son, mode)` : `vampires` (1 ou 2 ; `vampire` = le
  premier, que suivent la caméra et le corbeau), grille, choses, bonbons, corbeau, laisse,
  dessin avec la
  lumière qui change avec la fête), `Vampire`, `Chose` (créature ou objet),
  `BonbonLance`, `Corbeau`, et le décor (mur du fond, frise, tuiles, voiles de nuit).
  Les réglages du jeu (saut, vitesses, durées) sont en haut du fichier.
- `niveaux.py` : **les données** : `NIVEAUX` (les 4 salles : plan, bonbons, corbeau,
  conseils), `GENRES`, `BOUTONS`. Ajouter une salle = l'ajouter ici + une fenêtre dans
  `dehors.FENETRES`.
- `dehors.py` : le Bled vu de la cour (`Dehors`, `FENETRES`), le zoom et le vol.
- `decors.py` : le décor de chaque salle (`decor(nom)`, nom = `niveaux.NIVEAUX[i]["decor"]`).
- `animations.py` : **tous les dessins**, en SVG fabriqués par le programme, une image
  par instant (pygame n'anime pas les SVG). `ANIMES` : nom → (fabrique, images par
  cycle, cycles par seconde). Il n'y a aucun fichier image.
- `outils.py` : écran (`L`, `H`, `ZOOM`, `T`, `DT`), couleurs, `dessin` (comme
  pygame.draw mais en coordonnées du jeu), `ecrire`, `image("nom@k")`, `anime(nom, t)`,
  `poser`, et `TAILLES` (taille d'affichage de chaque dessin).
- `musique.py` : 4 ambiances (lugubre, mystère, gai, fête), même tempo et même longueur,
  qui jouent toutes en même temps ; on passe de l'une à l'autre par fondu.
- `sons.py` : les bruitages (fabriqués, pas de fichiers son).
- `palmares.py` : le tableau d'honneur.
- `manettes.py` + `manettes.json` : voir plus bas. `Entrees.lire(joueurs)` rend une
  `Commande` par joueur ; `ensemble()` les fusionne pour les menus. `verifier.py` : les vérifications.

## Technique à garder
- Écran pensé en 1280×720, dessiné `ZOOM` fois plus fin sur une Surface (2 sur un écran
  Retina, 1 sinon, choisi au lancement par `outils._zoom_ecran` ; `JEU_ZOOM=1` le force),
  affichée par `pygame.Window(resizable, allow_high_dpi)` + `video.Renderer(vsync)` +
  `Texture(streaming=True)`. Si l'écran n'existe pas, le jeu tourne quand même.
- Manettes : `os.environ["SDL_JOYSTICK_MFI"]="0"` **avant** `import pygame` (sinon la
  Logitech Precision est invisible) : toujours importer `manettes` avant `pygame`.
  Seul, toutes les manettes branchées pilotent le vampire ; le clavier marche aussi.
  `manettes.json` (clé = GUID) garde les réglages faits avec la touche C ; sinon les
  boutons sont devinés d'après leur place. Pour se déplacer, la croix et le joystick marchent
  toujours tous les deux (`manettes.fusionner`), même après un réglage. Manettes de l'utilisateur : « PS3/USB Corded
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
