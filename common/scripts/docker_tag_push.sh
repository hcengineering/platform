#!/usr/bin/env bash
echo "Tagging release $1 with version $2"  
docker tag "$1" "$1:$2"
for n in {1..25}; do
  docker push "$1:$2" && break
  echo 'Docker failed to push, wait 5 seconds'
  sleep 5
done  