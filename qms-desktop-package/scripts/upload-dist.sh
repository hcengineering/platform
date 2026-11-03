#!/bin/bash
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
#
# Uploads the desktop release prepared by copy-publish-artifacts.sh to the dist bucket.
#
# Usage: upload-dist.sh <folder> <bucket> <endpoint_url>
#
# Guarantees that a published update manifest always describes the binaries
# that are actually in the bucket:
#   * a version is immutable: if its manifest is already in the bucket the
#     upload is refused (bump the tag instead of rebuilding the same version -
#     every signed build produces a different file);
#   * binaries are uploaded with `aws s3 cp`, which always overwrites
#     (`aws s3 sync` skips same-sized files and can leave a manifest from
#     another build in place);
#   * manifests (*.yml) are uploaded last, only after the size of every binary
#     in the bucket has been verified.

set -euo pipefail

FOLDER="${1:?Expected folder with publish artifacts}"
BUCKET="${2:?Expected bucket}"
ENDPOINT="${3:?Expected endpoint url}"
ATTEMPTS=3

s3api () {
  aws s3api "$@" --endpoint-url "$ENDPOINT"
}

# Prints the size of an object, or nothing if the object does not exist.
# Any other failure (5xx, auth, network) is an error: treating it as "absent"
# would let an already published release be overwritten.
remote_size () {
  local err status=0 size
  err="$(mktemp)"
  size="$(s3api head-object --bucket "$BUCKET" --key "$1" --query ContentLength --output text 2>"$err")" || status=$?
  if (( status == 0 )); then
    rm -f "$err"
    echo "$size"
    return 0
  fi
  if grep -qE '\(404\)|Not Found|NoSuchKey' "$err"; then
    rm -f "$err"
    return 0
  fi
  echo "::error::Cannot check s3://$BUCKET/$1: $(cat "$err")" >&2
  rm -f "$err"
  return 1
}

local_size () {
  wc -c < "$1" | tr -d ' '
}

upload () {
  local file="$1" key
  key="$(basename "$file")"
  for i in $(seq 1 "$ATTEMPTS"); do
    if aws s3 cp --only-show-errors "$file" "s3://$BUCKET/$key" --endpoint-url "$ENDPOINT" \
      && uploaded_size="$(remote_size "$key")" \
      && [[ "$uploaded_size" == "$(local_size "$file")" ]]; then
      echo "Uploaded $key ($(local_size "$file") bytes)"
      return 0
    fi
    echo "::warning::Upload of $key failed or size mismatch (attempt $i/$ATTEMPTS)"
    if (( i < ATTEMPTS )); then
      sleep 30
    fi
  done
  echo "::error::Failed to upload $key"
  exit 1
}

shopt -s nullglob
manifests=("$FOLDER"/*.yml)
binaries=()
for file in "$FOLDER"/*; do
  [[ "$file" == *.yml ]] || binaries+=("$file")
done
if (( ${#manifests[@]} == 0 || ${#binaries[@]} == 0 )); then
  echo "::error::Nothing to publish in $FOLDER" >&2
  exit 1
fi

# Every file referenced by a manifest must be part of this upload
for manifest in "${manifests[@]}"; do
  while read -r url; do
    if [[ ! -f "$FOLDER/$url" ]]; then
      echo "::error::$(basename "$manifest") references $url which is not in $FOLDER" >&2
      exit 1
    fi
  done < <(sed -nE "s/^[[:space:]]*(-[[:space:]]*)?url:[[:space:]]*[\"']?([^\"'[:space:]]+).*/\2/p" "$manifest")
done

for manifest in "${manifests[@]}"; do
  key="$(basename "$manifest")"
  published_size="$(remote_size "$key")" || exit 1
  if [[ -n "$published_size" ]]; then
    echo "::error::$key is already published. Versions are immutable: create a new tag instead of rebuilding this one" \
      "(this also applies when an earlier upload of this version stopped half-way: publish.sh needs all manifests of a version)." >&2
    exit 1
  fi
done

for file in "${binaries[@]}"; do
  upload "$file"
done
for manifest in "${manifests[@]}"; do
  upload "$manifest"
done
echo "Published ${#binaries[@]} binaries and ${#manifests[@]} manifests"
