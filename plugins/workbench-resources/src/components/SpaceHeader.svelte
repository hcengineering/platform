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
  import type { Class, Doc, Ref, Space } from '@hcengineering/core'
  import core, { WithLookup } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import presentation, { createQuery } from '@hcengineering/presentation'
  import {
    AnyComponent,
    Button,
    IconAdd,
    SearchEdit,
    TabList,
    resolvedLocationStore,
    showPopup
  } from '@hcengineering/ui'
  import { ViewOptions, Viewlet } from '@hcengineering/view'
  import {
    FilterButton,
    ViewletSettingButton,
    activeViewlet,
    makeViewletKey,
    setActiveViewletId,
    updateActiveViewlet
  } from '@hcengineering/view-resources'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import Header from './Header.svelte'

  export let spaceId: Ref<Space> | undefined
  export let createItemDialog: AnyComponent | undefined
  export let createItemLabel: IntlString = presentation.string.Create
  export let search: string
  export let viewlet: WithLookup<Viewlet> | undefined
  export let viewlets: WithLookup<Viewlet>[] = []
  export let _class: Ref<Class<Doc>> | undefined = undefined
  export let viewOptions: ViewOptions

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

  $: viewlet = updateActiveViewlet(viewlets, active)

  $: if (prevSpaceId !== spaceId) {
    search = ''
    dispatch('search', '')
  }

  let key = makeViewletKey()

  onDestroy(
    resolvedLocationStore.subscribe((loc) => {
      key = makeViewletKey(loc)
    })
  )

  $: active = $activeViewlet[key]

  $: viewslist = viewlets.map((views) => {
    return {
      id: views._id,
      icon: views.$lookup?.descriptor?.icon,
      tooltip: views.$lookup?.descriptor?.label
    }
  })

  // $: twoRows = $deviceInfo.twoRows
</script>

{#if space}
  <div class="ac-header full divide caption-height">
    <Header {space} {_class} />

    <div class="ac-header-full medium-gap mb-1">
      {#if viewlets.length > 1}
        <TabList
          items={viewslist}
          multiselect={false}
          selected={viewlet?._id}
          on:select={(result) => {
            if (result.detail !== undefined) {
              viewlet = viewlets.find((vl) => vl._id === result.detail.id)
              if (viewlet) setActiveViewletId(viewlet._id)
            }
          }}
        />
      {/if}
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
      <FilterButton {_class} />
    </div>
    <div class="ac-header-full medium-gap">
      <ViewletSettingButton bind:viewOptions {viewlet} />
      <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
    </div>
  </div>
{:else}
  <div class="ac-header full divide caption-height" />
{/if}
