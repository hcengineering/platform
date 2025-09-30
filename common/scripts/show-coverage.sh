#!/bin/bash

echo "=== FINAL COVERAGE REPORT ==="
echo ""

# Iterate through each package directory
for pkg in packages/*/; do
  pkgname=$(basename "$pkg")
  
  echo "📦 Package: $pkgname"
  echo "---"
  
  # Change to package directory
  cd "$pkg" || continue
  
  # Run tests with coverage and extract summary
  npm test -- --coverage --silent 2>&1 | \
    grep -A 4 "Coverage summary" | \
    grep -E "Statements|Branches|Functions|Lines"
  
  # Return to root directory
  cd ../.. || exit
  
  echo ""
done

echo "=== END OF COVERAGE REPORT ==="