#!/bin/zsh
# Publie la version web (fabriquée par construire_web.sh) sur GitHub Pages : tout le
# contenu de site/bled_en_fete/build/web devient la branche gh-pages du dépôt.
cd "$(dirname "$0")"
./construire_web.sh || exit 1
DEPOT=$(git remote get-url origin)
TMP=$(mktemp -d)
cp -R site/bled_en_fete/build/web/. "$TMP"/
touch "$TMP/.nojekyll"
cd "$TMP" && git init -q -b gh-pages && git add -A \
  && git commit -q -m "Version web, fabriquée depuis la branche web ($(date +%Y-%m-%d))" \
  && git push -q -f "$DEPOT" gh-pages && echo "Publié : https://frederic-michaud.github.io/bled_en_fete/"
