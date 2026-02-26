#!/usr/bin/env bash

DIRS_TO_DELETE=(
  "node_modules"
  ".turbo"
  "apps/*/node_modules"
  "apps/*/.turbo"
  "apps/*/.next"
  "apps/*/out"
  "apps/*/dist"
  "packages/*/node_modules"
  "packages/*/.turbo"
  "packages/*/dist"
)

echo "Start cleaning up directories: ${DIRS_TO_DELETE[*]}"

for dir in "${DIRS_TO_DELETE[@]}"
do
  rm -rf $dir && echo "Removed $dir directory."
done

echo "Cleanup completed successfully!"
