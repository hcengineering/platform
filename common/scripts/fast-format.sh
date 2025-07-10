#!/usr/bin/env bash
echo $@
BASE_BRANCH=${1:-develop}
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --branch) BASE_BRANCH="$2"; shift ;;
    *) ;;
  esac
  shift
done
export BASE_BRANCH
./common/scripts/each-diff.sh rushx format --force