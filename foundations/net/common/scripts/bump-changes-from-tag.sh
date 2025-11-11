#!/usr/bin/env bash

# Script to bump version of ALL Node.js packages by incrementing from previous tag
# and update dependencies accordingly in a Rush.js monorepo
#
# Usage: ./bump-changes-from-tag.sh [git-revision] [major|minor|patch]
# Example: ./bump-changes-from-tag.sh                # Auto-detect latest v*.*.* tag, patch bump
# Example: ./bump-changes-from-tag.sh patch          # Auto-detect latest tag + patch bump
# Example: ./bump-changes-from-tag.sh minor          # Auto-detect latest tag + minor bump
# Example: ./bump-changes-from-tag.sh v0.7.0 major   # Use specific tag + major bump

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to get the latest tag matching pattern v*.*.* (e.g., v0.7.x)
get_latest_version_tag() {
    local latest_tag
    # Get all tags matching v*.*.* pattern, sort them by version, and pick the latest
    latest_tag=$(git tag -l 'v*.*.*' | sort -V | tail -n 1)
    
    if [ -z "$latest_tag" ]; then
        print_warning "No version tags found matching v*.*.* pattern"
        return 1
    fi
    
    echo "$latest_tag"
}

# Check if git revision is provided
if [ -z "$1" ]; then
    # No arguments provided - auto-detect tag and use patch
    print_info "No git revision provided, attempting to auto-detect latest version tag..."
    GIT_REVISION=$(get_latest_version_tag)
    
    if [ -z "$GIT_REVISION" ]; then
        print_error "Could not auto-detect latest version tag"
        print_error ""
        print_error "Usage: $0 [git-revision] [major|minor|patch]"
        print_error "Example: $0                    # Auto-detect latest v*.*.* tag, patch bump"
        print_error "Example: $0 patch              # Auto-detect latest tag + patch bump"
        print_error "Example: $0 minor              # Auto-detect latest tag + minor bump"
        print_error "Example: $0 HEAD~5"
        print_error "Example: $0 HEAD~5 minor"
        print_error "Example: $0 v0.7.0 major"
        exit 1
    fi
    
    print_success "Auto-detected latest version tag: $GIT_REVISION"
    BUMP_TYPE="patch"
elif [ "$1" = "major" ] || [ "$1" = "minor" ] || [ "$1" = "patch" ]; then
    # First argument is bump type - auto-detect tag
    print_info "Bump type '$1' provided, attempting to auto-detect latest version tag..."
    GIT_REVISION=$(get_latest_version_tag)
    
    if [ -z "$GIT_REVISION" ]; then
        print_error "Could not auto-detect latest version tag"
        exit 1
    fi
    
    print_success "Auto-detected latest version tag: $GIT_REVISION"
    BUMP_TYPE="$1"
else
    # First argument is git revision
    GIT_REVISION="$1"
    BUMP_TYPE="${2:-patch}"  # Default to patch if not specified
fi
REPO_ROOT=$(git rev-parse --show-toplevel)
RUSH_JSON="${REPO_ROOT}/rush.json"

# Validate bump type
case "$BUMP_TYPE" in
    major|minor|patch)
        ;;
    *)
        print_error "Invalid bump type: $BUMP_TYPE"
        print_error "Valid options are: major, minor, patch"
        exit 1
        ;;
esac

# Verify we're in a git repository
if [ ! -d ".git" ] && [ ! -f ".git" ]; then
    print_error "Not in a git repository"
    exit 1
fi

# Verify rush.json exists
if [ ! -f "$RUSH_JSON" ]; then
    print_error "rush.json not found at $RUSH_JSON"
    exit 1
fi

print_info "Repository root: $REPO_ROOT"
print_info "Reference tag: $GIT_REVISION"
print_info "Bump type: $BUMP_TYPE"

# Function to get version from previous tag
get_tag_version() {
    local tag="$1"
    # Remove 'v' prefix if present
    local version="${tag#v}"
    echo "$version"
}

# Function to increment version based on bump type
increment_version() {
    local version="$1"
    local bump_type="$2"
    
    # Remove any pre-release suffix first
    local base_version="${version%%-*}"
    local suffix=""
    if [[ "$version" != "$base_version" ]]; then
        suffix="-${version#*-}"
    fi
    
    # Extract major.minor.patch
    local major=$(echo "$base_version" | cut -d'.' -f1)
    local minor=$(echo "$base_version" | cut -d'.' -f2)
    local patch=$(echo "$base_version" | cut -d'.' -f3)
    
    # Validate numeric components
    if ! [[ "$major" =~ ^[0-9]+$ ]] || ! [[ "$minor" =~ ^[0-9]+$ ]] || ! [[ "$patch" =~ ^[0-9]+$ ]]; then
        print_error "Invalid version format: $version"
        return 1
    fi
    
    # Increment version based on bump type
    case "$bump_type" in
        major)
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        minor)
            minor=$((minor + 1))
            patch=0
            ;;
        patch)
            patch=$((patch + 1))
            ;;
    esac
    
    echo "${major}.${minor}.${patch}${suffix}"
}

