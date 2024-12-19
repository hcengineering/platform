#!/bin/bash

# Set script to exit on error
set -e

# Define database configurations to test
DB_TYPES=(mongo cockroach all)

# Store the original directory
ORIGINAL_DIR=$(pwd)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to clean up on exit
cleanup() {
    cd "$ORIGINAL_DIR"
    echo "Test matrix completed"
}
trap cleanup EXIT

# Change to script directory
cd "$SCRIPT_DIR"

# Run tests for each database configuration
for type in "${DB_TYPES[@]}"; do
    echo "=== Testing with DB_TYPE=$type ==="
    export HULY_DB_TYPE=$type

    # Start the appropriate database services
    ../scripts/select-db.sh up -d

    # Wait for services to be ready
    sleep 10

    # Run the tests
    if ! ./run-tests.sh; then
        echo "Tests failed for DB_TYPE=$type"
        ../scripts/select-db.sh down
        exit 1
    fi

    # Clean up after each test run
    ../scripts/select-db.sh down

    echo "=== Completed testing with DB_TYPE=$type ==="
    echo
done

echo "All database configurations tested successfully"
