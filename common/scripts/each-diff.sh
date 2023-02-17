#!/usr/bin/env bash

FILES=$(git diff origin/main --name-only --diff-filter=ACMR | sed 's| |\\ |g')
[ -z "$FILES" ] && exit 0

roots=$(rush list -p --json | grep "path" | cut -f 2 -d ':' | cut -f 2 -d '"')

declare -a changed_roots

pushd () {
    command pushd "$@" > /dev/null
}

popd () {
    command popd "$@" > /dev/null
}

if [ -n "$FILES" ]; then
  for file in $FILES; do
    # Match file to root
    for r in $roots; do
      if [[ "$file" == ${r}* ]]; then
        echo -e "${file}"
        if [[ ! " ${changed_roots[@]} " =~ " ${r} " ]]; then
          changed_roots+=("$r")
        fi
      fi
    done
  done
  for value in "${changed_roots[@]}"; do
    echo -e "\033[0;34mProcessing \033[0;31m${value}\033[0m"
    exec 3>&1
    exec 1> >(paste /dev/null -)
    pushd $value > /dev/null
    $@
    retVal=$?
    if [ $retVal -ne 0 ]; then
      echo "Error"
      exit 1
    fi
    popd > /dev/null
    exec 1>&3 3>&-  
  done
fi