#!/bin/bash

outDir=$(pwd)/${2:-"diff"}
rm -rf "$outDir"

mkdir -p "$outDir"
git diff --name-only $1 | grep -v .json | grep -v .md | while read p
do
    base=$(dirname $p)
    echo "Processing $p"
    git diff $1 -- "$p" > "$outDir/${p//\//_}.diff"

    # do something...
done
