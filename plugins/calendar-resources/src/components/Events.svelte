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
  import { Event } from '@hcengineering/calendar'
  import { Class, DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { Asset, IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { AnyComponent, Button, Component, Label, Loading, showPopup, TabList, IconAdd } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference } from '@hcengineering/view'
  import { getViewOptions, setActiveViewletId, viewOptionStore } from '@hcengineering/view-resources'
  import calendar from '../plugin'
  // import { deviceOptionsStore as deviceInfo } from '@hcengineering/ui'

  export let _class: Ref<Class<Event>> = calendar.class.Event
  export let space: Ref<Space> | undefined = undefined
  export let query: DocumentQuery<Event> = {}

  export let viewIcon: Asset = calendar.icon.Calendar
  export let viewLabel: IntlString = calendar.string.Events

  export let createComponent: AnyComponent | undefined = calendar.component.CreateEvent
  export let createLabel: IntlString | undefined = calendar.string.CreateEvent

  const viewletQuery = createQuery()
  const search = ''
  let resultQuery: DocumentQuery<Event> = {}

  let viewlets: WithLookup<Viewlet>[] = []
  viewletQuery.query(
    view.class.Viewlet,
    { attachTo: _class },
    (res) => {
      viewlets = res
      if (selectedViewlet === undefined || res.findIndex((p) => p._id === selectedViewlet?._id) === -1) {
        selectedViewlet = res[0]
        setActiveViewletId(selectedViewlet._id)
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
  $: viewslist = viewlets.map((views) => {
    return {
      id: views._id,
      icon: views.$lookup?.descriptor?.icon,
      tooltip: views.$lookup?.descriptor?.label
    }
  })

  $: viewOptions = getViewOptions(selectedViewlet, $viewOptionStore)
</script>

<div class="ac-header full divide">
  <div class="ac-header__wrap-title mr-3">
    <span class="ac-header__title"><Label label={viewLabel} /></span>
  </div>

  <div class="ac-header-full medium-gap mb-1">
    {#if viewlets.length > 1}
      <TabList
        items={viewslist}
        multiselect={false}
        selected={selectedViewlet?._id}
        on:select={(result) => {
          if (result.detail !== undefined) selectedViewlet = viewlets.find((vl) => vl._id === result.detail.id)
        }}
      />
    {/if}
    <Button icon={IconAdd} label={createLabel} kind={'accented'} on:click={showCreateDialog} />
  </div>
</div>
<div class="flex-col w-full h-full background-comp-header-color">
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
          viewOptions,
          viewlet: selectedViewlet,
          query: resultQuery,
          search,
          createComponent
        }}
      />
    {/if}
  {/if}
</div>
