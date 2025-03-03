#!/bin/bash

PACKAGES_DIR="./packages"

for package in "$PACKAGES_DIR"/*; do
  if [ -d "$package" ]; then
    PACKAGE_NAME=$(basename "$package")
    PACKAGE_JSON="$package/package.json"
    TSCONFIG="$package/tsconfig.json"
    TYPES_OUT_DIR="$package/types"

    echo "Building package: $PACKAGE_NAME"

    if [ -f "$PACKAGE_JSON" ]; then
      tsc --project "$TSCONFIG" --emitDeclarationOnly --declarationDir "$TYPES_OUT_DIR"

      pushd "$package" > /dev/null
      bun run bundle
      RESULT=$?
      popd > /dev/null

      if [ $RESULT -eq 0 ]; then
        echo "Package $PACKAGE_NAME built successfully"
      else
        echo "Error building package $PACKAGE_NAME"
        continue
      fi
    else
      echo "package.json not found for package $PACKAGE_NAME"
      continue
    fi
  fi
done

echo "All packages processed."