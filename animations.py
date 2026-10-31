"""Dessins animés fabriqués en SVG par le programme : chaque image est un SVG
différent (les os, les ailes, la fumée… dans une autre position), comme les pages
d'un folioscope. pygame ne sait pas jouer les animations écrites dans un SVG.

Chaque fonction prend phase, de 0 à 1 (un cycle complet), et rend le texte du SVG.
ANIMES, en bas, dit combien d'images faire par cycle et à quelle vitesse les jouer."""
import math

TAU = math.tau
OS_LONG = 9.5               # longueur d'un os de bras ou de jambe


def _svg(boite, contenu):
    x, y, w, h = boite
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x} {y} {w} {h}" '
            f'width="{w}" height="{h}">{contenu}</svg>')


def _points(pts):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)


def _bout(depart, angle, longueur=OS_LONG):
    """Bout d'un os. angle en degrés : 0 = vers le bas, 90 = vers l'avant (droite)."""
    a = math.radians(angle)
    return depart[0] + longueur * math.sin(a), depart[1] + longueur * math.cos(a)


def _membre(depart, angle1, angle2):
    """Un bras ou une jambe en deux os : rend le trait SVG et le bout."""
    coude = _bout(depart, angle1)
    main = _bout(coude, angle2)
    return f'<polyline points="{_points((depart, coude, main))}"/>', main


# La danse du squelette en fête : 8 figures enchaînées en boucle. Chaque figure :
# (dx, dy, bras avant, bras arrière, jambe avant, jambe arrière, tête penchée, bouche)
# ; un membre = (angle de l'os du haut, angle de l'os du bas), 0 = vers le bas,
# 90 = vers l'avant, 180 = vers le haut ; bouche 0 = sourire, 1 = grande ouverte (il chante).
DANSE = [
    (0, 0, (125, 140), (-40, 35), (8, 0), (-8, 0), 6, 1.0),           # disco : doigt au ciel…
    (1, 1, (-30, -40), (-40, 35), (10, 0), (-10, 0), -4, 0.0),        # … puis vers le sol
    (0, 0, (125, 140), (-40, 35), (8, 0), (-8, 0), 6, 1.0),           # et encore au ciel
    (0, 4, (95, 110), (-95, -110), (40, -15), (-40, 15), 0, 0.8),     # accroupi, jazz hands
    (0, -9, (140, 160), (-140, -160), (40, -30), (-30, 35), 0, 1.0),  # grand saut, bras en l'air
    (-1, -1, (115, 140), (-115, -140), (85, 85), (-5, 0), -8, 0.4),   # coup de pied en avant
    (1, -1, (100, 130), (-140, -160), (5, 0), (-75, -85), 8, 0.4),    # coup de pied en arrière
    (-2, 1, (130, 100), (-130, -100), (15, 5), (-15, -5), -6, 0.0),   # il se déhanche
]


def _pose_danse(phase):
    """La pose de la danse à l'instant phase : on glisse d'une figure à la suivante,
    en marquant un petit arrêt sur chacune."""
    pos = phase * len(DANSE)
    i = int(pos) % len(DANSE)
    u = min(1.0, (pos - int(pos)) * 1.6)
    u = u * u * (3 - 2 * u)
    a, b = DANSE[i], DANSE[(i + 1) % len(DANSE)]

    def m(x, y):
        if isinstance(x, tuple):
            return tuple(m(p, q) for p, q in zip(x, y))
        return x + (y - x) * u
    return [m(x, y) for x, y in zip(a, b)]


