#!/bin/sh

roots=$(rush list -p --json | grep "path" | cut -f 2 -d ':' | cut -f 2 -d '"')
files="svelte-check.log svelte-check-err.log"
for file in $roots; do
  for check in $files; do
    f="$file/.svelte-check/$check"
    if [ -f $f ]; then
      if grep -q "error" "$f"; then
        if ! grep -q "0 errors" "$f"; then
          if ! grep -q "error.ts" "$f"; then
            echo "\nErrors in $f\n"
            cat "$f" | grep -B1 "Error:" | grep -v "^--$" | sed "s/Error:/$(echo '\033[31m')Error:$(echo '\033[0m')/"
          fi
        fi
      fi
    fi
  done
done