<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Event } from '@anticrm/calendar'
  import { Class, DocumentQuery, FindOptions, Ref, Space, WithLookup } from '@anticrm/core'
  import { Asset, IntlString } from '@anticrm/platform'
  import { createQuery } from '@anticrm/presentation'
  import {
    AnyComponent,
    Button,
    Component,
    Icon,
    IconAdd,
    Label,
    Loading,
    SearchEdit,
    showPopup,
    Tooltip
  } from '@anticrm/ui'
  import view, { Filter, Viewlet, ViewletPreference } from '@anticrm/view'
  import { FilterButton, ViewletSettingButton } from '@anticrm/view-resources'
  import calendar from '../plugin'

  export let _class: Ref<Class<Event>> = calendar.class.Event
  export let space: Ref<Space> | undefined = undefined
  export let query: DocumentQuery<Event> = {}
  export let options: FindOptions<Event> | undefined = undefined

  export let viewIcon: Asset = calendar.icon.Calendar
  export let viewLabel: IntlString = calendar.string.Events

  export let createComponent: AnyComponent | undefined = calendar.component.CreateEvent
  export let createLabel: IntlString | undefined = calendar.string.CreateEvent

  let filters: Filter[] = []
  const viewletQuery = createQuery()
  let search = ''
  let resultQuery: DocumentQuery<Event> = {}

  let viewlets: WithLookup<Viewlet>[] = []
  viewletQuery.query(
    view.class.Viewlet,
    { attachTo: _class },
    (res) => {
      viewlets = res
      if (selectedViewlet === undefined || res.findIndex((p) => p._id === selectedViewlet?._id) === -1) {
        selectedViewlet = res[0]
      }
    },
    { lookup: { descriptor: view.class.ViewletDescriptor } }
  )

  function updateResultQuery (search: string): void {
    resultQuery = search === '' ? { ...query } : { ...query, $search: search }
  }

  $: updateResultQuery(search)

  function showCreateDialog () {
    if (createComponent === undefined) {
      return
    }
    showPopup(createComponent, {}, 'top')
  }

  let selectedViewlet: WithLookup<Viewlet> | undefined

  const preferenceQuery = createQuery()
  let preference: ViewletPreference | undefined
  let loading = true

  $: selectedViewlet &&
    preferenceQuery.query(
      view.class.ViewletPreference,
      {
        attachedTo: selectedViewlet._id
      },
      (res) => {
        preference = res[0]
        loading = false
      },
      { limit: 1 }
    )
</script>

<div class="ac-header full withSettings">
  <div class="ac-header__wrap-title">
    <div class="ac-header__icon"><Icon icon={viewIcon} size={'small'} /></div>
    <span class="ac-header__title"><Label label={viewLabel} /></span>
    <div class="ml-4"><FilterButton {_class} bind:filters /></div>
  </div>

  {#if viewlets.length > 1}
    <div class="flex">
      {#each viewlets as viewlet, i}
        <Tooltip label={viewlet.$lookup?.descriptor?.label} direction={'top'}>
          <button
            class="ac-header__icon-button"
            class:selected={selectedViewlet === viewlet}
            on:click={() => {
              selectedViewlet = viewlet
            }}
          >
            {#if viewlet.$lookup?.descriptor?.icon}
              <Icon icon={viewlet.$lookup.descriptor.icon} size={'small'} />
            {/if}
          </button>
        </Tooltip>
      {/each}
    </div>
  {/if}

  <SearchEdit
    bind:value={search}
    on:change={() => {
      updateResultQuery(search)
    }}
  />
  <Button icon={IconAdd} label={createLabel} kind={'primary'} on:click={showCreateDialog} />
  <ViewletSettingButton viewlet={selectedViewlet} />
</div>

{#if selectedViewlet?.$lookup?.descriptor?.component}
  {#if loading}
    <Loading />
  {:else}
    <Component
      is={selectedViewlet.$lookup?.descriptor?.component}
      props={{
        _class,
        space,
        options: selectedViewlet.options,
        config: preference?.config ?? selectedViewlet.config,
        viewlet: selectedViewlet,
        query: resultQuery,
        filters,
        search,
        createComponent
      }}
    />
  {/if}
{/if}
