cd ./dev/
rush build    # Will build all the required packages.
rush bundle   # Will prepare bundles.
rush docker:build   # Will build Docker containers for all applications in the local Docker environment.
docker-compose up -d --force-recreate # Will set up all the containers

