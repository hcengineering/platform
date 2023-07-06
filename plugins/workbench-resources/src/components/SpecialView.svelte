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
  import { createQuery } from '@hcengineering/presentation'
  import {
    AnyComponent,
    Button,
    Component,
    IconAdd,
    Label,
    Loading,
    SearchEdit,
    TabList,
    resolvedLocationStore,
    showPopup
  } from '@hcengineering/ui'
  import view, { Viewlet, ViewletDescriptor, ViewletPreference } from '@hcengineering/view'
  import {
    FilterBar,
    FilterButton,
    ViewletSettingButton,
    activeViewlet,
    getViewOptions,
    makeViewletKey,
    setActiveViewletId,
    viewOptionStore
  } from '@hcengineering/view-resources'
  import { onDestroy } from 'svelte'

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

  const preferenceQuery = createQuery()
  let preference: ViewletPreference | undefined

  let viewlets: WithLookup<Viewlet>[] = []

  const viewletQuery = createQuery()

  $: viewletQuery.query(
    view.class.Viewlet,
    {
      attachTo: _class,
      variant: { $exists: false },
      ...(descriptors !== undefined ? { descriptor: { $in: descriptors } } : {})
    },
    (res) => {
      viewlets = res
    },
    {
      lookup: {
        descriptor: view.class.ViewletDescriptor
      }
    }
  )

  let key = makeViewletKey()

  onDestroy(
    resolvedLocationStore.subscribe((loc) => {
      key = makeViewletKey(loc)
    })
  )

  $: getActiveViewlet(viewlets, $activeViewlet, key)

  function getActiveViewlet (
    viewlets: WithLookup<Viewlet>[],
    activeViewlet: Record<string, Ref<Viewlet> | null>,
    key: string
  ) {
    if (viewlets.length === 0) return
    const newViewlet = viewlets.find((viewlet) => viewlet?._id === activeViewlet[key]) ?? viewlets[0]
    if (viewlet?._id !== newViewlet?._id) {
      preference = undefined
    }
    viewlet = newViewlet
  }

  $: if (viewlet !== undefined) {
    preferenceQuery.query(
      view.class.ViewletPreference,
      {
        attachedTo: viewlet._id
      },
      (res) => {
        preference = res[0]
      },
      { limit: 1 }
    )
  } else {
    preferenceQuery.unsubscribe()
  }

  $: query = { ...(baseQuery ?? {}), ...(viewlet?.baseQuery ?? {}) }
  $: searchQuery = search === '' ? query : { ...query, $search: search }
  $: resultQuery = searchQuery

  function showCreateDialog () {
    if (createComponent === undefined) return
    showPopup(createComponent, createComponentProps, 'top')
  }

  // $: twoRows = $deviceInfo.twoRows

  $: viewOptions = getViewOptions(viewlet, $viewOptionStore)

  $: viewslist = viewlets.map((views) => {
    return {
      id: views._id,
      icon: views.$lookup?.descriptor?.icon,
      tooltip: views.$lookup?.descriptor?.label
    }
  })
</script>

<div class="ac-header full divide caption-height">
  <div class="ac-header__wrap-title mr-3">
    <span class="ac-header__title"><Label {label} /></span>
  </div>

  <div class="ac-header-full medium-gap mb-1">
    {#if viewlets.length > 1}
      <TabList
        items={viewslist}
        multiselect={false}
        selected={viewlet?._id}
        on:select={(result) => {
          if (result.detail !== undefined) {
            if (viewlet?._id === result.detail.id) {
              return
            }
            viewlet = viewlets.find((vl) => vl._id === result.detail.id)
            if (viewlet) {
              setActiveViewletId(viewlet._id)
            }
          }
        }}
      />
    {/if}
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
    <ViewletSettingButton bind:viewOptions {viewlet} />
    <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
  </div>
</div>

{#if !viewlet?.$lookup?.descriptor?.component || viewlet?.attachTo !== _class || (preference !== undefined && viewlet?._id !== preference.attachedTo)}
  <Loading />
{:else}
  <FilterBar
    {_class}
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
