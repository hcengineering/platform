<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { DocumentQuery, WithLookup } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { Component } from '@hcengineering/tracker'
  import { createQuery } from '@hcengineering/presentation'
  import view, { Viewlet } from '@hcengineering/view'
  import {
    makeViewletKey,
    updateActiveViewlet,
    activeViewlet,
    getViewOptions,
    viewOptionStore,
    FilterButton,
    ViewletSettingButton,
    FilterBar
  } from '@hcengineering/view-resources'
  import { Button, IconAdd, Label, SearchEdit, TabList, resolvedLocationStore, showPopup } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import { ComponentsFilterMode, componentsTitleMap } from '../../utils'
  import tracker from '../../plugin'
  import ComponentsContent from './ComponentsContent.svelte'
  import NewComponent from './NewComponent.svelte'

  export let label: IntlString
  export let query: DocumentQuery<Component> = {}
  export let search = ''
  export let filterMode: ComponentsFilterMode = 'all'
  export let panelWidth: number = 0

  const viewletQuery = createQuery()
  const space = typeof query.space === 'string' ? query.space : tracker.project.DefaultProject

  let viewlet: WithLookup<Viewlet> | undefined
  let viewlets: WithLookup<Viewlet>[] | undefined
  let viewletKey = makeViewletKey()

  let searchQuery: DocumentQuery<Component> = { ...query }
  let resultQuery: DocumentQuery<Component> = { ...searchQuery }

  let asideFloat = false
  let asideShown = true

  let docWidth: number
  let docSize = false

  function showCreateDialog () {
    showPopup(NewComponent, { space, targetElement: null }, 'top')
  }

  $: title = componentsTitleMap[filterMode]
  $: searchQuery = search === '' ? { ...query } : { ...query, $search: search }
  $: resultQuery = { ...searchQuery }

  $: viewletQuery.query(view.class.Viewlet, { attachTo: tracker.class.Component }, (res) => (viewlets = res), {
    lookup: { descriptor: view.class.ViewletDescriptor }
  })
  $: viewlet = viewlets && updateActiveViewlet(viewlets, $activeViewlet[viewletKey])
  $: viewOptions = getViewOptions(viewlet, $viewOptionStore)
  $: views =
    viewlets?.map((v) => ({ id: v._id, icon: v.$lookup?.descriptor?.icon, tooltip: v.$lookup?.descriptor?.label })) ??
    []

  $: if (panelWidth < 900 && !asideFloat) asideFloat = true
  $: if (panelWidth >= 900 && asideFloat) {
    asideFloat = false
    asideShown = false
  }

  $: if (docWidth <= 900 && !docSize) docSize = true
  $: if (docWidth > 900 && docSize) docSize = false

  onDestroy(resolvedLocationStore.subscribe((loc) => (viewletKey = makeViewletKey(loc))))
</script>

<div class="ac-header full divide caption-height">
  <div class="ac-header__wrap-title mr-3">
    <span class="ac-header__title"><Label {label} /></span>
    <span class="componentTitle ml-1">
      › <Label label={title} />
    </span>
  </div>

  <div class="ac-header-full medium-gap mb-1">
    {#if viewlets && viewlets.length > 1}
      <TabList
        items={views}
        selected={viewlet?._id}
        kind="normal"
        on:select={({ detail }) =>
          (viewlet = viewlets && detail?.id ? updateActiveViewlet(viewlets, detail.id) : viewlet)}
      />
    {/if}
    <Button icon={IconAdd} label={tracker.string.Component} kind="accented" on:click={showCreateDialog} />
  </div>
</div>
<div class="ac-header full divide search-start">
  <div class="ac-header-full small-gap">
    <SearchEdit bind:value={search} />
    <!-- <ActionIcon icon={IconMoreH} size="small" /> -->
    <div class="buttons-divider" />
    <FilterButton _class={tracker.class.Component} {space} />
  </div>
  <div class="ac-header-full medium-gap">
    {#if viewlet}
      <ViewletSettingButton bind:viewOptions {viewlet} />
      <!-- <ActionIcon icon={IconMoreH} size="small" /> -->
    {/if}
  </div>
</div>

<FilterBar
  _class={tracker.class.Component}
  query={searchQuery}
  {viewOptions}
  on:change={({ detail }) => (resultQuery = detail)}
/>

<div class="flex w-full h-full clear-mins">
  {#if viewlet}
    <ComponentsContent {viewlet} query={{ ...resultQuery }} {space} {viewOptions} />
  {/if}
  {#if $$slots.aside !== undefined && asideShown}
    <div class="popupPanel-body__aside flex" class:float={asideFloat} class:shown={asideShown}>
      <slot name="aside" />
    </div>
  {/if}
</div>
