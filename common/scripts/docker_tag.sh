#!/usr/bin/env bash

version=$(git describe --tags --abbrev=0)
rev_version=$(git rev-parse HEAD)

if [ "x$2" = "xstaging" ]
then
  a=( ${version//./ } )
  c=( ${a[2]//[^0-9]*/ } )
  ((c++))
  version="${a[0]}.${a[1]}.${c}-staging"
  echo "Tagging stating $1 with version ${version}"
  docker tag "$1:$rev_version" "$1:$version"
  for n in {1..5}; do
    docker push "$1:$version" && break
    echo 'Docker failed to push, wait 5 seconds'
    sleep 5
  done
else
  echo "Tagging release $1 with version ${version}"  
  docker tag "$1:$rev_version" "$1:$version"
  docker tag "$1:$rev_version" "$1:latest"
  for n in {1..5}; do
    docker push "$1:$version" && break
    echo 'Docker failed to push, wait 5 seconds'
    sleep 5
  done
  for n in {1..5}; do
    docker push "$1:latest" && break
    echo 'Docker failed to push, wait 5 seconds'
    sleep 5
  done
fi
