#!/bin/bash

roots='./server/server ./server/front ./pods/account ./products/tracker'

for r in $roots
do
  pushd $r
  rushx docker:build
  popd
done