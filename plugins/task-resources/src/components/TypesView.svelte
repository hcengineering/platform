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
  import { Class, Doc, DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { IntlString, getEmbeddedLabel } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { Project, ProjectType, ProjectTypeCategory } from '@hcengineering/task'
  import {
    AnyComponent,
    Button,
    Component,
    IModeSelector,
    IconAdd,
    Label,
    Loading,
    ModeSelector,
    SearchEdit,
    resolvedLocationStore,
    showPopup
  } from '@hcengineering/ui'
  import { ViewOptions, Viewlet, ViewletDescriptor, ViewletPreference } from '@hcengineering/view'
  import { FilterBar, FilterButton, ViewletSelector, ViewletSettingButton } from '@hcengineering/view-resources'
  import task from '../plugin'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined = undefined
  export let label: IntlString
  export let createLabel: IntlString | undefined
  export let createComponent: AnyComponent | undefined
  export let createComponentProps: Record<string, any> = {}
  export let isCreationDisabled = false
  export let descriptors: Ref<ViewletDescriptor>[] | undefined = undefined
  export let baseQuery: DocumentQuery<Doc> | undefined = undefined
  export let category: Ref<ProjectTypeCategory>

  let search = ''
  let viewlet: WithLookup<Viewlet> | undefined

  let preference: ViewletPreference | undefined
  let viewlets: WithLookup<Viewlet>[] = []
  let viewOptions: ViewOptions | undefined
  let types: ProjectType[] = []

  const typeQ = createQuery()
  $: typeQ.query(task.class.ProjectType, { category, archived: false }, (result) => {
    types = result
  })

  const spacesQ = createQuery()
  let spaces: Project[] = []
  $: spacesQ.query(task.class.Project, { type: mode as Ref<ProjectType> }, (result) => {
    spaces = result
  })

  $: query = { ...(baseQuery ?? {}), ...(viewlet?.baseQuery ?? {}), space: { $in: spaces.map((it) => it._id) } }
  $: searchQuery = search === '' ? query : { ...query, $search: search }
  $: resultQuery = searchQuery

  function showCreateDialog () {
    if (createComponent === undefined) return
    showPopup(createComponent, createComponentProps, 'top')
  }

  $: mode = $resolvedLocationStore.query?.mode ?? undefined

  let config: Array<[string, IntlString, object]> = []
  $: config = types.map((p) => {
    return [p._id, getEmbeddedLabel(p.name), {}]
  })
  let modeSelectorProps: IModeSelector | undefined = undefined
  $: if (mode === undefined && config.length > 0) {
    ;[[mode]] = config
  }
  $: if (mode !== undefined) {
    modeSelectorProps = {
      mode,
      config,
      onChange: (_mode: string) => {
        mode = _mode
      }
    }
  }
</script>

<div class="ac-header full divide caption-height">
  <div class="ac-header__wrap-title mr-3">
    <span class="ac-header__title"><Label {label} /></span>
    {#if modeSelectorProps !== undefined}
      <ModeSelector props={modeSelectorProps} />
    {/if}
  </div>

  <div class="ac-header-full medium-gap mb-1">
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
    {#if createLabel && createComponent}
      <Button
        icon={IconAdd}
        label={createLabel}
        kind={'primary'}
        disabled={isCreationDisabled}
        on:click={() => showCreateDialog()}
      />
    {/if}
  </div>
</div>
<div class="ac-header full divide search-start">
  <div class="ac-header-full small-gap">
    <SearchEdit bind:value={search} />
    <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
    <div class="buttons-divider" />
    <FilterButton {_class} />
  </div>
  <div class="ac-header-full medium-gap">
    <ViewletSettingButton bind:viewOptions bind:viewlet />
    <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
  </div>
</div>

{#if !viewlet?.$lookup?.descriptor?.component || viewlet?.attachTo !== _class || (preference !== undefined && viewlet?._id !== preference.attachedTo)}
  <Loading />
{:else if viewOptions && viewlet}
  <FilterBar
    {_class}
    {space}
    query={searchQuery}
    {viewOptions}
    on:change={(e) => {
      resultQuery = { ...query, ...e.detail }
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
      query: resultQuery,
      totalQuery: query
    }}
  />
{/if}
