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
  import { Class, Doc, DocumentQuery, FindOptions, mergeQueries, Ref, Space, WithLookup } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { Project, ProjectType, ProjectTypeDescriptor } from '@hcengineering/task'
  import { AnyComponent, Button, Component, IconAdd, Loading, SearchInput, showPopup, Header } from '@hcengineering/ui'
  import { Viewlet, ViewletDescriptor, ViewletPreference, ViewOptions } from '@hcengineering/view'
  import {
    FilterBar,
    FilterButton,
    getResultOptions,
    ViewletSelector,
    ViewletSettingButton
  } from '@hcengineering/view-resources'
  import { selectedTaskTypeStore, selectedTypeStore, taskTypeStore } from '..'
  import task from '../plugin'
  import TypeSelector from './TypeSelector.svelte'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined = undefined
  export let label: IntlString
  export let createLabel: IntlString | undefined
  export let createComponent: AnyComponent | undefined
  export let createComponentProps: Record<string, any> = {}
  export let isCreationDisabled = false
  export let descriptors: Ref<ViewletDescriptor>[] | undefined = undefined
  export let baseQuery: DocumentQuery<Doc> | undefined = undefined
  export let descriptor: Ref<ProjectTypeDescriptor>

  let search = ''
  let viewlet: WithLookup<Viewlet> | undefined

  let preference: ViewletPreference | undefined
  let viewlets: WithLookup<Viewlet>[] = []
  let viewOptions: ViewOptions | undefined

  let resultOptions = viewlet?.options

  $: void getResultOptions(viewlet?.options ?? {}, viewlet?.viewOptions?.other, viewOptions).then((p) => {
    resultOptions = p
  })

  const spacesQ = createQuery()
  let spaces: Project[] = []
  $: spacesQ.query<Project>(
    task.class.Project,
    { type: $selectedTypeStore as Ref<ProjectType> },
    (result) => {
      spaces = result
    },
    {
      showArchived: resultOptions?.showArchived ?? false
    }
  )
  let resultQuery: DocumentQuery<Doc>
  $: query = { ...(baseQuery ?? {}), ...(viewlet?.baseQuery ?? {}), space: { $in: spaces.map((it) => it._id) } }
  $: searchQuery = search === '' ? query : { ...query, $search: search }
  $: resultQuery = searchQuery

  function showCreateDialog (): void {
    if (createComponent === undefined) return
    showPopup(createComponent, createComponentProps, 'top')
  }

  $: allTypes = Array.from($taskTypeStore.values())
    .filter((it) => it.parent === $selectedTypeStore)
    .map((it) => it._id)

  $: finalQuery = {
    ...resultQuery,
    ...($selectedTaskTypeStore !== undefined ? { kind: $selectedTaskTypeStore } : { kind: { $in: allTypes } })
  }

  $: totalQuery = {
    ...query,
    ...($selectedTaskTypeStore !== undefined ? { kind: $selectedTaskTypeStore } : { kind: { $in: allTypes } })
  }
</script>

<Header adaptive={'freezeActions'} hideActions={!(createLabel !== undefined && createComponent)}>
  <svelte:fragment slot="beforeTitle">
    <ViewletSelector
      bind:viewlet
      bind:preference
      bind:viewlets
      viewletQuery={{
        attachTo: _class,
        variant: { $exists: false },
        ...(descriptors !== undefined ? { descriptor: { $in: descriptors } } : {})
      }}
    />
    <ViewletSettingButton bind:viewOptions bind:viewlet />
  </svelte:fragment>

  <TypeSelector baseClass={_class} />

  <svelte:fragment slot="search">
    <SearchInput bind:value={search} collapsed on:change={(e) => (search = e.detail)} />
    <FilterButton {_class} {space} />
  </svelte:fragment>
  <svelte:fragment slot="actions">
    {#if createLabel !== undefined && createComponent}
      <Button
        icon={IconAdd}
        label={createLabel}
        kind={'primary'}
        disabled={isCreationDisabled}
        on:click={() => {
          showCreateDialog()
        }}
      />
    {/if}
  </svelte:fragment>
</Header>

{#if !viewlet?.$lookup?.descriptor?.component || viewlet?.attachTo !== _class || (preference !== undefined && viewlet?._id !== preference.attachedTo)}
  <Loading />
{:else if viewOptions !== undefined && viewlet}
  <FilterBar
    {_class}
    {space}
    query={searchQuery}
    {viewOptions}
    on:change={(e) => {
      resultQuery = mergeQueries(query, e.detail)
    }}
  />

  <Component
    is={viewlet.$lookup.descriptor.component}
    props={{
      _class,
      space,
      options: viewlet.options,
      config: preference?.config ?? viewlet.config,
      viewlet,
      viewOptions,
      viewOptionsConfig: viewlet.viewOptions?.other,
      createItemDialog: createComponent,
      createItemLabel: createLabel,
      query: finalQuery,
      totalQuery
    }}
  />
{/if}