def squelette(phase, fete):
    """Le squelette à l'instant phase (0 à 1 = un cycle) : il marche en tendant les
    bras pour faire peur, ou (fete) il danse avec son chapeau pointu."""
    p = phase * TAU
    s = math.sin(p)
    if fete:
        dx, dy, bras_av, bras_ar, jambe_av, jambe_ar, tete, bouche = _pose_danse(phase)
        bras, jambes = [bras_av, bras_ar], [jambe_av, jambe_ar]
        machoire = 1.5 * bouche
        os_, crane = "#f4f0e2", "#fbf8ee"
    else:
        dx, dy = 0.0, -1.5 * abs(math.cos(p))           # il se dandine à chaque pas
        bras = [(70 + 12 * s, 95 + 10 * s), (35 - 20 * s, 60 - 15 * s)]
        jambes = [(28 * s, 28 * s - 25 * max(0.0, math.cos(p))),
                  (-28 * s, -28 * s - 25 * max(0.0, -math.cos(p)))]
        tete, machoire = 3 * s, 1.5 * abs(math.sin(2 * p))  # la mâchoire claque
        os_, crane = "#cfc9b4", "#e4dfcc"
    cx, epaule, hanche = 24 + dx, 28 + dy, 44 + dy
    traits = [f'<path d="M{cx:.1f} {epaule - 4:.1f} L{cx:.1f} {hanche:.1f}"/>']
    for k, (y, demi) in enumerate(((epaule + 1, 9), (epaule + 6, 9), (epaule + 11, 7))):
        traits.append(f'<path d="M{cx - demi:.1f} {y:.1f} Q{cx:.1f} {y - 3:.1f} {cx + demi:.1f} {y:.1f}"/>')
    traits.append(f'<path d="M{cx - 7:.1f} {hanche:.1f} L{cx + 7:.1f} {hanche:.1f}"/>')
    for k, (a1, a2) in enumerate(bras):
        trait, _ = _membre((cx + (5 if k == 0 else -5), epaule), a1, a2)
        traits.append(trait)
    pieds = []
    for k, (a1, a2) in enumerate(jambes):
        trait, (px, py) = _membre((cx + (4 if k == 0 else -4), hanche), a1, a2)
        traits.append(trait)
        pieds.append(f'<path d="M{px:.1f} {py:.1f} L{px + 4:.1f} {py:.1f}"/>')
    corps = (f'<g stroke="{os_}" stroke-width="3.5" stroke-linecap="round" '
             f'stroke-linejoin="round" fill="none">{"".join(traits + pieds)}</g>')
    # la tête : on la dessine autour de (0, 0) puis on la penche
    hx, hy = cx + tete * 0.3, epaule - 15
    if fete:
        visage = ('<circle cx="-4" cy="-1" r="2.6" fill="#2a2a40"/><circle cx="4" cy="-1" r="2.6" fill="#2a2a40"/>'
                  '<circle cx="-3" cy="-2" r="0.9" fill="#fff"/><circle cx="5" cy="-2" r="0.9" fill="#fff"/>'
                  + (f'<ellipse cx="0" cy="{5.5 + machoire * 0.5:.1f}" rx="3" ry="{1 + machoire * 1.3:.1f}" '
                     'fill="#2a2a40"/>' if machoire > 0.6 else    # il chante
                     f'<path d="M-5 {4 + machoire:.1f} Q0 {8 + machoire:.1f} 5 {4 + machoire:.1f}" '
                     'stroke="#2a2a40" stroke-width="1.5" fill="none" stroke-linecap="round"/>') +
                  '<path d="M-9 -7 L6 -9 L-4 -16 Z" fill="#ff5aa0"/><circle cx="-4" cy="-15.5" r="2.4" fill="#ffd040"/>'
                  '<circle cx="-4" cy="-10" r="1" fill="#ffd040"/><circle cx="1" cy="-9.5" r="1" fill="#ffd040"/>'
                  '<path d="M0 12 L-7 8 L-7 16 Z M0 12 L7 8 L7 16 Z" fill="#9b4dff"/>')
    else:
        visage = ('<path d="M-9 -3 L-1 0 L-8 4 Z M9 -3 L1 0 L8 4 Z" fill="#1a1010"/>'
                  '<circle cx="-5" cy="1" r="1.3" fill="#ff3030"/><circle cx="5" cy="1" r="1.3" fill="#ff3030"/>'
                  f'<path d="M-5 {8.5 + machoire:.1f} L5 {8.5 + machoire:.1f} M-3 6 L-3 {11 + machoire:.1f} '
                  f'M0 6 L0 {11 + machoire:.1f} M3 6 L3 {11 + machoire:.1f}" stroke="#1a1010" stroke-width="1.2"/>')
    tete_svg = (f'<g transform="translate({hx:.1f} {hy:.1f}) rotate({tete:.1f})">'
                f'<rect x="-7" y="{5 + machoire:.1f}" width="14" height="7" rx="2" fill="{crane}"/>'
                f'<ellipse cx="0" cy="0" rx="11" ry="{9 if fete else 10}" fill="{crane}"/>{visage}</g>')
    return _svg((0, -8, 48, 72), corps + tete_svg)


