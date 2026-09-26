#!/bin/sh
set -eu
echo "Applying database schema..."
npx prisma db push
echo "Seeding idempotent base content..."
npx prisma db seed
echo "Starting Rishe Store..."
exec npm start
