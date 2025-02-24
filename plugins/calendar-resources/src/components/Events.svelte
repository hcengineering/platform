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
  import { IntlString, Asset } from '@hcengineering/platform'
  import {
    AnyComponent,
    Button,
    Component,
    IconAdd,
    Label,
    Loading,
    showPopup,
    Header,
    Breadcrumb
  } from '@hcengineering/ui'
  import { Viewlet, ViewletPreference } from '@hcengineering/view'
  import { ViewletSelector, getViewOptions, viewOptionStore } from '@hcengineering/view-resources'
  import calendar from '../plugin'
  // import { deviceOptionsStore as deviceInfo } from '@hcengineering/ui'

  export let _class: Ref<Class<Event>> = calendar.class.Event
  export let space: Ref<Space> | undefined = undefined
  export let query: DocumentQuery<Event> = {}

  export let viewIcon: Asset = calendar.icon.Calendar
  export let viewLabel: IntlString = calendar.string.Events

  export let createComponent: AnyComponent | undefined = calendar.component.CreateEvent
  export let createLabel: IntlString | undefined = calendar.string.CreateEvent

  const search = ''
  let resultQuery: DocumentQuery<Event> = {}

  let viewlets: WithLookup<Viewlet>[] = []

  function updateResultQuery (search: string): void {
    resultQuery = search === '' ? { ...query } : { ...query, $search: search }
  }

  $: updateResultQuery(search)

  function showCreateDialog (): void {
    if (createComponent === undefined) {
      return
    }
    showPopup(createComponent, {}, 'top')
  }

  let viewlet: WithLookup<Viewlet> | undefined

  let preference: ViewletPreference | undefined
  let loading = true

  $: viewOptions = getViewOptions(viewlet, $viewOptionStore)
</script>

<Header adaptive={'disabled'}>
  <svelte:fragment slot="beforeTitle">
    <ViewletSelector bind:viewlet bind:loading bind:preference bind:viewlets viewletQuery={{ attachTo: _class }} />
  </svelte:fragment>

  <Breadcrumb icon={viewIcon} label={viewLabel} size={'large'} isCurrent />

  <svelte:fragment slot="actions">
    <Button icon={IconAdd} label={createLabel} kind={'primary'} on:click={showCreateDialog} />
  </svelte:fragment>
</Header>

<div class="flex-col w-full h-full">
  {#if viewlet?.$lookup?.descriptor?.component}
    {#if loading}
      <Loading />
    {:else if viewlet && viewOptions}
      <Component
        is={viewlet.$lookup?.descriptor?.component}
        props={{
          _class,
          space,
          options: viewlet.options,
          config: preference?.config ?? viewlet.config,
          viewOptions,
          viewlet,
          query: resultQuery,
          search,
          createComponent
        }}
      />
    {/if}
  {/if}
</div>
