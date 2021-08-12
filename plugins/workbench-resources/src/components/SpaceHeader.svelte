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
  import { Icon, ActionIcon, Button } from '@anticrm/ui'
  import type { AnyComponent } from '@anticrm/ui'
  import Header from './Header.svelte'
  import MoreH from './icons/MoreH.svelte'
  import Add from './icons/Add.svelte'
  import Star from './icons/Star.svelte'

  import { getClient, createQuery } from '@anticrm/presentation'
  import { showModal } from '@anticrm/ui'
  import { classIcon } from '../utils'
  import core from '@anticrm/core'

  export let space: Ref<Space> | undefined
  export let createItemDialog: AnyComponent | undefined
  export let divider: boolean = false

  const client = getClient()
  const query = createQuery()
  let data: Space | undefined

  $: query.query(core.class.Space, { _id: space }, result => { data = result[0] })

  function showCreateDialog() {
    showModal(createItemDialog as AnyComponent, { space })
  }
</script>

<div
  class="flex justify-between items-center h-20 pl-11 pr-8 {divider ? 'bottom-divider' : ''}"
  style="min-height: 5em;"
>
  {#if data}
    <Header icon={classIcon(client, data._class)} label={data.name} description={data.description} />
    {#if createItemDialog}
      <div class="ml-4"><Button label="Create" primary={true} on:click={showCreateDialog}/></div>
    {/if}
    <div class="ml-4"><ActionIcon label={'Favorite'} icon={Star} size={'small'}/></div>
    <div class="ml-4"><ActionIcon label={'Create'} icon={Add} size={'small'}/></div>
    <div class="ml-4"><ActionIcon label={'More...'} icon={MoreH} size={'small'}/></div>
  {/if}
</div>
