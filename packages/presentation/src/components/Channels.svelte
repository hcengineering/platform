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
  import type { AttachedData, Doc, Ref } from '@anticrm/core'
  import type { IntlString, Asset } from '@anticrm/platform'
  import type { Channel, ChannelProvider } from '@anticrm/contact'
  import { getClient } from '..'

  import type { AnyComponent } from '@anticrm/ui'
  import { Tooltip, CircleButton } from '@anticrm/ui'
  import ChannelsPopup from './ChannelsPopup.svelte'

  import contact from '@anticrm/contact'
  import { createEventDispatcher } from 'svelte'

  export let value: AttachedData<Channel>[] | null
  export let size: 'small' | 'medium' | 'large' | 'x-large' = 'large'
  export let reverse: boolean = false
  export let integrations: Set<Ref<Doc>> = new Set<Ref<Doc>>()

  interface Item {
    label: IntlString
    icon: Asset
    value: string
    presenter?: AnyComponent
    integration: boolean
  }

  const client = getClient()
  const dispatch = createEventDispatcher()

  async function getProviders (): Promise<Map<Ref<ChannelProvider>, ChannelProvider>> {
    const providers = await client.findAll(contact.class.ChannelProvider, {})
    const map = new Map<Ref<ChannelProvider>, ChannelProvider>()
    for (const provider of providers) {
      map.set(provider._id, provider)
    }
    return map
  }

  async function update (value: AttachedData<Channel>[]) {
    const result = []
    const map = await getProviders()
    for (const item of value) {
      const provider = map.get(item.provider)
      if (provider) {
        result.push({
          label: provider.label as IntlString,
          icon: provider.icon as Asset,
          value: item.value,
          presenter: provider.presenter,
          integration: provider.integrationType !== undefined ? integrations.has(provider.integrationType) : false
        })
      } else {
        console.log('provider not found: ', item.provider)
      }
    }
    displayItems = result
  }

  $: if (value) update(value)

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
        <CircleButton icon={item.icon} {size} primary={item.integration} />
      </Tooltip>
    </div>
  {/each}
</div>
