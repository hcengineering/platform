//
// Copyright © 2020 Anticrm Platform Contributors.
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

// import type { Metadata } from '@anticrm/platform'
import type { Metadata } from '@anticrm/platform'
import { setMetadata } from '@anticrm/platform'

export function setMetadataLocalStorage (id: Metadata<string>, value: string | null): void {
  if (value != null) {
    localStorage.setItem(id, value)
  } else {
    localStorage.removeItem(id)
  }
  setMetadata(id, value)
}

export function fetchMetadataLocalStorage (id: Metadata<string>): string | null {
  const value = localStorage.getItem(id)
  if (value !== null) {
    setMetadata(id, value)
  }
  return value
}
