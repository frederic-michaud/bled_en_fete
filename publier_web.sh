#!/bin/zsh
# Publie l'ancienne version web en Python (pygbag) sur GitHub Pages, dans le dossier
# ancienne-version-python-pygbag/ de la branche gh-pages (la version JavaScript, à la racine
# du site, ne bouge pas).
cd "$(dirname "$0")"
./construire_web.sh || exit 1
DOSSIER=ancienne-version-python-pygbag
DEPOT=$(git remote get-url origin)
TMP=$(mktemp -d)
git clone -q --depth 1 -b gh-pages "$DEPOT" "$TMP" || exit 1
rm -rf "$TMP/$DOSSIER" && mkdir -p "$TMP/$DOSSIER"
cp -R site/bled_en_fete/build/web/. "$TMP/$DOSSIER/"
cd "$TMP" && git add -A && git commit -q -m "Ancienne version Python ($(date +%Y-%m-%d))" \
  && git push -q origin gh-pages && echo "Publié : https://frederic-michaud.github.io/bled_en_fete/$DOSSIER/"
