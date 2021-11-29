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

import type { Ref, Class ,Doc, FindOptions, Space, WithLookup, Obj, Client } from '@anticrm/core'
import type { Viewlet } from '@anticrm/view'

import { getClient } from '@anticrm/presentation'

import { Icon, Component, EditWithIcon, IconSearch, Tooltip } from '@anticrm/ui'

import view from '@anticrm/view'
import core from '@anticrm/core'

export let _class: Ref<Class<Doc>>
export let space: Ref<Space>

const client = getClient()

type ViewletConfig = WithLookup<Viewlet>

async function getViewlets(client: Client, _class: Ref<Class<Obj>>): Promise<ViewletConfig[]> {
  return await client.findAll(view.class.Viewlet, { attachTo: _class }, { lookup: { 
    descriptor: core.class.Class
  }})
}

let selected = 0

function onSpace(space: Ref<Space>) {
  selected = 0
}

$: onSpace(space)

let search = ''

function onSearch(ev: Event) {
  search = (ev.target as HTMLInputElement).value
}

</script>

{#await getViewlets(client, _class)}
 ...
{:then viewlets}

  {#if viewlets.length > 0}
    <div class="toolbar">
      <EditWithIcon icon={IconSearch} placeholder={'Search for something'} on:change={onSearch}/>

      <div class="flex">
        {#each viewlets as viewlet, i}
          <div class="btn" class:selected={selected === i} on:click={()=>{ selected = i }}>
            <div class="icon">
              <Tooltip label={viewlet.$lookup?.descriptor?.label} direction={'top'}>
                <Icon icon={viewlet.$lookup?.descriptor?.icon} size={'small'}/>
              </Tooltip>
            </div>
          </div>
        {/each}
      </div>
      
    </div>
  {/if}

  <div class="container">
    <Component is={viewlets[selected].$lookup?.descriptor?.component} props={ {
      _class,
      space,
      open: viewlets[selected].open,
      options: viewlets[selected].options, 
      config: viewlets[selected].config,
      search
    } } />
  </div>

{/await}

<style lang="scss">
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 1.25rem 2.5rem;
    height: 2.5rem;

    .btn {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 2.5rem;
      height: 2.5rem;
      background-color: transparent;
      border-radius: .5rem;
      cursor: pointer;

      .icon { opacity: .3; }
      &:hover .icon {
        opacity: 1;
      }
      &.selected {
        background-color: var(--theme-button-bg-enabled);
        cursor: default;
        &:hover .icon {
          opacity: .8;
        }
      }
    }
  }
  .container {
    display: flex;
    flex-direction: column;
    height: calc(100% - 9.5rem);
  }
</style>
