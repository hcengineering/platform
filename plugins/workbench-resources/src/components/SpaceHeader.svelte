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
  import type { Class, Doc, DocumentQuery, Ref, Space } from '@hcengineering/core'
  import core, { WithLookup } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import presentation, { createQuery } from '@hcengineering/presentation'
  import { AnyComponent, Button, IconAdd, SearchEdit, showPopup } from '@hcengineering/ui'
  import { ViewOptions, Viewlet } from '@hcengineering/view'
  import { FilterButton, ViewletSelector, ViewletSettingButton } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import Header from './Header.svelte'

  export let spaceId: Ref<Space> | undefined
  export let createItemDialog: AnyComponent | undefined
  export let createItemLabel: IntlString = presentation.string.Create
  export let search: string
  export let viewletQuery: DocumentQuery<Viewlet>
  export let viewlet: Viewlet | undefined = undefined
  export let viewlets: WithLookup<Viewlet>[] = []
  export let _class: Ref<Class<Doc>> | undefined = undefined
  export let viewOptions: ViewOptions | undefined

  const query = createQuery()
  let space: Space | undefined
  const dispatch = createEventDispatcher()

  const prevSpaceId = spaceId

  $: query.query(core.class.Space, { _id: spaceId }, (result) => {
    space = result[0]
  })

  function showCreateDialog (ev: Event) {
    showPopup(createItemDialog as AnyComponent, { space: spaceId }, 'top')
  }

  $: if (prevSpaceId !== spaceId) {
    search = ''
    dispatch('search', '')
  }

  // $: twoRows = $deviceInfo.twoRows
</script>

{#if space}
  <div class="ac-header full divide caption-height">
    <Header {space} {_class} />

    <div class="ac-header-full medium-gap mb-1">
      <ViewletSelector {viewletQuery} bind:viewlet bind:viewlets />
      {#if createItemDialog}
        <Button icon={IconAdd} label={createItemLabel} kind={'accented'} on:click={(ev) => showCreateDialog(ev)} />
      {/if}
    </div>
  </div>
  <div class="ac-header full divide search-start">
    <div class="ac-header-full small-gap">
      <SearchEdit bind:value={search} on:change={() => dispatch('search', search)} />
      <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
      <div class="buttons-divider" />
      <FilterButton {_class} space={spaceId} />
    </div>
    <div class="ac-header-full medium-gap">
      <ViewletSettingButton bind:viewOptions bind:viewlet />
      <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
    </div>
  </div>
{:else}
  <div class="ac-header full divide caption-height" />
{/if}
