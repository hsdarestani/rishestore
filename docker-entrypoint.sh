#!/bin/sh
set -eu
echo "Applying database schema..."
npx prisma db push
echo "Seeding idempotent base content..."
npx prisma db seed
echo "Preparing Rishe brand assets..."
sh /app/scripts/fetch-brand-assets.sh || true
echo "Starting Rishe Store..."
exec npm start
