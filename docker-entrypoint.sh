#!/bin/sh
set -eu
echo "Applying database schema..."
npx prisma db push
echo "Seeding idempotent base content and legacy prices..."
npx prisma db seed
echo "Preparing Rishe brand and product assets..."
node /app/scripts/fetch-brand-assets.mjs || true
echo "Starting Rishe Store..."
exec npm start