# Function to get Rush projects from rush.json
get_rush_projects() {
    node -e "
        const fs = require('fs');
        try {
            // Read and strip comments from JSON
            let content = fs.readFileSync('$RUSH_JSON', 'utf8');
            // Remove single line comments that start with //
            content = content.replace(/^\s*\/\/.*$/gm, '');
            // Remove multi-line comments /* ... */
            content = content.replace(/\/\*[\s\S]*?\*\//g, '');
            
            const rush = JSON.parse(content);
            if (rush.projects && Array.isArray(rush.projects)) {
                rush.projects.forEach(project => {
                    console.log(project.packageName + '|' + project.projectFolder + '|' + (project.shouldPublish || false));
                });
            }
        } catch (error) {
            console.error('Error parsing rush.json:', error.message);
            process.exit(1);
        }
    "
}

# Function to update package.json version
update_package_version() {
    local package_file="$1"
    local new_version="$2"
    
    print_info "Updating version in $package_file to $new_version"
    
    # Use node to update the version in package.json
    node -e "
        const fs = require('fs');
        const path = '$package_file';
        try {
            const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
            pkg.version = '$new_version';
            fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
        } catch (error) {
            console.error('Error updating package.json:', error.message);
            process.exit(1);
        }
    "
}

# Function to update dependencies in package.json
update_dependencies() {
    local package_file="$1"
    local package_name="$2"
    local new_version="$3"
    
    node -e "
        const fs = require('fs');
        const path = '$package_file';
        try {
            const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
            let updated = false;
            
            // Update in dependencies
            if (pkg.dependencies && pkg.dependencies['$package_name']) {
                const oldDep = pkg.dependencies['$package_name'];
                if (oldDep.startsWith('workspace:')) {
                    pkg.dependencies['$package_name'] = 'workspace:^$new_version';
                } else {
                    pkg.dependencies['$package_name'] = '^$new_version';
                }
                updated = true;
            }
            
            // Update in devDependencies
            if (pkg.devDependencies && pkg.devDependencies['$package_name']) {
                const oldDep = pkg.devDependencies['$package_name'];
                if (oldDep.startsWith('workspace:')) {
                    pkg.devDependencies['$package_name'] = 'workspace:^$new_version';
                } else {
                    pkg.devDependencies['$package_name'] = '^$new_version';
                }
                updated = true;
            }
            
            // Update in peerDependencies
            if (pkg.peerDependencies && pkg.peerDependencies['$package_name']) {
                const oldDep = pkg.peerDependencies['$package_name'];
                if (oldDep.startsWith('workspace:')) {
                    pkg.peerDependencies['$package_name'] = 'workspace:^$new_version';
                } else {
                    pkg.peerDependencies['$package_name'] = '^$new_version';
                }
                updated = true;
            }
            
            if (updated) {
                fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
                console.log('Updated dependencies for $package_name');
            }
        } catch (error) {
            console.error('Error updating dependencies:', error.message);
        }
    "
}

# Get base version from tag
BASE_VERSION=$(get_tag_version "$GIT_REVISION")
NEW_VERSION=$(increment_version "$BASE_VERSION" "$BUMP_TYPE")

print_info "Base version from tag: $BASE_VERSION"
print_success "New version for all packages: $NEW_VERSION"

# Temporary files to store package information
TEMP_DIR=$(mktemp -d)
PACKAGE_DATA_FILE="$TEMP_DIR/package_data"
UPDATED_PACKAGES_FILE="$TEMP_DIR/updated_packages"

# Get all Rush projects
print_info "Getting all Rush projects..."
get_rush_projects > "$PACKAGE_DATA_FILE"

package_count=$(wc -l < "$PACKAGE_DATA_FILE")
print_info "Found $package_count package(s) to update"

# Step 1: Update all package versions to the new version
print_info "Updating all package versions to $NEW_VERSION..."
while IFS='|' read -r package_name project_folder publish_flag; do
    package_file="${REPO_ROOT}/${project_folder}/package.json"
    
    if [ -f "$package_file" ]; then
        # Get current version
        current_version=$(node -e "
            try {
                const pkg = JSON.parse(require('fs').readFileSync('$package_file', 'utf8'));
                console.log(pkg.version);
            } catch (error) {
                console.error('Error reading version from $package_file');
                process.exit(1);
            }
        ")
        
        update_package_version "$package_file" "$NEW_VERSION"
        echo "$package_name|$NEW_VERSION|$project_folder|$publish_flag|$current_version" >> "$UPDATED_PACKAGES_FILE"
        print_success "Updated $package_name: $current_version -> $NEW_VERSION"
    else
        print_warning "package.json not found for $package_name at $package_file"
    fi
done < "$PACKAGE_DATA_FILE"

# Step 2: Update all internal dependencies to reference the new version
print_info "Updating internal dependencies to version $NEW_VERSION..."
while IFS='|' read -r package_name project_folder publish_flag; do
    package_file="${REPO_ROOT}/${project_folder}/package.json"
    
    if [ -f "$package_file" ]; then
        # Update dependencies for each package in the monorepo
        while IFS='|' read -r dep_package_name dep_project_folder dep_publish_flag _old_version; do
            node -e "
                const fs = require('fs');
                const path = '$package_file';
                try {
                    const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
                    let updated = false;
                    
                    // Check and update in dependencies
                    if (pkg.dependencies && pkg.dependencies['$dep_package_name']) {
                        const oldDep = pkg.dependencies['$dep_package_name'];
                        if (oldDep.startsWith('workspace:')) {
                            pkg.dependencies['$dep_package_name'] = 'workspace:^$NEW_VERSION';
                        } else {
                            pkg.dependencies['$dep_package_name'] = '^$NEW_VERSION';
                        }
                        updated = true;
                    }
                    
                    // Check and update in devDependencies
                    if (pkg.devDependencies && pkg.devDependencies['$dep_package_name']) {
                        const oldDep = pkg.devDependencies['$dep_package_name'];
                        if (oldDep.startsWith('workspace:')) {
                            pkg.devDependencies['$dep_package_name'] = 'workspace:^$NEW_VERSION';
                        } else {
                            pkg.devDependencies['$dep_package_name'] = '^$NEW_VERSION';
                        }
                        updated = true;
                    }
                    
                    // Check and update in peerDependencies
                    if (pkg.peerDependencies && pkg.peerDependencies['$dep_package_name']) {
                        const oldDep = pkg.peerDependencies['$dep_package_name'];
                        if (oldDep.startsWith('workspace:')) {
                            pkg.peerDependencies['$dep_package_name'] = 'workspace:^$NEW_VERSION';
                        } else {
                            pkg.peerDependencies['$dep_package_name'] = '^$NEW_VERSION';
                        }
                        updated = true;
                    }
                    
                    if (updated) {
                        fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
                    }
                } catch (error) {
                    console.error('Error updating dependencies:', error.message);
                }
            " 2>/dev/null
        done < "$UPDATED_PACKAGES_FILE"
    fi
done < "$PACKAGE_DATA_FILE"

print_success "Updated internal dependencies across all packages"

print_success "Version bump complete!"

# Summary
echo
print_info "Summary of changes:"
echo -e "  ${BLUE}Base version (from tag ${GIT_REVISION}):${NC} $BASE_VERSION"
echo -e "  ${GREEN}New version (${BUMP_TYPE} bump):${NC} $NEW_VERSION"
echo
print_info "Updated packages:"
while IFS='|' read -r package_name new_version project_folder publish_flag old_version; do
    if [ "$publish_flag" = "true" ]; then
        echo -e "  ${GREEN}✓${NC} $package_name: $old_version -> $new_version ${YELLOW}(will be published)${NC}"
    else
        echo -e "  ${GREEN}✓${NC} $package_name: $old_version -> $new_version ${BLUE}(private package)${NC}"
    fi
done < "$UPDATED_PACKAGES_FILE"

echo
print_info "Next steps:"
echo "  1. Review the changes: git diff"
echo "  2. Update lockfile: rush update"
echo "  3. Run tests: rush test"
echo "  4. Build all packages: rush build"
echo "  5. Commit changes: git add . && git commit -m 'Bump all versions to $NEW_VERSION'"
echo "  6. Tag the release: git tag v$NEW_VERSION && git push origin v$NEW_VERSION"
echo "  7. For publishable packages, run: rush publish"

# Cleanup
rm -rf "$TEMP_DIR"

print_info "Running rush update to sync lockfile..."
rush update

print_success "Done!"
