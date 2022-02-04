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
  import type { Channel, ChannelProvider } from '@anticrm/contact'
  import type { Doc, Ref, Timestamp } from '@anticrm/core'
  import type { Asset, IntlString } from '@anticrm/platform'
  import type { AnyComponent } from '@anticrm/ui'
  import { CircleButton, Tooltip } from '@anticrm/ui'
  import { createEventDispatcher, getContext } from 'svelte'
  import { Writable } from 'svelte/store'
  import { getChannelProviders } from '../utils'
  import ChannelsPopup from './ChannelsPopup.svelte'

  export let value: Channel[] | Channel | null
  export let size: 'small' | 'medium' | 'large' | 'x-large' = 'large'
  export let reverse: boolean = false
  export let integrations: Set<Ref<Doc>> = new Set<Ref<Doc>>()
  const lastViews = getContext('lastViews') as Writable<Map<Ref<Doc>, Timestamp>>

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
    item: Channel,
    map: Map<Ref<ChannelProvider>, ChannelProvider>,
    lastViews: Map<Ref<Doc>, Timestamp>
  ): any | undefined {
    const provider = map.get(item.provider)
    if (provider) {
      const lastView = lastViews.get(item._id)
      const notification = lastView ? lastView < item.modifiedOn : (item.items ?? 0) > 0
      return {
        label: provider.label as IntlString,
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

  async function update (value: Channel[] | Channel, lastViews: Map<Ref<Doc>, Timestamp>) {
    const result = []
    const map = await getChannelProviders()
    if (Array.isArray(value)) {
      for (const item of value) {
        const provider = getProvider(item, map, lastViews)
        if (provider !== undefined) {
          result.push(provider)
        }
      }
    } else {
      const provider = getProvider(value, map, lastViews)
      if (provider !== undefined) {
        result.push(provider)
      }
    }
    displayItems = result
  }

  $: if (value) update(value, $lastViews)

  let displayItems: Item[] = []
  let divHTML: HTMLElement
</script>

<div
  bind:this={divHTML}
  class="flex-row-center"
  class:safari-gap-1={size === 'small'}
  class:safari-gap-2={size !== 'small'}
  class:reverse
>
  {#each displayItems as item}
    <div
      on:click|stopPropagation={() => {
        dispatch('click', item)
      }}
    >
      <Tooltip component={ChannelsPopup} props={{ value: item }} label={undefined} anchor={divHTML}>
        <CircleButton icon={item.icon} {size} primary={item.integration || item.notification} />
      </Tooltip>
    </div>
  {/each}
</div>
