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

if [ -f /app/data/legacy-commerce.payload.b64 ] && [ -f /app/data/legacy-commerce.key.enc.b64 ] && [ -f /run/secrets/legacy-migration-private.pem ]; then
  echo "Checking one-time encrypted legacy commerce migration..."
  npx tsx /app/scripts/import-encrypted-legacy.ts
fi

echo "Starting Rishe Store..."
exec npm start
