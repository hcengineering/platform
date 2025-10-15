//
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
//

import { getMetadata } from '@hcengineering/platform'
import contact from '@hcengineering/contact'
import { type Person } from '@hcengineering/core'
import { avatarWhiteColors, avatarDarkColors, type ColorDefinition } from '@hcengineering/ui'
import { type UserProfile, getClient as getAccountClientRaw, type AccountClient } from '@hcengineering/account-client'
import login from '@hcengineering/login'
import presentation from '@hcengineering/presentation'

export function getDisplayName (person: Person): string {
  return getMetadata(contact.metadata.LastNameFirst) === true
    ? person.lastName + ' ' + person.firstName
    : person.firstName + ' ' + person.lastName
}

export function getAvatarText (person: Person): string {
  const first = person.firstName[0]
  const last = person.lastName[0]

  if (last == null) {
    return first ?? ''
  }

  return getMetadata(contact.metadata.LastNameFirst) === true ? last + first : first + last
}

export function getLocation (profile: Pick<UserProfile, 'city' | 'country'>): string {
  const { city, country } = profile

  if (city == null || city === '') {
    return country ?? ''
  }

  if (country == null || country === '') {
    return city ?? ''
  }

  return city + ', ' + country
}

export function getAccountClient (): AccountClient {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)
  const token = getMetadata(presentation.metadata.Token)

  return getAccountClientRaw(accountsUrl, token)
}

export function getAvatarColorForId (id: string | null | undefined, isDark: boolean): ColorDefinition {
  let index = 0

  if (id != null) {
    let hash = 0

    for (let i = 0; i < id.length; i++) {
      hash += id.charCodeAt(i)
    }

    index = hash % avatarWhiteColors.length
  }

  return isDark ? avatarDarkColors[index] : avatarWhiteColors[index]
}
