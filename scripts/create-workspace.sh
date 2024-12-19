cd ./dev/tool
pnpm run-local create-workspace ws1 -w DevWorkspace # Create workspace
pnpm run-local create-account user1 -p 1234 -f John -l Appleseed # Create account
pnpm run-local configure ws1 --list --enable '*' # Enable all modules, even if they are not yet intended to be used by a wide audience.
pnpm run-local assign-workspace user1 ws1 # Assign workspace to user.
pnpm run-local confirm-email user1 # To allow the creation of additional test workspaces.
