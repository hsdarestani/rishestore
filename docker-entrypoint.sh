#!/bin/sh
set -eu
echo "Applying database schema..."
npx prisma db push --accept-data-loss
echo "Seeding idempotent base content and legacy prices..."
if ! npx prisma db seed; then
  echo "Seed failed; continuing because schema and existing production data are authoritative."
fi
echo "Preparing Rishe brand and product assets..."
node /app/scripts/fetch-brand-assets.mjs || true

echo "Starting Rishe Store..."
exec npm start
