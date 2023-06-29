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
  import type { AttachedData, Class, Doc, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { ButtonKind, ButtonSize, closeTooltip } from '@hcengineering/ui'

  import { Channel, ChannelProvider } from '@hcengineering/contact'
  import { showPopup } from '@hcengineering/ui'
  import contact from '../plugin'
  import ChannelsDropdown from './ChannelsDropdown.svelte'

  export let attachedTo: Ref<Doc>
  export let attachedClass: Ref<Class<Doc>>
  export let integrations: Set<Ref<Doc>> | undefined = undefined
  export let editable: boolean = true
  export let allowOpen = true
  export let focusIndex = -1

  export let kind: ButtonKind = 'link-bordered'
  export let size: ButtonSize = 'small'
  export let length: 'short' | 'full' = 'full'
  export let shape: 'circle' | undefined = 'circle'
  export let restricted: Ref<ChannelProvider>[] = []

  let channels: Channel[] = []

  const query = createQuery()
  $: attachedTo &&
    query.query(
      contact.class.Channel,
      {
        attachedTo
      },
      (res) => {
        channels = res
      }
    )

  const client = getClient()

  async function remove (value: Channel | AttachedData<Channel>): Promise<void> {
    if (!editable) return
    if ('_id' in value) {
      await client.remove(value)
    }
  }

  async function saveHandler (value: Channel | AttachedData<Channel>): Promise<void> {
    if (!editable) return
    if ('_id' in value) {
      await client.update(value, {
        value: value.value
      })
    } else {
      await client.addCollection(contact.class.Channel, contact.space.Contacts, attachedTo, attachedClass, 'channels', {
        value: value.value,
        provider: value.provider
      })
    }
  }

  function _open (ev: any) {
    if (ev.detail.presenter !== undefined) {
      if (allowOpen) {
        closeTooltip()
        showPopup(ev.detail.presenter, { channel: ev.detail.channel }, 'float')
      }
    }
  }
</script>

<ChannelsDropdown
  value={channels}
  {kind}
  {size}
  {length}
  {integrations}
  {editable}
  {restricted}
  {shape}
  {focusIndex}
  on:remove={(e) => {
    remove(e.detail)
  }}
  on:save={(e) => {
    saveHandler(e.detail)
  }}
  on:open={_open}
/>
