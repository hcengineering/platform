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
<div class="container">

  {#if viewlets.length > 0}
  <div class="toolbar">
    <div style="flex-grow: 1" />

    <div class="viewSelection-container">
      {#each viewlets as viewlet, i}
        <div class="button" class:selected={i === selected}>
          <div class="icon"><Icon icon={viewlet.$lookup?.descriptor?.icon} size={'small'}/></div>
        </div>
      {/each}
    </div>
    
  </div>
  {/if}

  <div class="content">
    <Component is={viewlets[selected].$lookup?.descriptor?.component} props={ {
      _class,
      space,
      open: viewlets[selected].open,
      options: viewlets[selected].options, 
      config: viewlets[selected].config
    } } />
  </div>
</div>
{/await}

<style lang="scss">
  .viewSelection-container {
    display: flex;
    flex-direction: row;
    height: 32px;

    .button {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background-color: transparent;
      cursor: pointer;

      .icon {
        width: 16px;
        height: 16px;
        opacity: 0.2;
      }

      &:hover .icon {
        opacity: 1;
      }

      &.selected {
        background-color: var(--theme-button-bg-enabled);
        cursor: default;
        .icon {
          opacity: 0.8;
        }
      }
    }
  }
  .container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: auto;
      min-height: 40px;
      height: 40px;
      margin: 40px 40px 0;
    }
    .content {
      display: flex;
      flex-direction: column;
      width: auto;
      height: 100%;
      margin: 40px;
    }
  }
</style>
