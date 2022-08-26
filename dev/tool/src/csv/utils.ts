//
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

import contact, { ChannelProvider, Contact } from '@anticrm/contact'
import { Class, Doc, Ref, TxOperations } from '@anticrm/core'

export function filled (obj: any, uniqKeys: string[]): any {
  const result: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && v.trim().length === 0) {
      continue
    }
    if (!uniqKeys.includes(k)) {
      uniqKeys.push(k)
    }
    result[k] = v
  }
  return result
}

export async function updateChannel (
  client: TxOperations,
  attachedTo: Ref<Contact>,
  value: string | undefined,
  provider: Ref<ChannelProvider>,
  attachToClass: Ref<Class<Doc>> = contact.class.Person
): Promise<void> {
  if (value === undefined) {
    return
  }
  const channels = await client.findAll(contact.class.Channel, { attachedTo })
  const valueCh = channels.find((it) => it.value === value)
  if (valueCh === undefined) {
    await client.addCollection(contact.class.Channel, contact.space.Contacts, attachedTo, attachToClass, 'channels', {
      value,
      provider
    })
  }
}
export function getValid (record: any, ...names: string[]): string | undefined {
  for (const o of names) {
    const v = record[o]
    if (v !== undefined && typeof v === 'string' && v.trim().length > 0) {
      return v
    }
  }
}
