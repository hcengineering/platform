#!/bin/bash

# Source required modules
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
source "${SCRIPT_DIR}/config/default.conf"
source "${SCRIPT_DIR}/lib/logging.sh"
source "${SCRIPT_DIR}/lib/os_utils.sh"

# Command line arguments
ACTION=$1
WORKSPACE_NAME=${2:-$DEFAULT_WORKSPACE}

usage() {
    echo "Usage: $0 [clean|check|prepare|workspace|all] [workspace_name]"
    exit 1
}

run_clean() {
    log_info "Starting system cleanup..."
    bash scripts/clean-system.sh
}

run_dependency_check() {
    log_info "Checking dependencies..."
    bash scripts/dependency-check.sh
}

run_prepare_branch() {
    log_info "Preparing branch..."
    bash scripts/prepare-branch.sh
}

run_create_workspace() {
    log_info "Creating workspace ${WORKSPACE_NAME}..."
    bash scripts/create-workspace.sh "$WORKSPACE_NAME"
}

# Create scripts directory if it doesn't exist
mkdir -p "${SCRIPT_DIR}/scripts"

# Ensure we have a valid action
case "$ACTION" in
    clean)
        run_clean
        ;;
    check)
        run_dependency_check
        ;;
    prepare)
        run_prepare_branch
        ;;
    workspace)
        run_create_workspace
        ;;
    all)
        log_info "Starting full deployment process..."
        run_clean
        run_dependency_check
        run_prepare_branch
        run_create_workspace
        log_info "Full deployment completed successfully"
        ;;
    *)
        usage
        ;;
esac