def vampire(phase, etat="repos"):
    """Le vampire, tourné vers la droite : au repos (il respire et cligne des yeux),
    en marche (jambes, cape qui flotte derrière) ou en l'air (jambes repliées)."""
    p = phase * TAU
    s, c = math.sin(p), math.cos(p)
    if etat == "marche":
        dy, flot = -1.5 * abs(c), 4 + 2 * math.sin(2 * p)
        pieds = [(6 * s, 3 * max(0.0, c)), (-6 * s, 3 * max(0.0, -c))]
    elif etat == "saut":
        dy, flot = -1.0, 7.0
        pieds = [(4, 6), (-3, 4)]
    else:
        dy, flot = 0.6 * s, 1 + 0.8 * s
        pieds = [(0, 0), (0, 0)]
    vague = 2 * math.sin(2 * p) if etat != "repos" else 0.5 * s
    cligne = etat == "repos" and 0.88 < phase < 0.96
    # la cape : le côté arrière (gauche) flotte, le bas ondule
    cape = (f'<path d="M8 {26 + dy:.1f} L{2 - flot:.1f} {58 - flot * 0.6:.1f} '
            f'Q{12:.1f} {58 + vague:.1f} 24 {54 + dy:.1f} Q35 {57 - vague:.1f} 46 60 L40 {26 + dy:.1f} Z" fill="#2a0f2e"/>'
            f'<path d="M10 {28 + dy:.1f} L{6 - flot * 0.8:.1f} {55 - flot * 0.5:.1f} '
            f'Q14 {54 + vague:.1f} 24 {51 + dy:.1f} Q34 {54 - vague:.1f} 42 56 L38 {28 + dy:.1f} Z" fill="#a3122a"/>')
    jambes = "".join(
        f'<polyline points="{_points(((x0, 50 + dy), (x0 + jx, 61 - lever)))}"/>'
        for x0, (jx, lever) in zip((19, 29), pieds))
    jambes = f'<g stroke="#1d1d2b" stroke-width="6" stroke-linecap="round" fill="none">{jambes}</g>'
    if cligne:
        yeux = ('<path d="M20.5 18.5 L25.5 18.5 M27.5 18.5 L32.5 18.5" stroke="#141420" '
                'stroke-width="1.4" stroke-linecap="round"/>')
    else:
        yeux = ('<circle cx="23" cy="18" r="2.6" fill="#fff"/><circle cx="30" cy="18" r="2.6" fill="#fff"/>'
                '<circle cx="24" cy="18.5" r="1.3" fill="#c0102a"/><circle cx="31" cy="18.5" r="1.3" fill="#c0102a"/>')
    haut = (f'<g transform="translate(0 {dy:.1f})">'
            '<rect x="14" y="28" width="20" height="24" rx="5" fill="#1d1d2b"/>'
            '<path d="M20 28 L24 38 L28 28 Z" fill="#f2f2f2"/>'
            '<path d="M10 30 L14 16 L20 26 Z" fill="#a3122a"/><path d="M38 30 L34 16 L28 26 Z" fill="#a3122a"/>'
            '<ellipse cx="24" cy="18" rx="10" ry="11" fill="#cfe3d6"/>'
            '<path d="M13 16 Q14 5 24 6 Q34 5 35 16 Q30 10 24 14 Q18 10 13 16 Z" fill="#141420"/>'
            f'{yeux}'
            '<path d="M23 24 Q27 27 31 24" stroke="#5a1020" stroke-width="1.2" fill="none"/>'
            '<path d="M24.5 24.6 L25.5 27 L26.3 25.2 Z M28.3 25.2 L29 27 L29.8 24.6 Z" fill="#fff"/></g>')
    return _svg((-6, 0, 54, 64), cape + jambes + haut)


def chauve_souris(phase):
    """Elle bat des ailes (le corps monte quand les ailes descendent)."""
    a = math.sin(phase * TAU)
    up = 9 * a
    aile = [(32, 18), (20, 8 - up * 0.5), (14, 12 - up * 0.8), (4, 6 - up), (6, 16 - up * 0.8),
            (0, 22 - up * 0.6), (10, 22 - up * 0.4), (14, 30 - up * 0.3), (22, 24), (32, 28)]
    miroir = [(64 - x, y) for x, y in aile]
    dy = -1.5 * a
    return _svg((0, -8, 64, 48),
                f'<polygon points="{_points(aile)}" fill="#2a2236"/>'
                f'<polygon points="{_points(miroir)}" fill="#2a2236"/>'
                f'<g transform="translate(0 {dy:.1f})">'
                '<polygon points="26,14 27,5 30,13" fill="#3a3048"/><polygon points="38,14 37,5 34,13" fill="#3a3048"/>'
                '<ellipse cx="32" cy="22" rx="8" ry="10" fill="#3a3048"/>'
                '<ellipse cx="29" cy="20" rx="2" ry="1.3" fill="#ff2020"/><ellipse cx="35" cy="20" rx="2" ry="1.3" fill="#ff2020"/>'
                '<polygon points="30,26 31,29.5 32,26" fill="#fff"/><polygon points="32,26 33,29.5 34,26" fill="#fff"/></g>')


def _bas_fantome(p, gauche, droite, haut_dent, bas_dent, dents, arrondi):
    """Le bas d'un fantôme qui ondule, de droite à gauche."""
    pts = []
    for i in range(dents * 2 + 1):
        x = droite - (droite - gauche) * i / (dents * 2)
        y = (bas_dent if i % 2 == 0 else haut_dent) + 2 * math.sin(p + i * 0.9)
        pts.append((x, y))
    if not arrondi:
        return " ".join(f"L{x:.1f} {y:.1f}" for x, y in pts)
    chemin = f"L{pts[0][0]:.1f} {pts[0][1]:.1f}"
    for i in range(1, len(pts) - 1, 2):
        chemin += f" Q{pts[i][0]:.1f} {pts[i][1]:.1f} {pts[i + 1][0]:.1f} {pts[i + 1][1]:.1f}"
    return chemin


