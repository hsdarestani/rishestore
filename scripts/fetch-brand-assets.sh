#!/bin/sh
set -u

BASE="https://rishe.store/wp-content/uploads"
OUT="/app/public/brand"
mkdir -p "$OUT/fonts" "$OUT/products"

fetch() {
  url="$1"
  dest="$2"
  if [ -s "$dest" ]; then
    return 0
  fi
  tmp="$dest.tmp"
  if wget -q --timeout=20 --tries=2 --header="User-Agent: Mozilla/5.0 RisheMigration" -O "$tmp" "$url"; then
    mv "$tmp" "$dest"
  else
    rm -f "$tmp"
    return 1
  fi
}

fetch "$BASE/2026/08/Asset-5@300x.png" "$OUT/logo.png" || true
fetch "$BASE/2026/06/back-1.png" "$OUT/hero.png" || true

fetch "$BASE/2026/08/danesh.ttf" "$OUT/fonts/danesh.ttf" || true
fetch "$BASE/2026/08/daneshbd.ttf" "$OUT/fonts/daneshbd.ttf" || true
fetch "$BASE/2026/08/SD-Golpayegani-Bold.ttf" "$OUT/fonts/golpayegani-bold.ttf" || true
fetch "$BASE/2026/08/SD-Golpayegani-Grunge.ttf" "$OUT/fonts/golpayegani-grunge.ttf" || true

fetch "$BASE/2026/05/photo_5825578608645312323_y.jpg" "$OUT/products/honey.jpg" || true
fetch "$BASE/2026/05/10.png" "$OUT/products/chickpeas.png" || true
fetch "$BASE/2026/05/9.png" "$OUT/products/pinto-beans.png" || true
fetch "$BASE/2026/05/11.png" "$OUT/products/rice.png" || true
fetch "$BASE/2026/05/1.png" "$OUT/products/corn.png" || true
fetch "$BASE/2026/05/13.png" "$OUT/products/tea.png" || true
fetch "$BASE/2026/05/14.png" "$OUT/products/broad-beans.png" || true
fetch "$BASE/2026/05/12.png" "$OUT/products/red-beans.png" || true
fetch "$BASE/2026/05/3.png" "$OUT/products/split-peas.png" || true
fetch "$BASE/2026/05/4.png" "$OUT/products/lentils-small.png" || true
fetch "$BASE/2026/05/16.png" "$OUT/products/lentils-large.png" || true
