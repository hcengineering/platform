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
  import { onDestroy } from 'svelte'
  import { Class, Doc, DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { IntlString, Asset } from '@hcengineering/platform'
  import {
    AnyComponent,
    Button,
    Component,
    IconAdd,
    IModeSelector,
    Loading,
    ModeSelector,
    SearchInput,
    showPopup,
    Header,
    Breadcrumb,
    Location,
    getLocation,
    resolvedLocationStore
  } from '@hcengineering/ui'
  import { ViewOptions, Viewlet, ViewletDescriptor, ViewletPreference } from '@hcengineering/view'
  import { FilterBar, FilterButton, ViewletSelector, ViewletSettingButton } from '@hcengineering/view-resources'
  import { ParentsNavigationModel } from '@hcengineering/workbench'

  import ComponentNavigator from './ComponentNavigator.svelte'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined = undefined
  export let icon: Asset
  export let label: IntlString
  export let createEvent: string | undefined
  export let createLabel: IntlString | undefined
  export let createComponent: AnyComponent | undefined
  export let createComponentProps: Record<string, any> = {}
  export let isCreationDisabled = false
  export let descriptors: Array<Ref<ViewletDescriptor>> | undefined = undefined
  export let baseQuery: DocumentQuery<Doc> | undefined = undefined
  export let modes: IModeSelector<any> | undefined = undefined
  export let navigationModel: ParentsNavigationModel | undefined

  let search = ''
  let viewlet: WithLookup<Viewlet> | undefined
  let filterVisible: boolean = false

  let preference: ViewletPreference | undefined
  let viewlets: Array<WithLookup<Viewlet>> = []
  let viewOptions: ViewOptions | undefined

  $: locationQuery = {}
  $: query = { ...(baseQuery ?? {}), ...(viewlet?.baseQuery ?? {}), ...locationQuery }
  $: searchQuery = search === '' ? query : { ...query, $search: search }
  $: resultQuery = searchQuery

  if (navigationModel?.syncQueryAndLocation) {
    locationQuery = getLocation()?.query ?? {}

    onDestroy(resolvedLocationStore.subscribe(handleLocationChanged))

    function handleLocationChanged (loc: Location) {
      locationQuery = loc?.query ?? {}
    }
  }

  function showCreateDialog (): void {
    if (createComponent === undefined) return
    showPopup(createComponent, { ...createComponentProps, space }, 'top')
  }
</script>

<Header
  adaptive={modes !== undefined ? 'doubleRow' : filterVisible ? 'freezeActions' : 'disabled'}
  hideActions={!(createLabel && createComponent)}
  hideExtra={modes === undefined}
  freezeBefore
>
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

  <Breadcrumb {icon} {label} size={'large'} isCurrent />

  <svelte:fragment slot="search">
    <SearchInput bind:value={search} collapsed />
    <FilterButton {_class} bind:visible={filterVisible} />
  </svelte:fragment>
  <svelte:fragment slot="actions">
    {#if createLabel && createComponent}
      <Button
        icon={IconAdd}
        label={createLabel}
        kind={'primary'}
        disabled={isCreationDisabled}
        event={createEvent}
        on:click={() => {
          showCreateDialog()
        }}
      />
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="extra">
    {#if modes !== undefined}
      <ModeSelector kind={'subtle'} props={modes} />
    {/if}
  </svelte:fragment>
</Header>

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
  {#if navigationModel?.navigationComponent === undefined}
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
        totalQuery: query,
        ...viewlet.props
      }}
    />
  {:else}
    <ComponentNavigator mainComponentLabel={label} mainComponentIcon={icon} {space} {...navigationModel}>
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
          totalQuery: query,
          ...viewlet.props
        }}
      />
    </ComponentNavigator>
  {/if}
{/if}
