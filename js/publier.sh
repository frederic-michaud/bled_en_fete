#!/bin/zsh
# Publie la version JavaScript sur GitHub Pages, à la racine du site :
# https://frederic-michaud.github.io/bled_en_fete/ (la branche gh-pages). L'ancienne version
# Python (pygbag) reste dans son dossier ancienne-version-python-pygbag/, sans y toucher.
cd "$(dirname "$0")/.."
DEPOT=$(git remote get-url origin)
TMP=$(mktemp -d)
git clone -q --depth 1 -b gh-pages "$DEPOT" "$TMP" || exit 1
find "$TMP" -maxdepth 1 -type f ! -name .nojekyll -delete   # l'ancienne version JavaScript
cp js/*.js js/index.html "$TMP/"
# l'ancienne adresse …/js/ renvoie à la racine
rm -rf "$TMP/js" && mkdir -p "$TMP/js"
printf '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=../">\n<a href="../">Halloween au Bled</a>\n' > "$TMP/js/index.html"
cd "$TMP" && git add -A && git commit -q -m "Version JavaScript ($(date +%Y-%m-%d))" \
  && git push -q origin gh-pages && echo "Publié : https://frederic-michaud.github.io/bled_en_fete/"