def fantome_peur(phase):
    """Il agite les bras, sa bouche s'ouvre et se ferme (« Hououou… »)."""
    p = phase * TAU
    bras = 4 * math.sin(p * 2)
    bouche = 8 + 2 * math.sin(p)
    return _svg((0, 0, 64, 64),
                f'<path d="M10 30 L1 {19 - bras:.1f} L13 23 Z M54 30 L63 {19 + bras:.1f} L51 23 Z" fill="#a8b0bc"/>'
                f'<path d="M10 28 Q10 5 32 5 Q54 5 54 28 {_bas_fantome(p, 10, 54, 53, 62, 3, False)} Z" fill="#b8c0cc"/>'
                '<ellipse cx="23" cy="26" rx="5" ry="7" fill="#121218"/><ellipse cx="41" cy="26" rx="5" ry="7" fill="#121218"/>'
                f'<ellipse cx="32" cy="44" rx="{5 + bouche * 0.15:.1f}" ry="{bouche:.1f}" fill="#121218"/>'
                '<path d="M16 15 L28 21 M48 15 L36 21" stroke="#121218" stroke-width="3" stroke-linecap="round"/>')


def fantome_gentil(phase):
    """Son bas ondule doucement, il cligne des yeux, son nœud frétille."""
    p = phase * TAU
    cligne = 0.9 < phase < 0.97
    yeux = ('<path d="M22 29 Q25 31 28 29 M36 29 Q39 31 42 29" stroke="#2a2a40" stroke-width="1.8" '
            'fill="none" stroke-linecap="round"/>' if cligne else
            '<circle cx="25" cy="29" r="3.5" fill="#2a2a40"/><circle cx="39" cy="29" r="3.5" fill="#2a2a40"/>'
            '<circle cx="26" cy="28" r="1.2" fill="#fff"/><circle cx="40" cy="28" r="1.2" fill="#fff"/>')
    noeud = 2 * math.sin(p * 3)
    return _svg((0, 0, 64, 64),
                f'<path d="M12 30 Q12 9 32 9 Q52 9 52 30 {_bas_fantome(p, 12, 52, 53, 60, 4, True)} Z" fill="#fbfbff"/>'
                + yeux +
                '<ellipse cx="20" cy="36" rx="4" ry="2.5" fill="#ffb0c8"/><ellipse cx="44" cy="36" rx="4" ry="2.5" fill="#ffb0c8"/>'
                '<path d="M27 38 Q32 43 37 38" stroke="#2a2a40" stroke-width="2" fill="none" stroke-linecap="round"/>'
                f'<path d="M32 10 L21 {3 - noeud:.1f} L21 {17 - noeud:.1f} Z M32 10 L43 {3 + noeud:.1f} L43 {17 + noeud:.1f} Z" fill="#ff5aa0"/>'
                '<circle cx="32" cy="10" r="3" fill="#ff8ac0"/>')


def soupe(phase):
    """Trois volutes de fumée qui montent et s'effacent, des bulles qui éclatent."""
    fumee = ""
    for i in range(3):
        u = (phase + i / 3) % 1
        x, y = 22 + 10 * i + 3 * math.sin(u * TAU + i), 20 - 18 * u
        alpha = math.sin(u * math.pi) * 0.75
        fumee += (f'<path d="M{x:.1f} {y + 5:.1f} Q{x - 4:.1f} {y + 1:.1f} {x:.1f} {y - 2:.1f} '
                  f'Q{x + 4:.1f} {y - 5:.1f} {x:.1f} {y - 8:.1f}" stroke="#ffffff" stroke-width="2.2" '
                  f'fill="none" stroke-linecap="round" opacity="{alpha:.2f}"/>')
    bulles = ""
    for i, bx in enumerate((22, 34, 42)):
        r = 2.6 * math.sin(math.pi * ((phase * 2 + i * 0.37) % 1))
        if r > 0.3:
            bulles += f'<circle cx="{bx}" cy="24" r="{r:.1f}" fill="#ffd060"/>'
    return _svg((0, -8, 64, 72),
                fumee +
                '<path d="M6 24 Q6 56 32 58 Q58 56 58 24 Z" fill="#3a3550"/>'
                '<rect x="14" y="54" width="6" height="8" fill="#3a3550"/><rect x="44" y="54" width="6" height="8" fill="#3a3550"/>'
                '<ellipse cx="32" cy="24" rx="26" ry="6" fill="#5a5470"/>'
                '<ellipse cx="32" cy="24" rx="22" ry="4" fill="#ff9a2a"/>' + bulles +
                '<circle cx="25" cy="37" r="2.2" fill="#ffb040"/><circle cx="39" cy="37" r="2.2" fill="#ffb040"/>'
                '<path d="M26 43 Q32 49 38 43" stroke="#ffb040" stroke-width="2.5" fill="none" stroke-linecap="round"/>')


