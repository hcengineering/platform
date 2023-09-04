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
  import { Asset, IntlString } from '@hcengineering/platform'
  import { AnyComponent, Button, Component, IconAdd, Label, Loading, SearchEdit, showPopup } from '@hcengineering/ui'
  import { ViewOptions, Viewlet, ViewletDescriptor, ViewletPreference } from '@hcengineering/view'
  import { FilterBar, FilterButton, ViewletSettingButton } from '@hcengineering/view-resources'
  import ViewletSelector from '@hcengineering/view-resources/src/components/ViewletSelector.svelte'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined = undefined
  export let icon: Asset
  export let label: IntlString
  export let createLabel: IntlString | undefined
  export let createComponent: AnyComponent | undefined
  export let createComponentProps: Record<string, any> = {}
  export let isCreationDisabled = false
  export let descriptors: Ref<ViewletDescriptor>[] | undefined = undefined
  export let baseQuery: DocumentQuery<Doc> | undefined = undefined

  let search = ''
  let viewlet: WithLookup<Viewlet> | undefined

  let preference: ViewletPreference | undefined
  let viewlets: WithLookup<Viewlet>[] = []
  let viewOptions: ViewOptions | undefined

  $: query = { ...(baseQuery ?? {}), ...(viewlet?.baseQuery ?? {}) }
  $: searchQuery = search === '' ? query : { ...query, $search: search }
  $: resultQuery = searchQuery

  function showCreateDialog () {
    if (createComponent === undefined) return
    showPopup(createComponent, createComponentProps, 'top')
  }
</script>

<div class="ac-header full divide caption-height">
  <div class="ac-header__wrap-title mr-3">
    <span class="ac-header__title"><Label {label} /></span>
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
        kind={'accented'}
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
