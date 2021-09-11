#!/bin/bash
#
#  Copyright © 2020 Anticrm Platform Contributors.
#  
#  Licensed under the Eclipse Public License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License. You may
#  obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
#  
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  
#  See the License for the specific language governing permissions and
#  limitations under the License.
#

set -e

sourceDir=$(dirname "$0")
sourceDir=$(realpath "$sourceDir")
runScript=$sourceDir/install-run-rushx.js

roots=$(node $sourceDir/install-run-rush.js list -f --json | grep "fullPath" | cut -f 2 -d ':' | cut -f 2 -d '"')
for i in $roots
do  
  pushd ${i}

  node ${runScript} $@
  
  retVal=$?  
  if [ $retVal -ne 0 ]; then
    echo "Error"
    exit $retVal
  fi
  popd
done