def toile(phase):
    """L'araignée fait le tour de sa toile en remuant les pattes."""
    p = phase * TAU
    web = ('<g stroke="#8f96a4" stroke-width="1.4" fill="none">'
           '<path d="M32 30 L62 30 M32 30 L53.2 51.2 M32 30 L32 60 M32 30 L10.8 51.2 M32 30 L2 30 '
           'M32 30 L10.8 8.8 M32 30 L32 0 M32 30 L53.2 8.8"/>')
    for r in (10, 18, 26):
        web += f'<polygon points="{_points([(32 + r * math.cos(k * TAU / 8), 30 + r * math.sin(k * TAU / 8)) for k in range(8)])}"/>'
    web += '</g>'
    # elle avance sur l'anneau du milieu, la tête dans le sens de la marche
    x, y = 32 + 18 * math.cos(p), 30 + 18 * math.sin(p)
    angle = math.degrees(p) + 180
    pattes = ""
    for cote in (-1, 1):
        for i in range(4):
            bouge = 1.5 * math.sin(p * 16 + i * math.pi / 2 + (cote > 0) * math.pi)
            y0 = -3 + i * 2
            pattes += (f'<polyline points="{_points(((cote * 3, y0), (cote * 7, y0 - 3 + bouge), (cote * 10, y0 + 1 + i + bouge)))}"/>')
    araignee = (f'<g transform="translate({x:.1f} {y:.1f}) rotate({angle:.1f})">'
                f'<g stroke="#15121c" stroke-width="1.4" stroke-linecap="round" fill="none">{pattes}</g>'
                '<ellipse cx="0" cy="2" rx="4.5" ry="5.5" fill="#15121c"/><circle cx="0" cy="-4" r="3" fill="#15121c"/>'
                '<circle cx="-1.2" cy="-5" r="0.9" fill="#ff3030"/><circle cx="1.2" cy="-5" r="0.9" fill="#ff3030"/></g>')
    return _svg((0, 0, 64, 64), web + araignee)


def chandelier_eteint(phase):
    """Le vieux chandelier éteint, plein de toiles, qui se balance un peu."""
    angle = 3 * math.sin(phase * TAU)
    return _svg((0, 0, 64, 64),
                f'<g transform="rotate({angle:.1f} 32 0)">'
                '<rect x="31" y="0" width="2" height="16" fill="#3a3a44"/>'
                '<path d="M32 16 L32 34" stroke="#3a3a44" stroke-width="3"/>'
                '<path d="M8 34 Q32 52 56 34" stroke="#3a3a44" stroke-width="4" fill="none"/>'
                '<ellipse cx="32" cy="40" rx="6" ry="8" fill="#3a3a44"/>'
                '<rect x="4" y="30" width="10" height="5" rx="1" fill="#3a3a44"/>'
                '<rect x="27" y="22" width="10" height="5" rx="1" fill="#3a3a44"/>'
                '<rect x="50" y="30" width="10" height="5" rx="1" fill="#3a3a44"/>'
                '<rect x="7" y="22" width="4" height="8" fill="#7a7a80"/>'
                '<rect x="30" y="14" width="4" height="8" fill="#7a7a80"/>'
                '<rect x="53" y="20" width="4" height="10" fill="#7a7a80"/>'
                '<path d="M10 22 Q22 30 30 16" stroke="#aaaaaa" stroke-width="0.8" fill="none" opacity="0.6"/>'
                '<path d="M34 16 Q44 28 54 20" stroke="#aaaaaa" stroke-width="0.8" fill="none" opacity="0.6"/>'
                '</g>')


def chandelier_allume(phase):
    """Les flammes vacillent."""
    p = phase * TAU
    flammes = ""
    for i, (x, y) in enumerate(((9, 11), (32, 5), (55, 11))):
        h = 5 + 1.2 * math.sin(p * (2 + i) + i)
        dx = 0.8 * math.sin(p * (3 + i))
        lueur = 0.22 + 0.08 * math.sin(p * (2 + i))
        flammes += (f'<circle cx="{x}" cy="{y}" r="9" fill="#ffd040" opacity="{lueur:.2f}"/>'
                    f'<ellipse cx="{x + dx:.1f}" cy="{y + 5 - h:.1f}" rx="3" ry="{h:.1f}" fill="#ff9a2a"/>'
                    f'<ellipse cx="{x + dx:.1f}" cy="{y + 6 - h * 0.6:.1f}" rx="1.5" ry="{h * 0.6:.1f}" fill="#fff4a0"/>')
    return _svg((0, -4, 64, 68),
                '<rect x="31" y="-4" width="2" height="20" fill="#c99a20"/>'
                '<path d="M32 16 L32 34" stroke="#e8b830" stroke-width="3"/>'
                '<path d="M8 34 Q32 52 56 34" stroke="#e8b830" stroke-width="4" fill="none"/>'
                '<ellipse cx="32" cy="40" rx="6" ry="8" fill="#e8b830"/><circle cx="32" cy="40" r="2.5" fill="#ff5aa0"/>'
                '<rect x="4" y="30" width="10" height="5" rx="1" fill="#e8b830"/>'
                '<rect x="27" y="22" width="10" height="5" rx="1" fill="#e8b830"/>'
                '<rect x="50" y="30" width="10" height="5" rx="1" fill="#e8b830"/>'
                '<rect x="7" y="16" width="4" height="14" fill="#ff7ab8"/>'
                '<rect x="30" y="10" width="4" height="12" fill="#b070ff"/>'
                '<rect x="53" y="16" width="4" height="14" fill="#ff9a2a"/>' + flammes)


