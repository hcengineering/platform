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
import type { Ref } from '@anticrm/core'
import type { IntlString, Asset } from '@anticrm/platform'
import type { Channel, ChannelProvider } from '@anticrm/contact'
import { getClient } from '@anticrm/presentation'

import { Icon } from '@anticrm/ui'

import contact from '@anticrm/contact'

export let value: Channel[]

interface Item {
  label: IntlString,
  icon: Asset,
  value: string
}

const client = getClient()

async function getProviders(): Promise<Map<Ref<ChannelProvider>, ChannelProvider>> {
  const providers = await client.findAll(contact.class.ChannelProvider, {})
  const map = new Map<Ref<ChannelProvider>, ChannelProvider>()
  for (const provider of providers) { map.set(provider._id, provider) }
  return map
}

async function update(value: Channel[]) {
  const result = []
  const map = await getProviders()
  for (const item of value) {
    const provider = map.get(item.provider)
    if (provider) {
      result.push({
        label: provider.label as IntlString,
        icon: provider.icon as Asset,
        value: item.value,
      })
    } else {
      console.log('provider not found: ', item.provider)
    }
  }
  displayItems = result
}

$: update(value)

let displayItems: Item[] = []

</script>

<div class="container">
  {#each displayItems as item}
    <div class="circle">
      <div class="icon"><Icon icon={item.icon} size={'small'}/></div>
    </div>
  {/each}
</div>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: row-reverse;
    align-items: center;

    .circle {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 1.5rem;
      height: 1.5rem;
      border: 1px solid var(--theme-bg-focused-color);
      border-radius: 50%;
      cursor: pointer;

      .icon {
        // transform-origin: center center;
        // transform: scale(.75);
        opacity: .4;
      }
      &:hover {
        border-color: var(--theme-bg-focused-border);
        .icon { opacity: 1; }
      }
    }
    .circle + .circle { margin-right: .25rem; }
  }
</style>
