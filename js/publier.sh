#!/bin/zsh
# Publie la version JavaScript sur GitHub Pages, dans le dossier js/ de la branche gh-pages
# (le reste du site ne bouge pas) : https://frederic-michaud.github.io/bled_en_fete/js/
cd "$(dirname "$0")/.."
DEPOT=$(git remote get-url origin)
TMP=$(mktemp -d)
git clone -q --depth 1 -b gh-pages "$DEPOT" "$TMP" || exit 1
rm -rf "$TMP/js" && mkdir -p "$TMP/js"
cp js/*.js js/index.html "$TMP/js/"
cd "$TMP" && git add -A && git commit -q -m "Version JavaScript ($(date +%Y-%m-%d))" \
  && git push -q origin gh-pages && echo "Publié : https://frederic-michaud.github.io/bled_en_fete/js/"