def guirlande(phase):
    """Les fanions se balancent, les ampoules clignotent chacune leur tour."""
    p = phase * TAU
    couleurs = ("#ff8a1e", "#9b4dff", "#4cd964", "#ff5aa0")
    lampes = ("#ffd040", "#ff8a1e", "#b070ff", "#4cd964")
    fanions, ampoules = "", ""
    for i, (x, y) in enumerate(((8, 10.4), (24, 15.4), (40, 15.4), (56, 10.4))):
        dx = 2 * math.sin(p + i)
        fanions += f'<polygon points="{_points(((x - 7, y - 1), (x + 7, y + 1), (x + dx, y + 16)))}" fill="{couleurs[i]}"/>'
        allume = (int(phase * 4) + i) % 2 == 0
        ly = y + 28
        ampoules += (f'<circle cx="{x}" cy="{ly}" r="8" fill="{lampes[i]}" opacity="{0.4 if allume else 0.08}"/>'
                     f'<circle cx="{x}" cy="{ly + 1.6:.1f}" r="4" fill="{lampes[i]}" opacity="{1 if allume else 0.55}"/>')
    return _svg((0, 0, 64, 64),
                '<path d="M0 6 Q32 26 64 6" stroke="#6a4a3a" stroke-width="2" fill="none"/>' + fanions +
                '<path d="M0 34 Q32 54 64 34" stroke="#3a3a3a" stroke-width="1.5" fill="none"/>' + ampoules)


def ballon(phase):
    """Le ballon chauve-souris remue ses petites ailes, sa ficelle ondule."""
    p = phase * TAU
    f, a = 4 * math.sin(p), 3 * math.sin(p * 2)
    return _svg((0, 0, 48, 64),
                f'<path d="M24 45 Q{19 + f:.1f} 52 {25 - f * 0.5:.1f} 57 Q{30 - f:.1f} 61 {24 + f * 0.5:.1f} 64" '
                'stroke="#d0c0e0" stroke-width="1.2" fill="none"/>'
                f'<path d="M7 20 L1 {14 - a:.1f} L3 24 L0 {30 - a * 0.5:.1f} L8 28 Z '
                f'M41 20 L47 {14 - a:.1f} L45 24 L48 {30 - a * 0.5:.1f} L40 28 Z" fill="#7a35d0"/>'
                '<polygon points="13,9 15,1 20,7" fill="#8a45e0"/><polygon points="35,9 33,1 28,7" fill="#8a45e0"/>'
                '<ellipse cx="24" cy="23" rx="17" ry="20" fill="#9b4dff"/>'
                '<polygon points="21,46 27,46 24,42" fill="#7a35d0"/>'
                '<ellipse cx="17" cy="14" rx="4" ry="6" fill="#fff" opacity="0.35"/>'
                '<circle cx="19" cy="22" r="2.6" fill="#2a1a40"/><circle cx="29" cy="22" r="2.6" fill="#2a1a40"/>'
                '<circle cx="20" cy="21" r="0.9" fill="#fff"/><circle cx="30" cy="21" r="0.9" fill="#fff"/>'
                '<ellipse cx="15" cy="28" rx="3" ry="2" fill="#ff8ac0"/><ellipse cx="33" cy="28" rx="3" ry="2" fill="#ff8ac0"/>'
                '<path d="M20 29 Q24 33 28 29" stroke="#2a1a40" stroke-width="1.6" fill="none" stroke-linecap="round"/>')


def squelette_tas(phase):
    """Le squelette effondré en tas d'os, tout étourdi (des étoiles tournent)."""
    p = phase * TAU
    etoiles = ""
    for i in range(3):
        a = p + i * TAU / 3
        x, y = 24 + 13 * math.cos(a), 5 + 3 * math.sin(a)
        etoiles += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{1.4 + 0.6 * math.sin(a):.1f}" fill="#ffd040"/>'
    return _svg((0, 0, 48, 36),
                '<g stroke="#cfc9b4" stroke-width="3.5" stroke-linecap="round">'
                '<path d="M6 32 L22 28 M18 33 L38 31 M28 27 L44 32 M10 26 L24 31 M30 33 L36 25"/></g>'
                '<ellipse cx="24" cy="17" rx="10" ry="9" fill="#e4dfcc"/>'
                '<rect x="18" y="21" width="12" height="5" rx="2" fill="#e4dfcc"/>'
                '<g stroke="#1a1010" stroke-width="1.2" fill="none">'
                '<circle cx="20" cy="16" r="2.6"/><circle cx="28" cy="16" r="2.6"/>'
                '<path d="M20 24 L28 24"/></g>'
                '<circle cx="20" cy="16" r="0.9" fill="#1a1010"/><circle cx="28" cy="16" r="0.9" fill="#1a1010"/>'
                + etoiles)


