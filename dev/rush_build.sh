#!/bin/bash

# Save current directory
current_dir=$(pwd)

# Change to dev directory
cd "$(dirname "$0")" || exit

# Run the commands
rush build
rush rebuild
rush bundle
rush package
rush validate
rush svelte-check  # Optional
rush docker:build
rush docker:up

# Return to original directory
cd "$current_dir"
