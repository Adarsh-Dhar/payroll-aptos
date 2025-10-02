#!/bin/bash
set -e

echo "Installing dependencies..."
pnpm install

echo "Generating Prisma client..."
pnpm prisma generate

echo "Building Next.js application..."
next build

echo "Build completed successfully!"
