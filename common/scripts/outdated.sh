#!/usr/bin/env bash

# Get the absolute path for the base directory
BASE_DIR=$(pwd)

# Create a directory to store the combined dependencies
DEPS_DIR="$BASE_DIR/combined_dependencies"
mkdir -p "$DEPS_DIR"

# Create temporary package.json files
EXTERNAL_PACKAGE="$DEPS_DIR/external_package.json"
COMBINED_PACKAGE="$DEPS_DIR/combined_package.json"

# Create initial combined package.json
echo '{"name": "combined-dependencies", "dependencies": {}}' > "$COMBINED_PACKAGE"

# Find all package.json files recursively, excluding node_modules and focusing on workspace packages
echo "Finding workspace package.json files..."
find . -name "package.json" -not -path "*/node_modules/*" -type f | while read -r file; do
    if grep -q '"name": "@hcengineering/' "$file"; then
        echo "$file"
    fi
done > "$DEPS_DIR/package_list.txt"

# Process each package.json and combine dependencies
echo "Combining dependencies from workspace packages..."
while IFS= read -r package_file; do
    echo "Processing: $package_file"
    # Extract dependencies and merge them into combined package.json
    deps=$(jq -r '.dependencies // {}' "$package_file")
    jq -s '.[0].dependencies *= .[1] | .[0]' "$COMBINED_PACKAGE" <(echo "$deps") > "$COMBINED_PACKAGE.tmp"
    mv "$COMBINED_PACKAGE.tmp" "$COMBINED_PACKAGE"
done < "$DEPS_DIR/package_list.txt"

# Create filtered external package.json excluding @hcengineering packages
jq '{"name": "external-dependencies", "dependencies": (.dependencies | with_entries(select(.key | startswith("@hcengineering/") | not)))}' "$COMBINED_PACKAGE" > "$EXTERNAL_PACKAGE"

# Create a temporary directory for checking outdated packages
TEMP_DIR="$DEPS_DIR/temp"
mkdir -p "$TEMP_DIR"
cp "$EXTERNAL_PACKAGE" "$TEMP_DIR/package.json"

# Check outdated packages
echo "Checking for outdated packages..."
cd "$TEMP_DIR"
npm install --force --package-lock-only > /dev/null 2>&1
npm outdated --json > "../outdated.json" 2>/dev/null
cd - > /dev/null

# Generate report
echo "Generating report..."
echo "Project Dependencies Analysis" > "$DEPS_DIR/dependencies_report.txt"
echo "Generated on: $(date)" >> "$DEPS_DIR/dependencies_report.txt"
echo "----------------------------------------" >> "$DEPS_DIR/dependencies_report.txt"
echo -e "\nOutdated External Dependencies:" >> "$DEPS_DIR/dependencies_report.txt"
echo "Package                        Version    Latest" >> "$DEPS_DIR/dependencies_report.txt"
echo "----------------------------------------" >> "$DEPS_DIR/dependencies_report.txt"

# Extract current versions from package.json
CURRENT_VERSIONS=$(jq -r '.dependencies | to_entries[] | "\(.key)|\(.value)"' "$EXTERNAL_PACKAGE")

# Format and append outdated packages to report
if [ -s "$DEPS_DIR/outdated.json" ]; then
    echo "$CURRENT_VERSIONS" | while IFS='|' read -r package version; do
        latest=$(jq -r --arg pkg "$package" '.[$pkg].latest // empty' "$DEPS_DIR/outdated.json")
        if [ ! -z "$latest" ]; then
            version=$(echo "$version" | sed 's/[\^~]//g')
            if [ "$version" != "$latest" ]; then
              printf "%-35s %-10s %-10s\n" "$package" "$version" "$latest" >> "$DEPS_DIR/dependencies_report.txt"
            fi
        fi
    done
fi

# Cleanup
rm -rf "$TEMP_DIR"

# Create summary
echo -e "\nSummary:"
echo "----------------------------------------"
echo "Report generated in: $DEPS_DIR/dependencies_report.txt"
echo "Total workspace packages processed: $(wc -l < "$DEPS_DIR/package_list.txt")"