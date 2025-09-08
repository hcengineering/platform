#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Ensure Rush is installed
if [ ! -f "common/scripts/install-run-rush.js" ]; then
  echo "Rush.js is not installed. Please ensure Rush is set up correctly."
  exit 1
fi

# Bump versions using Rush
node common/scripts/install-run-rush.js version --bump --override-bump minor

# Commit the changes
git add .
git commit -m "Bump versions using Rush.js"

echo "Version bump completed successfully."
