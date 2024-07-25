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
  import type { IntlString } from '@hcengineering/platform'
  import { isCreateAllowed } from '@hcengineering/presentation'
  import { Component } from '@hcengineering/tracker'
  import { Button, IconAdd, Breadcrumbs, SearchInput, showPopup, Header } from '@hcengineering/ui'
  import { ViewOptions, Viewlet } from '@hcengineering/view'
  import { FilterBar, FilterButton, ViewletSelector, ViewletSettingButton } from '@hcengineering/view-resources'
  import tracker from '../../plugin'
  import { ComponentsFilterMode, activeProjects, componentsTitleMap } from '../../utils'
  import ComponentsContent from './ComponentsContent.svelte'
  import NewComponent from './NewComponent.svelte'

  export let label: IntlString
  export let query: DocumentQuery<Component> = {}
  export let search = ''
  export let filterMode: ComponentsFilterMode = 'all'

  const space = typeof query.space === 'string' ? query.space : tracker.project.DefaultProject

  $: project = $activeProjects.get(space)

  let viewlet: WithLookup<Viewlet> | undefined
  let viewlets: Array<WithLookup<Viewlet>> | undefined

  let searchQuery: DocumentQuery<Component> = { ...query }
  let resultQuery: DocumentQuery<Component> = { ...searchQuery }

  function showCreateDialog (): void {
    showPopup(NewComponent, { space, targetElement: null }, 'top')
  }

  $: title = componentsTitleMap[filterMode]
  $: searchQuery = search === '' ? { ...query } : { ...query, $search: search }
  $: resultQuery = { ...searchQuery }

  let viewOptions: ViewOptions | undefined
</script>

<Header
  adaptive={'freezeActions'}
  hideActions={!(project !== undefined && isCreateAllowed(tracker.class.Component, project))}
>
  <svelte:fragment slot="beforeTitle">
    <ViewletSelector bind:viewlet bind:viewlets viewletQuery={{ attachTo: tracker.class.Component }} />
    <ViewletSettingButton bind:viewOptions bind:viewlet />
  </svelte:fragment>

  <Breadcrumbs items={[{ icon: tracker.icon.Component, label }, { label: title }]} />

  <svelte:fragment slot="search">
    <SearchInput bind:value={search} collapsed />
    <FilterButton _class={tracker.class.Component} {space} />
  </svelte:fragment>
  <svelte:fragment slot="actions">
    {#if project !== undefined && isCreateAllowed(tracker.class.Component, project)}
      <Button icon={IconAdd} label={tracker.string.Component} kind="primary" on:click={showCreateDialog} />
    {/if}
  </svelte:fragment>
</Header>
<FilterBar
  _class={tracker.class.Component}
  {space}
  query={searchQuery}
  {viewOptions}
  on:change={({ detail }) => (resultQuery = detail)}
/>
{#if viewlet && viewOptions}
  <ComponentsContent {viewlet} query={{ ...resultQuery }} {space} {viewOptions} />
{/if}
