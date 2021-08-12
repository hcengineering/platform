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

import type { Ref, Class ,Doc, FindOptions, Space, WithLookup, Obj } from '@anticrm/core'
import type { Connection } from '@anticrm/client'
import type { Viewlet } from '@anticrm/view'

import { getClient } from '@anticrm/presentation'

import { Icon, Component } from '@anticrm/ui'

import view from '@anticrm/view'
import core from '@anticrm/core'

export let _class: Ref<Class<Doc>>
export let space: Ref<Space>

const client = getClient()

type ViewletConfig = WithLookup<Viewlet>

async function getViewlets(client: Connection, _class: Ref<Class<Obj>>): Promise<ViewletConfig[]> {
  return await client.findAll(view.class.Viewlet, { attachTo: _class }, { lookup: { 
    descriptor: core.class.Class
  }})
}

let selected = 0

</script>

{#await getViewlets(client, _class)}
 ...
{:then viewlets}

  {#if viewlets.length > 0}
    <div class="flex justify-between items-center h-11 mx-11 mt-11">
      <div class="flex-grow" />

      <div class="flex">
        {#each viewlets as viewlet, i}
          <div class="flex justify-center items-center w-11 h-11 rounded-lg btn {selected ? 'background-button-bg-enabled cursor-default selected' : 'background-transparent cursor-pointer'}">
            <div class="opacity-30 icon"><Icon icon={viewlet.$lookup?.descriptor?.icon} size={'small'}/></div>
          </div>
        {/each}
      </div>
      
    </div>
  {/if}

  <div class="flex flex-col m-11 h-full">
    <Component is={viewlets[selected].$lookup?.descriptor?.component} props={ {
      _class,
      space,
      open: viewlets[selected].open,
      options: viewlets[selected].options, 
      config: viewlets[selected].config
    } } />
  </div>

{/await}

<style lang="scss">
  .btn:hover .icon {
    opacity: 1;
  }
  .selected:hover .icon {
    opacity: .8;
  }
</style>
