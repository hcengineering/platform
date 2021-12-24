<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import core, { Class, Doc, WithLookup } from '@anticrm/core'
  import type { Ref, Space } from '@anticrm/core'
  import { getClient, createQuery } from '@anticrm/presentation'
  import { Icon, Button, EditWithIcon, IconSearch, Tooltip } from '@anticrm/ui'
  import type { AnyComponent } from '@anticrm/ui'
  import { showPopup } from '@anticrm/ui'
  import view, { Viewlet } from '@anticrm/view'

  import { classIcon } from '../utils'
  import workbench from '../plugin'

  import Header from './Header.svelte'

  export let spaceId: Ref<Space> | undefined
  export let _class: Ref<Class<Doc>> | undefined
  export let createItemDialog: AnyComponent | undefined
  export let search: string
  export let viewlet: WithLookup<Viewlet> | undefined
  export let viewlets: WithLookup<Viewlet>[] = []

  const client = getClient()
  const query = createQuery()
  let space: Space | undefined

  $: query.query(core.class.Space, { _id: spaceId }, result => { space = result[0] })

  function showCreateDialog(ev: Event) {
    showPopup(createItemDialog as AnyComponent, { space: spaceId }, ev.target as HTMLElement)
  }

  let selectedViewlet = 0
  $: viewlet = viewlets[selectedViewlet]
</script>

<div class="spaceheader-container">
  {#if space}
    <Header icon={classIcon(client, space._class)} label={space.name} description={space.description} />
    {#if viewlets.length > 1}
      <div class="flex">
        {#each viewlets as viewlet, i}
          <Tooltip label={viewlet.$lookup?.descriptor?.label} direction={'top'}>
            <div class="flex-center btn" class:selected={selectedViewlet === i} on:click={()=>{ selectedViewlet = i }}>
              <Icon icon={viewlet.$lookup?.descriptor?.icon} size={'small'}/>
            </div>
          </Tooltip>
        {/each}
      </div>
    {/if}      
    <EditWithIcon icon={IconSearch} placeholder={'Search'} bind:value={search} />
    {#if createItemDialog}
      <Button label={workbench.string.Create} primary={true} size={'small'} on:click={(ev) => showCreateDialog(ev)}/>
    {/if}
  {/if}
</div>

<style lang="scss">
  .spaceheader-container {
    display: grid;
    grid-template-columns: auto;
    grid-auto-flow: column;
    grid-auto-columns: min-content;
    gap: .75rem;
    align-items: center;
    padding: 0 1.75rem 0 2.5rem;
    height: 4rem;
    min-height: 4rem;
  }

  .btn {
      width: 2.5rem;
      height: 2.5rem;
      background-color: transparent;
      border-radius: .5rem;
      cursor: pointer;

      color: var(--theme-content-trans-color);
      &:hover { color: var(--theme-caption-color); }
      &.selected {
        color: var(--theme-content-accent-color);
        background-color: var(--theme-button-bg-enabled);
        cursor: default;
        &:hover { color: var(--theme-caption-color); }
      }
    }
</style>
