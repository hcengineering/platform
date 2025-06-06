#!/bin/bash
# npm install -g cpupro
for profile in $(ls ./profiles/*.cpuprofile); do
  name=${profile/\.cpuprofile/}
  if ! test -f $name.html; then
    cpupro $profile -f "$name.html" --no-open
  fi
done
