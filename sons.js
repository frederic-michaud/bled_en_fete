// Les bruitages, fabriqués par le programme (pas de fichiers son) : port de sons.py
// avec Web Audio.
//
// La fabrication des échantillons (echantillons_sons) ne dépend pas du navigateur : elle
// rend des Float32Array (mêmes valeurs que les entiers 16 bits du Python, divisés par
// 32768), en mono. Les AudioBuffer ne sont faits qu'une fois l'audio débloqué.

export const FREQ = 44100;          // comme pygame.mixer (44100 Hz)

let contexte = null;                // l'AudioContext partagé (sons et musique)
const en_attente = [];              // ce qui attend le déblocage (la musique, les sons)

/** Crée ou reprend l'AudioContext. À appeler au premier geste de l'utilisateur (clic,
 * touche) : les navigateurs refusent de jouer du son avant. */
export function debloquer_audio() {
  try {
    if (!contexte) {
      const Contexte = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Contexte) return null;
      try {
        contexte = new Contexte({ sampleRate: FREQ });
      } catch {
        contexte = new Contexte();   // ce navigateur impose sa fréquence
      }
    }
    if (contexte.state === "suspended") contexte.resume().catch(() => {});
    while (en_attente.length) en_attente.shift()(contexte);
  } catch (e) {
    console.warn("Pas de son :", e);
  }
  return contexte;
}

/** L'AudioContext partagé, ou null si l'audio n'est pas encore débloqué. */
export function contexte_audio() {
  return contexte;
}

/** Appelle f(contexte) dès que l'audio est débloqué (tout de suite s'il l'est déjà). */
export function quand_debloque(f) {
  if (contexte) f(contexte);
  else en_attente.push(f);
}

/** Un AudioBuffer mono fait d'un Float32Array. */
export function tampon(ctx, echantillons, freq = FREQ) {
  const buf = ctx.createBuffer(1, echantillons.length, freq);
  buf.copyToChannel(echantillons, 0);
  return buf;
}

const TAU = 2 * Math.PI;
const uniforme = (a, b) => a + (b - a) * Math.random();   // random.uniform

/** Les échantillons de chaque bruitage, par nom (des valeurs de -1 à 1). */
export function echantillons_sons(freq = FREQ) {
  // Des notes en ton carré qui glissent de f0 à f1 et s'éteignent.
  function ton(notes, volume = 0.09) {
    let total = 0;
    for (const [, , duree] of notes) total += Math.trunc(freq * duree);
    const buf = new Float32Array(total);
    let phase = 0, k = 0;
    for (const [f0, f1, duree] of notes) {
      const n = Math.trunc(freq * duree);
      for (let i = 0; i < n; i++) {
        const u = i / n;
        phase += (f0 + (f1 - f0) * u) / freq;
        buf[k++] = Math.trunc((phase % 1 < 0.5 ? 1 : -1) * (1 - u) ** 0.5 * volume * 32767) / 32768;
      }
    }
    return buf;
  }

  // Le sifflement doux d'une fusée qui monte (un souffle qui glisse vers l'aigu).
  function fusee() {
    const n = Math.trunc(freq * 0.8), buf = new Float32Array(n);
    let phase = 0, y = 0;
    for (let i = 0; i < n; i++) {
      const u = i / n;
      phase += (700 + 900 * u) / freq;
      y += 0.3 * (uniforme(-1, 1) - y);
      const v = (0.5 * Math.sin(TAU * phase) + 0.5 * y) * Math.sin(Math.PI * u) ** 2;
      buf[i] = Math.trunc(v * 0.035 * 32767) / 32768;
    }
    return buf;
  }

  // La détonation : un claquement, un grondement sourd, puis un crépitement.
  function detonation() {
    const n = Math.trunc(freq * 1.6), buf = new Float32Array(n);
    let grave = 0, clair = 0, etincelle = 0;
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const x = uniforme(-1, 1);
      grave += 0.04 * (x - grave);                // le bruit, très adouci : un grondement
      clair += 0.5 * (x - clair);
      if (u > 0.15 && Math.random() < 0.0025 * (1 - u)) etincelle = 1;  // une étincelle qui crépite
      etincelle *= 0.993;
      const v = 3.2 * grave * (1 - u) ** 3 + clair * Math.max(0, 1 - i / (freq * 0.06))
        + 0.5 * x * etincelle;
      buf[i] = Math.trunc(Math.max(-1, Math.min(1, v * 0.5)) * 32767) / 32768;
    }
    return buf;
  }

  return {
    fusee: fusee(),
    detonation: detonation(),
    saut: ton([[380, 620, 0.11]]),
    clic: ton([[300, 300, 0.05], [450, 450, 0.09]]),
    magie: ton([[660, 660, 0.06], [830, 830, 0.06], [990, 990, 0.06], [1320, 1320, 0.14]]),
    sort: ton([[900, 1600, 0.10]], 0.05),
    bouh: ton([[330, 160, 0.30]]),
    croa: ton([[720, 480, 0.12], [660, 400, 0.18]], 0.08),
    bonbon: ton([[880, 1320, 0.08]]),
    vide: ton([[200, 150, 0.12]]),
    crac: ton([[320, 110, 0.18]]),
    couteau: ton([[1500, 2600, 0.07]], 0.05),
    tchac: ton([[600, 180, 0.07]]),
    bravo: ton([[523, 523, 0.12], [659, 659, 0.12], [784, 784, 0.12], [1047, 1047, 0.35]]),
  };
}

// Les noms des bruitages (ceux de sons.py).
export const NOMS_SONS = ["fusee", "detonation", "saut", "clic", "magie", "sort", "bouh",
  "croa", "bonbon", "vide", "crac", "couteau", "tchac", "bravo"];

/** Les bruitages, par nom : { nom: { play() } }. Tant que l'audio n'est pas débloqué,
 * play() ne fait rien ; les sons sont fabriqués au déblocage. */
export function creer_sons() {
  let tampons = null;               // nom → AudioBuffer
  quand_debloque(ctx => {
    try {
      const ech = echantillons_sons(ctx.sampleRate);
      tampons = {};
      for (const nom in ech) tampons[nom] = tampon(ctx, ech[nom], ctx.sampleRate);
    } catch (e) {
      console.warn("Pas de bruitages :", e);
    }
  });
  const sons = {};
  for (const nom of NOMS_SONS) {
    sons[nom] = {
      play() {
        if (!tampons || !contexte || contexte.state !== "running") return;
        try {
          const source = contexte.createBufferSource();
          source.buffer = tampons[nom];
          source.connect(contexte.destination);
          source.start();
        } catch (e) {
          // un son qui ne part pas ne doit jamais arrêter le jeu
        }
      },
    };
  }
  return sons;
}
