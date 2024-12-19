#!/bin/bash

# Source required modules
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." &> /dev/null && pwd)"
source "${SCRIPT_DIR}/lib/logging.sh"
source "${SCRIPT_DIR}/lib/os_utils.sh"

analyze_space() {
    log_info "Analyzing disk usage:"
    echo "============================================"
    log_info "Top 10 largest directories in project:"
    du -h -d 1 "${BASE_DIR}" | sort -hr | head -10

    log_info "Top 10 largest files in project:"
    find "${BASE_DIR}" -type f -exec du -h {} + | sort -hr | head -10

    log_info "Docker usage:"
    docker system df

    log_info "NPM cache size:"
    du -h ~/.npm | tail -1

    echo "============================================"
}

clean_system_cache() {
    local os=$(detect_os)
    case "$os" in
        macos)
            log_info "Cleaning development-specific caches..."
            rm -rf ~/Library/Caches/npm
            rm -rf ~/Library/Caches/typescript
            rm -rf ~/Library/Caches/yarn
            rm -rf ~/Library/Caches/pnpm
            ;;
        linux)
            log_info "Cleaning development-specific caches..."
            rm -rf ~/.cache/npm
            rm -rf ~/.cache/typescript
            rm -rf ~/.cache/yarn
            rm -rf ~/.cache/pnpm
            ;;
        *)
            log_warning "Unknown OS type, skipping cache cleanup"
            ;;
    esac
}

# Start cleanup process
log_info "Starting system cleanup..."
analyze_space

# Clean npm cache
if command -v npm &> /dev/null; then
    log_info "Cleaning npm cache..."
    npm cache clean --force
fi

# Clean Docker - use safer approach
if command -v docker &> /dev/null; then
    log_info "Cleaning unused Docker resources..."
    # Only remove unused containers and images
    docker container prune -f
    docker image prune -f
fi

# Clean system cache
clean_system_cache

# Clean Homebrew if available
if command -v brew &> /dev/null; then
    log_info "Cleaning Homebrew..."
    brew cleanup -s
    brew autoremove
fi

analyze_space
log_info "System cleanup completed"
