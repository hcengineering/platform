//
// Copyright © 2023 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { type DiffFile } from '@hcengineering/diffview'

export function isDevNullName (name: string): boolean {
  return name === '/dev/null'
}

export function getFileName (file: DiffFile): string {
  const { oldName, newName } = file
  return isDevNullName(newName) ? oldName : newName
}

export function formatFileName (file: DiffFile): string {
  const { oldName, newName } = file

  if (oldName !== newName && !isDevNullName(oldName) && !isDevNullName(newName)) {
    return oldName + ' → ' + newName
  } else if (!isDevNullName(newName)) {
    return newName
  } else {
    return oldName
  }
}
