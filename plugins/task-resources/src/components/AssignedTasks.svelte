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
  import { PersonAccount } from '@hcengineering/contact'
  import { Class, Doc, DocumentQuery, getCurrentAccount, Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import tags, { selectedTagElements, TagCategory, TagElement } from '@hcengineering/tags'
  import { DoneState, Task } from '@hcengineering/task'
  import {
    Component,
    IModeSelector,
    Label,
    Loading,
    ModeSelector,
    resolvedLocationStore,
    SearchEdit
  } from '@hcengineering/ui'
  import { Viewlet, ViewletPreference, ViewOptions } from '@hcengineering/view'
  import {
    FilterBar,
    FilterButton,
    TableBrowser,
    ViewletSelector,
    ViewletSettingButton
  } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import task from '../plugin'

  export let _class: Ref<Class<Task>> = task.class.Task
  export let labelTasks = task.string.Tasks
  export let config: [string, IntlString, object][] = []

  let search = ''
  const dispatch = createEventDispatcher()
  const currentUser = getCurrentAccount() as PersonAccount
  const assigned = { assignee: currentUser.person }
  const created = { createdBy: currentUser._id }
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

  const client = getClient()

  let category: Ref<TagCategory> | undefined = undefined
  let loading = true
  let preference: ViewletPreference | undefined

  let documentIds: Ref<Task>[] = []
  function updateResultQuery (search: string, documentIds: Ref<Task>[], doneStates: DoneState[]): void {
    resultQuery.doneState = { $nin: doneStates.map((it) => it._id) }
    if (documentIds.length > 0) {
      resultQuery._id = { $in: documentIds }
    }
  }

  let doneStates: DoneState[] = []

  const doneStateQuery = createQuery()
  doneStateQuery.query(task.class.DoneState, {}, (res) => (doneStates = res))

  // Find all tags for object class with matched elements
  const query = createQuery()

  $: query.query(tags.class.TagReference, { tag: { $in: $selectedTagElements } }, (result) => {
    documentIds = Array.from(
      new Set<Ref<Task>>(
        result
          .filter((it) => client.getHierarchy().isDerived(it.attachedToClass, _class))
          .map((it) => it.attachedTo as Ref<Task>)
      ).values()
    )
  })
  const subscribedQuery = createQuery()
  function getSubscribed () {
    subscribedQuery.query(
      _class,
      { 'notification:mixin:Collaborators.collaborators': getCurrentAccount()._id },
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

  $: updateResultQuery(search, documentIds, doneStates)

  let viewlet: Viewlet | undefined

  let viewOptions: ViewOptions | undefined

  function updateCategory (detail: { category: Ref<TagCategory> | null; elements: TagElement[] }) {
    category = detail.category ?? undefined
    selectedTagElements.set(Array.from(detail.elements ?? []).map((it) => it._id))
  }
  const handleChange = (evt: any) => updateCategory(evt.detail)
</script>

<div
  class="ac-header full divide caption-height"
  class:header-with-mode-selector={modeSelectorProps !== undefined}
  class:header-without-label={!labelTasks}
>
  <div class="ac-header__wrap-title">
    <span class="ac-header__title"><Label label={labelTasks} /></span>
    {#if modeSelectorProps !== undefined}
      <ModeSelector props={modeSelectorProps} />
    {/if}
  </div>
</div>
<div class="ac-header full divide search-start">
  <div class="ac-header-full small-gap">
    <SearchEdit
      bind:value={search}
      on:change={() => {
        updateResultQuery(search, documentIds, doneStates)
      }}
    />
    <div class="buttons-divider" />
    <FilterButton {_class} />
  </div>
  <ViewletSelector
    hidden
    bind:viewlet
    bind:preference
    bind:loading
    viewletQuery={{ attachTo: _class, descriptor: task.viewlet.StatusTable }}
  />
  <ViewletSettingButton bind:viewOptions bind:viewlet />
</div>
<FilterBar {_class} query={searchQuery} space={undefined} {viewOptions} on:change={(e) => (resultQuery = e.detail)} />

<Component is={tags.component.TagsCategoryBar} props={{ targetClass: _class, category }} on:change={handleChange} />

{#if viewlet}
  {#if loading}
    <Loading />
  {:else}
    <TableBrowser
      {_class}
      config={preference?.config ?? viewlet.config}
      options={viewlet.options}
      query={resultQuery}
      showNotification
    />
  {/if}
{/if}
