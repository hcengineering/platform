#!/bin/bash

# Source required modules
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." &> /dev/null && pwd)"
source "${SCRIPT_DIR}/lib/logging.sh"
source "${SCRIPT_DIR}/lib/os_utils.sh"

check_network() {
    log_info "Checking network connection..."
    if ! ping -c 4 8.8.8.8 > /dev/null 2>&1; then
        log_error "No network connection"
        exit 1
    fi
}

install_node() {
    log_info "Setting up Node.js..."
    local os=$(detect_os)
    case "$os" in
        macos)
            if ! brew list node@$NODE_VERSION &>/dev/null; then
                log_info "Installing node@$NODE_VERSION..."
                brew install node@$NODE_VERSION
                brew link --force --overwrite node@$NODE_VERSION
            fi
            ;;
        linux)
            log_info "Installing Node.js $NODE_VERSION..."
            curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        *)
            log_error "Unsupported operating system for Node.js installation"
            exit 1
            ;;
    esac

    # Update npm to specified version
    log_info "Updating npm to version $NPM_VERSION..."
    npm install -g "npm@$NPM_VERSION"

    # Install specific version of pnpm
    log_info "Installing pnpm version $PNPM_VERSION..."
    npm install -g "pnpm@$PNPM_VERSION"

    # Verify installations
    log_info "Node.js version: $(node --version)"
    log_info "npm version: $(npm --version)"
    log_info "pnpm version: $(pnpm --version)"
}

install_mongodb() {
    log_info "Checking MongoDB..."
    local os=$(detect_os)
    case "$os" in
        macos)
            if ! command -v mongod &> /dev/null; then
                log_info "Installing MongoDB..."
                brew tap mongodb/brew
                brew install mongodb-community
            fi
            brew services restart mongodb-community
            ;;
        linux)
            if ! command -v mongod &> /dev/null; then
                log_info "Installing MongoDB..."
                wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
                echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
                sudo apt-get update
                sudo apt-get install -y mongodb-org
            fi
            sudo systemctl restart mongod
            ;;
        *)
            log_error "Unsupported operating system for MongoDB installation"
            exit 1
            ;;
    esac

    # Wait for MongoDB to start
    log_info "Waiting for MongoDB to start..."
    for i in {1..30}; do
        if mongosh --eval "db.runCommand({ ping: 1 })" --quiet &>/dev/null; then
            log_info "MongoDB is running"
            break
        fi
        sleep 1
        if [ $i -eq 30 ]; then
            log_error "MongoDB failed to start"
            exit 1
        fi
    done
}

check_docker() {
    log_info "Checking Docker..."
    local os=$(detect_os)
    case "$os" in
        macos)
            if ! [ -d "/Applications/Docker.app" ]; then
                log_error "Docker Desktop is not installed"
                echo "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
                exit 1
            fi
            if ! pgrep -f Docker.app > /dev/null; then
                log_info "Starting Docker Desktop..."
                open -a Docker
            fi
            ;;
        linux)
            if ! command -v docker &> /dev/null; then
                log_error "Docker is not installed"
                echo "Please install Docker using your distribution's package manager"
                exit 1
            fi
            if ! systemctl is-active --quiet docker; then
                log_info "Starting Docker service..."
                sudo systemctl start docker
            fi
            ;;
    esac

    # Wait for Docker to start
    log_info "Waiting for Docker to start..."
    for i in {1..60}; do
        if docker info &>/dev/null; then
            log_info "Docker is running"
            break
        fi
        sleep 1
        if [ $i -eq 60 ]; then
            log_error "Docker failed to start"
            exit 1
        fi
    done
}

# Main execution
log_info "Starting dependency check..."

check_network
install_package_manager
install_node
install_mongodb
check_docker

log_info "All dependencies checked and installed successfully"

# Print versions
echo "
Installed versions:
Node.js: $(node --version)
npm: $(npm --version)
pnpm: $(pnpm --version)
MongoDB: $(mongod --version | grep 'db version' | cut -d ' ' -f 3)
Docker: $(docker --version | cut -d ' ' -f 3)

NOTE: You may need to restart your terminal for PATH updates to take effect.
"
