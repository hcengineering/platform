cd ./dev/tool
rushx run-local create-account user1 -p 1234 -f John -l Appleseed # Create account
rushx run-local create-workspace ws1 -b DevWorkspace # Create workspace
rushx run-local configure ws1 --list --enable '*' # Enable all modules, even if they are not yet intended to be used by a wide audience.
rushx run-local assign-workspace user1 ws1 # Assign workspace to user.
