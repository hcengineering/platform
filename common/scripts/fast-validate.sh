#!/usr/bin/env bash
#
# Copyright © 2026 TraceX SAS.
#
# Licensed under the Eclipse Public License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may
# obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#
# See the License for the specific language governing permissions and
# limitations under the License.

set -euo pipefail

BASE_BRANCH=develop

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --branch|-b)
      if [[ "$#" -lt 2 || -z "$2" || "$2" == -* ]]; then
        echo "Expected a branch name after $1." >&2
        exit 1
      fi
      BASE_BRANCH="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

export BASE_BRANCH
./common/scripts/each-diff.sh rushx _phase:validate
