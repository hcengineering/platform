<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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
-->
<script lang="ts">
  import type { Class, Doc, Ref } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import type { ButtonKind, ButtonSize } from '@anticrm/ui'

  import { ChannelProvider, Channel } from '@anticrm/contact'
  import { showPanel } from '@anticrm/ui'
  import view from '@anticrm/view'
  import contact from '../plugin'
  import Channels from './Channels.svelte'
  import ChannelsView from './ChannelsView.svelte'
  import ChannelsDropdown from './ChannelsDropdown.svelte'

  export let attachedTo: Ref<Doc>
  export let attachedClass: Ref<Class<Doc>>
  export let integrations: Set<Ref<Doc>> | undefined = undefined
  export let editable = true

  export let kind: ButtonKind = 'link-bordered'
  export let size: ButtonSize = 'small'
  export let length: 'short' | 'full' = 'full'
  export let shape: 'circle' | undefined = 'circle'

  let channels: Channel[] = []

  function findValue (provider: Ref<ChannelProvider>): Channel | undefined {
    for (let i = 0; i < channels.length; i++) {
      if (channels[i].provider === provider) return channels[i]
    }
    return undefined
  }

  const query = createQuery()
  $: attachedTo && query.query(
    contact.class.Channel,
    {
      attachedTo: attachedTo
    },
    (res) => {
      channels = res
    }
  )

  const client = getClient()

  async function save (newValues: Channel[]): Promise<void> {
    const currentProviders = new Set(channels.map((p) => p.provider))
    const promises = []
    for (const value of newValues) {
      const oldChannel = findValue(value.provider)
      if (oldChannel === undefined) {
        if (value.value.length === 0) continue
        promises.push(
          client.addCollection(contact.class.Channel, contact.space.Contacts, attachedTo, attachedClass, 'channels', {
            value: value.value,
            provider: value.provider
          })
        )
      } else {
        currentProviders.delete(value.provider)
        if (value.value === oldChannel.value) continue
        promises.push(
          client.updateCollection(
            oldChannel._class,
            oldChannel.space,
            oldChannel._id,
            oldChannel.attachedTo,
            oldChannel.attachedToClass,
            oldChannel.collection,
            {
              value: value.value
            }
          )
        )
      }
    }
    for (const value of currentProviders) {
      const oldChannel = findValue(value)
      if (oldChannel === undefined) continue
      promises.push(
        client.removeCollection(
          oldChannel._class,
          oldChannel.space,
          oldChannel._id,
          oldChannel.attachedTo,
          oldChannel.attachedToClass,
          oldChannel.collection
        )
      )
    }
    Promise.all(promises)
  }
</script>

<ChannelsDropdown
  value={channels}
  {kind}
  {size}
  {length}
  {integrations}
  {editable}
  {shape}
  on:change={(e) => {
    if (editable) save(e.detail)
  }}
/>
