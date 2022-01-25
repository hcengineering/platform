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
  import type { AttachedData, Class, Doc, Ref } from '@anticrm/core'
  import { CircleButton, showPopup, IconAdd, Label } from '@anticrm/ui'
  import presentation, { Channels, createQuery, getClient } from '@anticrm/presentation'

  import { ChannelProvider, Channel } from '@anticrm/contact'
  import contact from '../plugin'

  export let attachedTo: Ref<Doc>
  export let attachedClass: Ref<Class<Doc>>
  export let integrations: Set<Ref<Doc>> | undefined = undefined

  let channels: Channel[] = []

  function findValue (provider: Ref<ChannelProvider>): Channel | undefined {
    for (let i = 0; i < channels.length; i++) {
      if (channels[i].provider === provider) return channels[i]
    }
    return undefined
  }

  const query = createQuery()
  query.query(contact.class.Channel, {
    attachedTo: attachedTo
  }, (res) => {
    channels = res
  })

  const client = getClient()

  async function save (newValues: AttachedData<Channel>[]): Promise<void> {
    const currentProviders = new Set(channels.map((p) => p.provider))
    const promises = []
    for (const value of newValues) {
      const oldChannel = findValue(value.provider)
      if (oldChannel === undefined) { 
        if (value.value.length === 0) continue
        promises.push(client.addCollection(contact.class.Channel, contact.space.Contacts, attachedTo, attachedClass, 'channels', {
          value: value.value,
          provider: value.provider
        }))
      } else {
        currentProviders.delete(value.provider)
        if (value.value === oldChannel.value) continue
        promises.push(client.updateCollection(oldChannel._class, oldChannel.space, oldChannel._id, oldChannel.attachedTo, oldChannel.attachedToClass, oldChannel.collection, {
          value: value.value
        }))
      }
    }
    for (const value of currentProviders) {
      const oldChannel = findValue(value)
      if (oldChannel === undefined) continue
      promises.push(client.removeCollection(oldChannel._class, oldChannel.space, oldChannel._id, oldChannel.attachedTo, oldChannel.attachedToClass, oldChannel.collection))
    }
    Promise.all(promises)
  }
</script>

{#if !channels}
  <CircleButton
    icon={IconAdd}
    size={'small'}
    selected
    on:click={(ev) =>
      showPopup(contact.component.SocialEditor, { values: channels }, ev.target, (result) => {
        save(result)
      })}
  />
  <span><Label label={presentation.string.AddSocialLinks} /></span>
{:else}
  <Channels value={channels} size={'small'} {integrations} on:click />
  <div class="ml-1">
    <CircleButton
      icon={contact.icon.Edit}
      size={'small'}
      selected
      on:click={(ev) =>
        showPopup(contact.component.SocialEditor, { values: channels }, ev.target, (result) => {
          save(result)
        })}
    />
  </div>
{/if}

<style lang="scss">
  span {
    margin-left: 0.5rem;
  }
</style>
