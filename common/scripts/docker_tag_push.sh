#!/bin/bash
echo "Tagging release $1 with version $2"  
docker tag "$1" "$1:$2"
docker push "$1:$2"
