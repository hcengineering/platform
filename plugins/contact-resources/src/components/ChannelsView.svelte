<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import type { Channel, ChannelProvider } from '@hcengineering/contact'
  import { AttachedData, Doc, Ref, toIdMap } from '@hcengineering/core'
  import notification, { DocUpdates } from '@hcengineering/notification'
  import { Asset, IntlString, getResource } from '@hcengineering/platform'
  import type { AnyComponent } from '@hcengineering/ui'
  import { Button } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { Writable, writable } from 'svelte/store'
  import { channelProviders } from '../utils'
  import ChannelsPopup from './ChannelsPopup.svelte'

  export let value: AttachedData<Channel>[] | Channel | null
  export let size: 'small' | 'medium' | 'large' | 'x-large' = 'large'
  export let length: 'short' | 'full' = 'full'
  export let reverse: boolean = false
  export let integrations: Set<Ref<Doc>> = new Set<Ref<Doc>>()

  let docUpdates: Writable<Map<Ref<Doc>, DocUpdates>> = writable(new Map())
  getResource(notification.function.GetNotificationClient).then((res) => (docUpdates = res().docUpdatesStore))

  interface Item {
    label: IntlString
    icon: Asset
    value: string
    presenter?: AnyComponent
    integration: boolean
    notification: boolean
  }

  const dispatch = createEventDispatcher()

  function getProvider (
    item: AttachedData<Channel>,
    map: Map<Ref<ChannelProvider>, ChannelProvider>,
    docUpdates: Map<Ref<Doc>, DocUpdates>
  ): any | undefined {
    const provider = map.get(item.provider)
    if (provider) {
      const notification = (item as Channel)._id !== undefined ? isNew(item as Channel, docUpdates) : false
      return {
        label: provider.label,
        icon: provider.icon as Asset,
        value: item.value,
        presenter: provider.presenter,
        notification,
        integration: provider.integrationType !== undefined ? integrations.has(provider.integrationType) : false
      }
    } else {
      console.log('provider not found: ', item.provider)
    }
  }

  function isNew (item: Channel, docUpdates: Map<Ref<Doc>, DocUpdates>): boolean {
    const docUpdate = docUpdates.get(item._id)
    return docUpdate ? docUpdate.txes.some((p) => p.isNew) : (item.items ?? 0) > 0
  }

  async function update (
    value: AttachedData<Channel>[] | Channel | null,
    docUpdates: Map<Ref<Doc>, DocUpdates>,
    channels: ChannelProvider[]
  ) {
    if (value === null) {
      displayItems = []
      return
    }
    const result: any[] = []
    const map = toIdMap(channels)
    if (Array.isArray(value)) {
      for (const item of value) {
        const provider = getProvider(item, map, docUpdates)
        if (provider !== undefined) {
          result.push(provider)
        }
      }
    } else {
      const provider = getProvider(value, map, docUpdates)
      if (provider !== undefined) {
        result.push(provider)
      }
    }
    displayItems = result
  }

  $: if (value) update(value, $docUpdates, $channelProviders)

  let displayItems: Item[] = []
  let divHTML: HTMLElement
</script>

<div
  bind:this={divHTML}
  class="channels {length}"
  class:one={displayItems?.length === 1}
  class:reverse
  class:small-gap={size === 'small'}
  class:normal-gap={size !== 'small'}
>
  {#each displayItems as item}
    <div class="channel-item">
      <Button
        icon={item.icon}
        kind={'link-bordered'}
        {size}
        highlight={item.integration || item.notification}
        showTooltip={{ component: ChannelsPopup, props: { value: item }, label: undefined, anchor: divHTML }}
        on:click={() => {
          dispatch('click', item)
        }}
      />
    </div>
  {/each}
</div>

<style lang="scss">
  .channels {
    display: grid;
    width: min-content;

    &.one {
      display: block;
    }
    &.short {
      grid-template-columns: repeat(4, min-content);
      grid-auto-rows: auto;
    }
    &.full {
      grid-auto-flow: column;
    }
    &.reverse {
      grid-auto-flow: dense;
    }
    &.small-gap {
      gap: 0.25rem;
    }
    &.normal-gap {
      gap: 0.5rem;
    }
  }
</style>
