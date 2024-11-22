#!/bin/bash

PACKAGES_DIR="./packages"

for package in "$PACKAGES_DIR"/*; do
  if [ -d "$package" ]; then
    PACKAGE_NAME=$(basename "$package")
    ENTRY_POINT="$package/src/index.ts"
    OUT_DIR="$package/dist"

    echo "Building package: $PACKAGE_NAME"

    if [ -f "$ENTRY_POINT" ]; then
      bun build "$ENTRY_POINT" --outdir "$OUT_DIR"

      if [ $? -eq 0 ]; then
        echo "Package $PACKAGE_NAME built successfully"
      else
        echo "Error building package $PACKAGE_NAME"
      fi
    else
      echo "Entry point $ENTRY_POINT not found for package $PACKAGE_NAME"
    fi
  fi
done

echo "All packages processed."