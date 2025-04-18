// Copyright © 2025 Hardcore Engineering Inc.
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
import { get, writable } from 'svelte/store'

import type { AccountUuid, Class, Ref } from '@hcengineering/core'
import type { Person } from '@hcengineering/contact'
import { getClient } from '@hcengineering/presentation'
import type { LabelAndProps } from '@hcengineering/ui'

import contact from '../../plugin'
import EmployeePreviewPopup from './EmployeePreviewPopup.svelte'
import { getAccountClient } from '../../utils'

const client = getClient()
const h = client.getHierarchy()

export function getPreviewPopup (
  person: Person | { _id?: Ref<Person>, _class?: Ref<Class<Person>> } | undefined,
  showPopup: boolean
): LabelAndProps | undefined {
  if (person?._id === undefined || person?._class === undefined || !showPopup) return
  const isPerson = person != null && h.isDerived(person._class, contact.class.Person)
  const employee = isPerson ? h.as(person as Person, contact.mixin.Employee) : undefined
  return {
    component: EmployeePreviewPopup,
    props: { _id: person._id, classList: ['modern'], disabled: employee?.active === false },
    timeout: 300,
    style: 'modern',
    noArrow: true
  }
}

export const timezoneByAccountStore = writable<Map<AccountUuid, string>>(new Map())

export async function getPersonTimezone (personId: AccountUuid | undefined): Promise<string | undefined> {
  if (personId === undefined) return undefined

  const storedTimezone = get(timezoneByAccountStore).get(personId)
  if (storedTimezone !== undefined) return storedTimezone

  try {
    const accountInfo = await getAccountClient().getAccountInfo(personId)
    if (accountInfo.timezone !== undefined) {
      timezoneByAccountStore.update((store: Map<AccountUuid, string>) => {
        if (accountInfo.timezone !== undefined) {
          store.set(personId, accountInfo.timezone)
        }
        return store
      })
    }
    return accountInfo.timezone
  } catch (error) {
    console.error(error)
    return undefined
  }
}
