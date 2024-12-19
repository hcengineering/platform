#!/bin/bash

# Find all package.json files
find . -name "package.json" -type f -print0 | while IFS= read -r -d '' file; do
  # Check if the file contains platform-rig with version
  if grep -q '"@hcengineering/platform-rig": "\^[0-9]' "$file"; then
    # Replace the version with workspace:*
    sed -i 's/"@hcengineering\/platform-rig": "\^[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*"/"@hcengineering\/platform-rig": "workspace:*"/g' "$file"
    echo "Updated $file"
  fi
done
