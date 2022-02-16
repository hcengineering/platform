#!/bin/bash

roots='./server/server ./server/front ./pods/account'

for r in $roots
do
  pushd $r
  rushx docker:build
  popd
done