def _aile(epaule, angle, echelle=1.0):
    """Une aile de corbeau (plumes au bout), tournée de angle degrés autour de l'épaule :
    0 = à l'horizontale vers l'arrière, positif = levée, négatif = baissée."""
    base = [(0, -3), (-12, -7), (-26, -8), (-38, -5), (-34, -1), (-37, 2), (-30, 1), (-32, 5),
            (-25, 3), (-25, 7), (-18, 4), (-17, 7), (-10, 4), (0, 5)]
    a = math.radians(angle)
    ca, sa = math.cos(a), math.sin(a)
    return [(epaule[0] + echelle * (x * ca - y * sa), epaule[1] + echelle * (x * sa + y * ca))
            for x, y in base]


def corbeau(phase, etat="vol"):
    """Le corbeau grognon, tourné vers la droite. etat : « vol » (il bat des ailes),
    « picore » (il donne des coups de bec) ou « ricane » (bec ouvert, il sautille)."""
    p = phase * TAU
    tete, bec, pattes = (0.0, 0.0), 0.0, True
    if etat == "vol":
        angle, dy, pattes = 10 + 50 * math.cos(p), 2 * math.cos(p), False
    elif etat == "picore":
        angle, dy = -18, 0.0
        tete = (4 * abs(math.sin(p)), 12 * abs(math.sin(p)))
    else:
        angle, dy = -12 + 14 * max(0.0, math.sin(2 * p)), -3 * abs(math.sin(p))
        bec = 1.0 if math.sin(4 * p) > 0 else 0.3
    aile_loin = _points(_aile((44, 24 + dy), angle + 8, 0.85))
    aile_pres = _points(_aile((40, 27 + dy), angle))
    if pattes:
        jambes = ('<path d="M38 40 L36 50 M44 40 L46 50 M32 50 L40 50 M42 50 L50 50" stroke="#e8a020" '
                  'stroke-width="2" stroke-linecap="round" fill="none"/>')
    else:
        jambes = ('<path d="M40 39 L33 44 M44 39 L37 45" stroke="#e8a020" stroke-width="2" '
                  'stroke-linecap="round" fill="none"/>')
    tx, ty = tete
    bas_bec = (f"{65 + tx:.1f},{22 + ty:.1f} {76 - 2 * bec + tx:.1f},{21.5 + 9 * bec + ty:.1f} "
               f"{64 + tx:.1f},{24.5 + 1.5 * bec + ty:.1f}")
    return _svg((-2, -12, 82, 64),
                f'<polygon points="{aile_loin}" fill="#120f18"/>'
                + jambes +
                f'<g transform="translate(0 {dy:.1f})">'
                '<polygon points="22,31 3,26 5,31 2,34 6,36 4,40 22,36" fill="#18141f"/>'
                '<path d="M20 30 Q30 22 46 22 Q58 22 60 30 Q58 40 44 41 Q30 42 20 36 Z" fill="#1e1a28"/>'
                '<path d="M30 27 Q40 24 50 26" stroke="#4a4880" stroke-width="1.5" fill="none" opacity="0.8"/>'
                '<ellipse cx="54" cy="26" rx="7" ry="6" fill="#1e1a28"/>'
                f'<g transform="translate({tx:.1f} {ty:.1f})">'
                '<circle cx="57" cy="20" r="9.5" fill="#211c2c"/>'
                '<path d="M51 15 Q56 12 61 13" stroke="#4a4880" stroke-width="1.2" fill="none" opacity="0.8"/>'
                '<polygon points="64,16 78,20 65,22" fill="#f0a828"/></g>'
                f'<polygon points="{bas_bec}" fill="#d08818"/>'
                f'<g transform="translate({tx:.1f} {ty:.1f})">'
                '<circle cx="60" cy="18" r="2.8" fill="#ffd040"/><circle cx="60.8" cy="18.2" r="1.3" fill="#000"/>'
                '<path d="M55 14 L64 16.5" stroke="#000" stroke-width="2.2" stroke-linecap="round"/></g>'
                '</g>'
                f'<polygon points="{aile_pres}" fill="#272135" stroke="#3a3450" stroke-width="0.8"/>')


def bonbon(phase):
    """Un bonbon emballé : ses papillotes frétillent et il brille de temps en temps."""
    p = phase * TAU
    e = 1 + 0.25 * math.sin(p * 2)
    brille = ""
    if phase < 0.2:
        r = 4 * math.sin(phase / 0.2 * math.pi)
        brille = (f'<path d="M30 {9 - r:.1f} L30 {9 + r:.1f} M{30 - r:.1f} 9 L{30 + r:.1f} 9" '
                  'stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>')
    return _svg((0, 0, 48, 32),
                f'<polygon points="{_points(((15, 16), (3, 16 - 8 * e), (6, 16), (3, 16 + 8 * e)))}" fill="#b070ff"/>'
                f'<polygon points="{_points(((33, 16), (45, 16 - 8 * e), (42, 16), (45, 16 + 8 * e)))}" fill="#b070ff"/>'
                '<ellipse cx="24" cy="16" rx="11" ry="9" fill="#ff8a1e"/>'
                '<path d="M17 9 L22 23 M24 7 L29 24 M31 9 L33 16" stroke="#ffd040" stroke-width="2.2" stroke-linecap="round"/>'
                + brille)


