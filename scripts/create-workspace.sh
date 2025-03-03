cd ./dev/tool
rushx run-local create-workspace kubik -w DevWorkspace # Create workspace
rushx run-local create-account erkanyldz008@gmail.com -p 1234 -f Erkan -l Yıldız # Create account
rushx run-local configure kubik --list --enable '*' # Enable all modules, even if they are not yet intended to be used by a wide audience.
rushx run-local assign-workspace erkanyldz009@gmail.com kubik # Assign workspace to user.
rushx run-local confirm-email erkanyldz009@gmail.com # To allow the creation of additional test workspaces.