// Le lancement dans le navigateur (port de main.py) : on prépare les images (avec un petit
// écran « Chargement… »), on crée le Jeu, puis à chaque image du navigateur on fait avancer
// le jeu du temps réellement écoulé (il saute des images au lieu de ralentir s'il rame).
import { BLANC, ECHELLE, H, L, OR, css, ecrire, preparer_images } from "./outils.js";
import { debloquer_audio } from "./sons.js";
import { Jeu } from "./jeu.js";

const canvas = document.getElementById("ecran");
canvas.width = L * ECHELLE;
canvas.height = H * ECHELLE;
const ctx = canvas.getContext("2d");
ctx.setTransform(ECHELLE, 0, 0, ECHELLE, 0, 0);

/** Le petit écran d'attente, avec une barre qui avance. */
function chargement(progres, message = "Chargement…") {
  ctx.fillStyle = css([8, 6, 20]);
  ctx.fillRect(0, 0, L, H);
  ecrire(ctx, "Halloween au Bled", 100, [255, 138, 30], { centre: [L / 2, 280] });
  ecrire(ctx, message, 40, BLANC, { centre: [L / 2, 380] });
  ctx.fillStyle = css([40, 32, 60]);
  ctx.fillRect(L / 2 - 200, 430, 400, 16);
  ctx.fillStyle = css(OR);
  ctx.fillRect(L / 2 - 200, 430, 400 * progres, 16);
}

// Le son ne peut démarrer qu'après un geste de l'utilisateur (clic ou touche).
function debloquer() {
  try {
    debloquer_audio();
  } catch (e) {
    console.warn("son :", e);
  }
}
for (const type of ["keydown", "pointerdown", "touchstart"]) {
  window.addEventListener(type, debloquer, { once: true });
}

async function lancer() {
  chargement(0);
  await preparer_images(p => chargement(p));
  chargement(1, "Presque prêt…");
  await new Promise(r => setTimeout(r, 0));  // le temps d'afficher le message
  const jeu = new Jeu(canvas);
  window.jeu = jeu;  // pour les essais automatiques

  let avant = performance.now();
  let n = 0, debut = avant, calcul = 0;
  function image(maintenant) {
    const t = performance.now();
    jeu.avancer(Math.max(0, (maintenant - avant) / 1000));
    avant = maintenant;
    calcul += performance.now() - t;
    n += 1;
    if (maintenant - debut > 3000) {  // toutes les 3 s, dans la console du navigateur
      const duree = (maintenant - debut) / 1000;
      console.log(`${(n / duree).toFixed(0)} images/s, ${(calcul / n).toFixed(1)} ms de calcul par image (${jeu.etat})`);
      n = 0;
      debut = maintenant;
      calcul = 0;
    }
    requestAnimationFrame(image);
  }
  requestAnimationFrame(t => { avant = t; debut = t; image(t); });
}

lancer().catch(e => {
  console.error(e);
  chargement(0, "Oups, le jeu n'a pas pu démarrer : " + e.message);
});
