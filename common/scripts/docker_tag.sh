#!/bin/bash

version=$(git describe --tags --abbrev=0)

if [ "x$2" = "xstaging" ]
then
  a=( ${version//./ } )
  c=( ${a[2]//[^0-9]*/ } )
  ((c++))
  version="${a[0]}.${a[1]}.${c}-staging"
  echo "Tagging stating $1 with version ${version}"
  docker tag "$1" "$1:$version"
  docker push "$1:$version"
else
  echo "Tagging release $1 with version ${version}"  
  docker tag "$1" "$1:$version"
  docker push "$1:$version"
  docker push "$1:latest"
fi
