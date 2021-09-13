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
  import type { Ref, Space } from '@anticrm/core'
  import { Icon, ActionIcon, Button, IconMoreH } from '@anticrm/ui'
  import type { AnyComponent } from '@anticrm/ui'
  import Header from './Header.svelte'
  import Add from './icons/Add.svelte'
  import Star from './icons/Star.svelte'

  import { getClient, createQuery } from '@anticrm/presentation'
  import { showPopup } from '@anticrm/ui'
  import { classIcon } from '../utils'
  import core from '@anticrm/core'

  export let space: Ref<Space> | undefined
  export let createItemDialog: AnyComponent | undefined
  export let divider: boolean = false

  const client = getClient()
  const query = createQuery()
  let data: Space | undefined

  $: query.query(core.class.Space, { _id: space }, result => { data = result[0] })

  function showCreateDialog(ev: Event) {
    showPopup(createItemDialog as AnyComponent, { space }, ev.target as HTMLElement)
  }
</script>

<div class="container" class:bottom-divider={divider}>
  {#if data}
    <Header icon={classIcon(client, data._class)} label={data.name} description={data.description} />
    {#if createItemDialog}
      <Button label="Create" primary={true} size={'small'} on:click={(ev) => showCreateDialog(ev)}/>
    {/if}
    <ActionIcon label={'Favorite'} icon={Star} size={'small'}/>
    <ActionIcon label={'Create'} icon={Add} size={'small'}/>
    <ActionIcon label={'More...'} icon={IconMoreH} size={'small'}/>
  {/if}
</div>

<style lang="scss">
  // .container {
  //   display: flex;
  // }
  .container {
    display: grid;
    grid-template-columns: auto;
    grid-auto-flow: column;
    grid-auto-columns: minmax(min-content, auto);
    gap: .75rem;
    align-items: center;
    padding: 0 2rem 0 2.5rem;
    height: 4.5rem;
    min-height: 4.5rem;
    max-width: max-content;
  }
</style>
