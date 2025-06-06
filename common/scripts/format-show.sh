#!/bin/sh

roots=$(rush list -p --json | grep "path" | cut -f 2 -d ':' | cut -f 2 -d '"')
files="eslint.log prettier.log"
for file in $roots; do
  for check in $files; do
    f="$file/.format/$check"
    if [ -f $f ]; then
      if grep -q "error" "$f"; then
        if ! grep -q "0 errors" "$f"; then
          if ! grep -q "error.ts" "$f"; then
            echo "Errors in $f"
            cat "$f"
          fi
        fi
      fi
    fi
  done
done