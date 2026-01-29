//
// Copyright © 2026 Hardcore Engineering Inc.
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

import type { Hierarchy, PersonId } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import { getName, getPersonByPersonId } from '@hcengineering/contact'

/**
 * Load person display name by PersonId with optional caching
 */
export async function loadPersonName (
  personId: PersonId,
  hierarchy: Hierarchy,
  userCache?: Map<PersonId, string>
): Promise<string> {
  if (userCache !== undefined) {
    const cachedName = userCache.get(personId)
    if (cachedName !== undefined) {
      return cachedName
    }
  }

  try {
    const client = getClient()
    const person = await getPersonByPersonId(client, personId)
    if (person !== null) {
      const name = getName(hierarchy, person)
      if (userCache !== undefined) {
        userCache.set(personId, name)
      }
      return name
    }
  } catch (error) {
    console.warn('Failed to lookup user name for PersonId:', personId, error)
  }

  return personId
}
