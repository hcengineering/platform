#!/bin/bash

version=$(git describe --tags --abbrev=0)

if [ "x$2" = "xstaging" ]
then
  a=( ${version//./ } )
  ((a[2]++))
  version="${a[0]}.${a[1]}.${a[2]}-staging"
  echo "Tagging stating $1 with version ${version}"
  docker tag "$1" "$1:$version"
  docker push "$1:$version"
else
  echo "Tagging release $1 with version ${version}"  
  docker tag "$1" "$1:$version"
  docker push "$1:$version"
  docker push "$1:latest"
fi
