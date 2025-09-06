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
  import { Class, Doc, DocumentQuery, getCurrentAccount, Ref, Status, WithLookup } from '@hcengineering/core'
  import { IntlString, Asset } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { Task } from '@hcengineering/task'
  import { getCurrentEmployee } from '@hcengineering/contact'
  import {
    Component,
    IModeSelector,
    Breadcrumb,
    Loading,
    ModeSelector,
    resolvedLocationStore,
    SearchInput,
    Header
  } from '@hcengineering/ui'
  import { Viewlet, ViewletDescriptor, ViewletPreference, ViewOptions } from '@hcengineering/view'
  import {
    FilterBar,
    FilterButton,
    statusStore,
    ViewletSelector,
    ViewletSettingButton
  } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import task from '../plugin'

  export let _class: Ref<Class<Task>> = task.class.Task
  export let labelTasks = task.string.Tasks
  export let icon: Asset
  export let config: [string, IntlString, object][] = []
  export let descriptors: Ref<ViewletDescriptor>[] | undefined = undefined

  let search = ''
  const dispatch = createEventDispatcher()
  const me = getCurrentEmployee()
  const account = getCurrentAccount()
  const assigned = { assignee: me }
  $: created = { createdBy: { $in: account.socialIds } }
  let subscribed = { _id: { $in: [] as Ref<Task>[] } }
  let mode: string | undefined = undefined
  let baseQuery: DocumentQuery<Task> | undefined = undefined
  let modeSelectorProps: IModeSelector | undefined = undefined

  $: queries = { assigned, created, subscribed }
  $: mode = $resolvedLocationStore.query?.mode ?? undefined

  let searchQuery: DocumentQuery<Task> = { baseQuery }
  function updateSearchQuery (search: string): void {
    searchQuery = search === '' ? { ...baseQuery } : { ...baseQuery, $search: search }
  }
  $: if (baseQuery) updateSearchQuery(search)
  $: resultQuery = { ...searchQuery }

  let loading = true
  let preference: ViewletPreference | undefined

  function updateResultQuery (search: string, doneStates: Status[], mode: string | undefined): void {
    if (mode === 'assigned') {
      resultQuery.status = { $nin: doneStates.map((it) => it._id) }
    }
  }

  $: doneStates = $statusStore.array.filter(
    (it) => it.category === task.statusCategory.Lost || it.category === task.statusCategory.Won
  )

  const subscribedQuery = createQuery()
  function getSubscribed (): void {
    subscribedQuery.query(
      _class,
      { 'notification:mixin:Collaborators.collaborators': { $in: getCurrentAccount().socialIds } },
      (result) => {
        const newSub = result.map((p) => p._id as Ref<Doc> as Ref<Task>)
        const curSub = subscribed._id.$in
        if (curSub.length !== newSub.length || curSub.some((id, i) => newSub[i] !== id)) {
          subscribed = { _id: { $in: newSub } }
        }
      },
      { sort: { _id: 1 } }
    )
  }
  $: if (mode === 'subscribed') getSubscribed()
  $: if (mode === undefined || queries[mode as keyof typeof queries] === undefined) {
    ;[[mode]] = config
  }
  $: if (mode !== undefined) {
    baseQuery = { ...queries[mode as keyof typeof queries] }
    modeSelectorProps = {
      config,
      mode,
      onChange: (newMode: string) => dispatch('action', { mode: newMode })
    }
  }

  $: updateResultQuery(search, doneStates, mode)

  let viewlet: WithLookup<Viewlet> | undefined

  let viewOptions: ViewOptions | undefined

  $: viewOptionsConfig =
    mode === 'assigned'
      ? viewlet?.viewOptions?.other
      : (viewlet?.viewOptions?.other ?? []).filter((it) => it.actionTarget !== 'query')
</script>

<Header adaptive={'freezeActions'} hideActions={modeSelectorProps === undefined}>
  <svelte:fragment slot="beforeTitle">
    <ViewletSelector
      bind:viewlet
      bind:preference
      bind:loading
      viewletQuery={{
        attachTo: _class,
        variant: { $exists: false },
        ...(descriptors !== undefined ? { descriptor: { $in: descriptors } } : {})
      }}
    />
    <ViewletSettingButton bind:viewOptions bind:viewlet {viewOptionsConfig} />
  </svelte:fragment>

  <Breadcrumb {icon} label={labelTasks} size={'large'} isCurrent />

  <svelte:fragment slot="search" let:doubleRow>
    <SearchInput
      bind:value={search}
      collapsed
      on:change={() => {
        updateResultQuery(search, doneStates, mode)
      }}
    />
    <FilterButton {_class} adaptive={doubleRow} />
  </svelte:fragment>
  <svelte:fragment slot="actions" let:doubleRow>
    {#if modeSelectorProps !== undefined}
      <ModeSelector kind={'subtle'} props={modeSelectorProps} />
    {/if}
  </svelte:fragment>
</Header>
<FilterBar {_class} query={searchQuery} space={undefined} {viewOptions} on:change={(e) => (resultQuery = e.detail)} />

{#if loading || !viewlet || !viewlet?.$lookup?.descriptor?.component}
  <Loading />
{:else}
  <Component
    is={viewlet.$lookup.descriptor.component}
    props={{
      _class,
      options: viewlet.options,
      config: preference?.config ?? viewlet.config,
      viewlet,
      viewOptions,
      viewOptionsConfig,
      query: resultQuery
    }}
  />
{/if}
