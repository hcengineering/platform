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
  import { DocumentQuery, WithLookup } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Sprint } from '@hcengineering/tracker'
  import { Button, IconAdd, Label, SearchEdit, showPopup } from '@hcengineering/ui'
  import view, { Viewlet } from '@hcengineering/view'
  import {
    FilterBar,
    FilterButton,
    getActiveViewletId,
    getViewOptions,
    setActiveViewletId,
    ViewletSettingButton
  } from '@hcengineering/view-resources'
  import tracker from '../../plugin'
  import { getIncludedSprintStatuses, sprintTitleMap, SprintViewMode } from '../../utils'
  import NewSprint from './NewSprint.svelte'
  import SprintContent from './SprintContent.svelte'

  export let label: IntlString
  export let query: DocumentQuery<Sprint> = {}
  export let search: string = ''
  export let mode: SprintViewMode = 'all'

  const space = typeof query.space === 'string' ? query.space : tracker.team.DefaultTeam
  const showCreateDialog = async () => {
    showPopup(NewSprint, { space, targetElement: null }, 'top')
  }

  export let panelWidth: number = 0

  let viewlet: WithLookup<Viewlet> | undefined = undefined

  let searchQuery: DocumentQuery<Sprint> = { ...query }
  function updateSearchQuery (search: string): void {
    searchQuery = search === '' ? { ...query } : { ...query, $search: search }
  }
  $: if (query) updateSearchQuery(search)

  $: includedSprintStatuses = getIncludedSprintStatuses(mode)
  $: title = sprintTitleMap[mode]
  $: includedSprintsQuery = { status: { $in: includedSprintStatuses } }

  const client = getClient()
  let resultQuery: DocumentQuery<Sprint> = { ...searchQuery }

  let viewlets: WithLookup<Viewlet>[] = []

  $: update()

  async function update (): Promise<void> {
    viewlets = await client.findAll(
      view.class.Viewlet,
      { attachTo: tracker.class.Sprint },
      {
        lookup: {
          descriptor: view.class.ViewletDescriptor
        }
      }
    )
    const _id = getActiveViewletId()
    viewlet = viewlets.find((viewlet) => viewlet._id === _id) || viewlets[0]
    setActiveViewletId(viewlet._id)
  }

  let asideFloat: boolean = false
  let asideShown: boolean = true
  $: if (panelWidth < 900 && !asideFloat) asideFloat = true
  $: if (panelWidth >= 900 && asideFloat) {
    asideFloat = false
    asideShown = false
  }
  let docWidth: number
  let docSize: boolean = false
  $: if (docWidth <= 900 && !docSize) docSize = true
  $: if (docWidth > 900 && docSize) docSize = false

  $: viewOptions = getViewOptions(viewlet)

  const handleViewModeChanged = (newMode: SprintViewMode) => {
    if (newMode === undefined || newMode === mode) {
      return
    }

    mode = newMode
  }
</script>

<div class="fs-title flex-between header">
  <div class="flex-row-center">
    <Label {label} />
    <div class="projectTitle">
      › <Label label={title} />
    </div>
    <div class="ml-4">
      <FilterButton _class={tracker.class.Issue} {space} />
    </div>
  </div>
  <div class="flex-row-center gap-2">
    <SearchEdit bind:value={search} on:change={() => {}} />
    <Button size="small" icon={IconAdd} label={tracker.string.Sprint} kind={'primary'} on:click={showCreateDialog} />
    {#if viewlet}
      <ViewletSettingButton bind:viewOptions {viewlet} />
    {/if}
  </div>
</div>
<div class="itemsContainer">
  <div class="flex-center">
    <div class="flex-center">
      <div class="buttonWrapper">
        <Button
          size="small"
          shape="rectangle-right"
          selected={mode === 'all'}
          label={tracker.string.AllSprints}
          on:click={() => handleViewModeChanged('all')}
        />
      </div>
      <div class="buttonWrapper">
        <Button
          size="small"
          shape="rectangle"
          selected={mode === 'planned'}
          label={tracker.string.PlannedSprints}
          on:click={() => handleViewModeChanged('planned')}
        />
      </div>
      <div class="buttonWrapper">
        <Button
          size="small"
          shape="rectangle"
          selected={mode === 'active'}
          label={tracker.string.ActiveSprints}
          on:click={() => handleViewModeChanged('active')}
        />
      </div>
      <div class="buttonWrapper">
        <Button
          size="small"
          shape="rectangle-left"
          selected={mode === 'closed'}
          label={tracker.string.ClosedSprints}
          on:click={() => handleViewModeChanged('closed')}
        />
      </div>
    </div>
  </div>
</div>
<FilterBar
  _class={tracker.class.Sprint}
  query={searchQuery}
  {viewOptions}
  on:change={(e) => (resultQuery = e.detail)}
/>
<div class="flex w-full h-full clear-mins">
  {#if viewlet}
    <SprintContent {viewlet} query={{ ...resultQuery, ...includedSprintsQuery }} {space} {viewOptions} />
  {/if}
  {#if $$slots.aside !== undefined && asideShown}
    <div class="popupPanel-body__aside flex" class:float={asideFloat} class:shown={asideShown}>
      <slot name="aside" />
    </div>
  {/if}
</div>

<style lang="scss">
  .header {
    padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  }

  .projectTitle {
    display: flex;
    margin-left: 0.25rem;
    color: var(--content-color);
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .itemsContainer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.65rem 1.35rem 0.65rem 2.25rem;
    border-bottom: 1px solid var(--theme-button-border-hovered);
  }

  .buttonWrapper {
    margin-right: 1px;

    &:last-child {
      margin-right: 0;
    }
  }
</style>
