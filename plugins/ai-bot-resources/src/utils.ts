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
import { derived, writable } from 'svelte/store'
import contact, { type SocialIdentity } from '@hcengineering/contact'
import { personRefByPersonIdStore } from '@hcengineering/contact-resources'
import { createQuery, onClient } from '@hcengineering/presentation'
import { aiBotEmailSocialKey } from '@hcengineering/ai-bot'

export const aiBotSocialIdentityStore = writable<SocialIdentity>()
const identityQuery = createQuery(true)

export const aiBotPersonRefStore = derived(
  [personRefByPersonIdStore, aiBotSocialIdentityStore],
  ([personRefByPersonId, aiBotSocialIdentity]) => {
    return personRefByPersonId.get(aiBotSocialIdentity?._id)
  }
)

onClient(() => {
  identityQuery.query(contact.class.SocialIdentity, { key: aiBotEmailSocialKey }, (res) => {
    aiBotSocialIdentityStore.set(res[0])
  })
})
