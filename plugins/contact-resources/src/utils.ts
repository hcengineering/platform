//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2022 Hardcore Engineering Inc.
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

import contact, { ChannelProvider } from '@anticrm/contact'
import { Ref, Timestamp } from '@anticrm/core'
import { getClient } from '@anticrm/presentation'

const client = getClient()
const channelProviders = client.findAll(contact.class.ChannelProvider, {})

export async function getChannelProviders (): Promise<Map<Ref<ChannelProvider>, ChannelProvider>> {
  const cp = await channelProviders
  const map = new Map<Ref<ChannelProvider>, ChannelProvider>()
  for (const provider of cp) {
    map.set(provider._id, provider)
  }
  return map
}

export function formatDate (dueDateMs: Timestamp): string {
  return new Date(dueDateMs).toLocaleString('default', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
