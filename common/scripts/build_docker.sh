#!/bin/bash

roots='./server/server ./server/front ./pods/account ./pods/backup ./products/tracker'

for r in $roots
do
  pushd $r
  rushx docker:build
  popd
done