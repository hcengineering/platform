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
import IconCopy from './icons/Copy.svelte'

import contact from '@anticrm/contact'

export let value: Channel[] | null
export let size: 'small' | 'medium' = 'medium'
export let reverse: boolean = false

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

$: if (value) update(value)

let displayItems: Item[] = []

</script>

<div class="container" class:reverse on:click|stopPropagation={() => {}}>
  {#each displayItems as item}
    <div class="circle list list-{size}">
      <div class="icon"><Icon icon={item.icon} size={'small'}/></div>
    </div>
    <div class="window">
      <div class="circle circle-icon">
        <div class="icon"><Icon icon={item.icon} size={'small'}/></div>
      </div>
      <div class="flex-grow flex-col caption-color">
        <div class="overflow-label label">{item.label}</div>
        <div class="overflow-label">{item.value}</div>
      </div>
      <div class="button" on:click|preventDefault={() => { alert('Copied: ' + item.value) }}>
        <IconCopy size={'small'}/>
      </div>
    </div>
  {/each}
</div>

<style lang="scss">
  .container {
    position: relative;
    display: flex;
    flex-direction: row;
    align-items: center;
    &.reverse { flex-direction: row-reverse; }

    .circle {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      border: 1px solid var(--theme-bg-focused-color);
      border-radius: 50%;
      cursor: pointer;

      .icon {
        transform-origin: center center;
        transform: scale(.75);
        opacity: .4;
      }

      &-icon {
        margin-right: .75rem;
        width: 2.25rem;
        height: 2.25rem;

        .icon {
          transform: none;
          opacity: 1;
        }
      }
    }

    .list {
      &:hover {
        border-color: var(--theme-bg-focused-border);
        z-index: 5;
        .icon { opacity: 1; }
        & + .window {
          z-index: 4;
          visibility: visible;
        }
        &::after { content: ''; }
      }

      &::after {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: -1rem;
      }
    }
    .list-small {
      margin-right: .25rem;
      width: 1.5rem;
      height: 1.5rem;
    }
    .list-medium {
      margin-right: .5rem;
      width: 2rem;
      height: 2rem;
    }

    .window {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      top: 2.25rem;
      right: 0;
      background-color: var(--theme-button-bg-focused);
      border: 1px solid var(--theme-button-border-enabled);
      border-radius: .75rem;
      box-shadow: 0 .75rem 1.25rem rgba(0, 0, 0, .2);
      visibility: hidden;

      &:hover {
        z-index: 4;
        visibility: visible;
      }
    }
  }
  .label {
    font-weight: 500;
    font-size: .75rem;
  }
  .button {
    margin-left: 1.5rem;
    opacity: .4;
    cursor: pointer;
    &:hover { opacity: 1; }
  }
</style>
