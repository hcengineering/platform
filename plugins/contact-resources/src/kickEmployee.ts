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

import type { Person } from '@hcengineering/contact'
import type { AccountUuid, Ref } from '@hcengineering/core'

/**
 * Returns true if the given person is the currently logged in user.
 * Used to prevent kicking yourself out of the workspace; leaving is done from the profile settings.
 */
export function isCurrentUser (
  person: Pick<Person, '_id' | 'personUuid'>,
  currentAccount: AccountUuid | undefined,
  currentEmployee: Ref<Person> | undefined
): boolean {
  if (currentAccount !== undefined && person.personUuid === currentAccount) return true
  return currentEmployee !== undefined && person._id === currentEmployee
}

/**
 * Kick is available only for a single employee which is not the current user.
 */
export function canKick (
  doc: Pick<Person, '_id' | 'personUuid'> | Array<Pick<Person, '_id' | 'personUuid'>> | undefined,
  currentAccount: AccountUuid | undefined,
  currentEmployee: Ref<Person> | undefined
): boolean {
  if (doc === undefined) return false
  const docs = Array.isArray(doc) ? doc : [doc]
  return docs.length > 0 && !docs.some((it) => isCurrentUser(it, currentAccount, currentEmployee))
}