def couteau(phase):
    """Le couteau de cuisine du vampire (pour la courge), lame vers la droite."""
    return _svg((0, 0, 44, 16),
                '<rect x="0" y="5" width="14" height="6" rx="2" fill="#6a3a1a"/>'
                '<rect x="12" y="3" width="3" height="10" rx="1" fill="#888888"/>'
                '<path d="M15 4 L40 6 Q44 8 40 10 L15 12 Z" fill="#dfe6ee"/>'
                '<path d="M15 4 L40 6 L15 7 Z" fill="#ffffff" opacity="0.6"/>')




def courge(phase):
    """La courge grognonne : elle respire, une lueur rouge palpite dans ses yeux et sa
    bouche, elle cligne des yeux et grogne en claquant des dents."""
    p = phase * TAU
    souffle = 1 + 0.04 * math.sin(p * 2)
    lueur = 0.55 + 0.35 * math.sin(p * 4) * math.sin(p * 3)
    cligne = 0.82 < phase < 0.9
    bouche = 2.5 * max(0.0, math.sin(p * 3))   # elle grogne
    oeil_g = "16,31 28,36 18,41" if not cligne else "15,37 28,37 28,38.5 15,38.5"
    oeil_d = "48,31 36,36 46,41" if not cligne else "49,37 36,37 36,38.5 49,38.5"
    trous = (f'<polygon points="{oeil_g}"/><polygon points="{oeil_d}"/>'
             f'<path d="M16 {48 - bouche * 0.3:.1f} L23 {46 - bouche * 0.3:.1f} L27 51 L32 {46 - bouche * 0.3:.1f} '
             f'L37 51 L41 {46 - bouche * 0.3:.1f} L48 {48 - bouche * 0.3:.1f} L41 {55 + bouche:.1f} '
             f'L23 {55 + bouche:.1f} Z"/>')
    return _svg((0, 0, 64, 64),
                f'<g transform="translate(0 {64 - 64 * souffle:.1f}) scale(1 {souffle:.3f})">'
                '<path d="M30 16 Q29 7 36 4 L38 7 Q34 9 34 16 Z" fill="#4f6a2a"/>'
                '<ellipse cx="20" cy="40" rx="14" ry="20" fill="#b8641c"/>'
                '<ellipse cx="44" cy="40" rx="14" ry="20" fill="#b8641c"/>'
                '<ellipse cx="32" cy="40" rx="14" ry="22" fill="#d8782a"/>'
                '<path d="M24 22 Q22 40 25 58 M40 22 Q42 40 39 58" stroke="#b05a18" stroke-width="1.2" fill="none"/>'
                f'<g fill="#2a1006">{trous}</g>'
                f'<g fill="#ff4a10" opacity="{lueur:.2f}">{trous}</g>'
                '</g>')


# nom : (fabrique, images par cycle, cycles par seconde)
ANIMES = {
    "vampire": (lambda ph: vampire(ph, "repos"), 16, 0.25),
    "vampire_marche": (lambda ph: vampire(ph, "marche"), 12, 1.0),  # suit les pas, pas le temps
    "vampire_saut": (lambda ph: vampire(ph, "saut"), 1, 1.0),
    "squelette": (lambda ph: squelette(ph, False), 12, 1.5),
    "squelette_danse": (lambda ph: squelette(ph, True), 40, 0.32),
    "chauve_souris": (chauve_souris, 8, 3.0),
    "fantome_peur": (fantome_peur, 16, 0.6),
    "fantome_gentil": (fantome_gentil, 16, 0.3),
    "soupe": (soupe, 16, 0.5),
    "toile": (toile, 48, 0.12),
    "chandelier_allume": (chandelier_allume, 12, 1.0),
    "guirlande": (guirlande, 8, 0.5),
    "ballon": (ballon, 12, 0.5),
    "squelette_tas": (squelette_tas, 12, 1.2),
    "corbeau_vol": (lambda ph: corbeau(ph, "vol"), 10, 3.0),
    "corbeau_picore": (lambda ph: corbeau(ph, "picore"), 8, 2.5),
    "corbeau_ricane": (lambda ph: corbeau(ph, "ricane"), 8, 1.5),
    "bonbon": (bonbon, 16, 0.6),
    "couteau": (couteau, 1, 1.0),
    "chandelier_eteint": (chandelier_eteint, 12, 0.3),
    "courge": (courge, 16, 0.6),
}
