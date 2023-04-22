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
  import { DocumentQuery, Ref, WithLookup } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { Sprint } from '@hcengineering/tracker'
  import {
    Button,
    ActionIcon,
    IconMoreH,
    Label,
    SearchEdit,
    location,
    showPopup,
    TabList,
    TabItem
  } from '@hcengineering/ui'
  import view, { Viewlet } from '@hcengineering/view'
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
  import tracker from '../../plugin'
  import { SprintViewMode, getIncludedSprintStatuses, sprintTitleMap } from '../../utils'
  import NewSprint from './NewSprint.svelte'
  import SprintContent from './SprintContent.svelte'

  export let label: IntlString
  export let query: DocumentQuery<Sprint> = {}
  export let search: string = ''
  export let mode: SprintViewMode = 'all'

  const space = typeof query.space === 'string' ? query.space : tracker.project.DefaultProject
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

  let resultQuery: DocumentQuery<Sprint> = { ...searchQuery }

  let viewlets: WithLookup<Viewlet>[] = []

  $: update(viewlets, active)

  const viewletQuery = createQuery()
  viewletQuery.query(view.class.Viewlet, { attachTo: tracker.class.Sprint }, (res) => (viewlets = res), {
    lookup: {
      descriptor: view.class.ViewletDescriptor
    }
  })

  let key = makeViewletKey()

  onDestroy(
    location.subscribe((loc) => {
      key = makeViewletKey(loc)
    })
  )

  $: active = $activeViewlet[key]

  async function update (viewlets: WithLookup<Viewlet>[], active: Ref<Viewlet> | null): Promise<void> {
    viewlet = viewlets.find((viewlet) => viewlet._id === active) ?? viewlets[0]
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

  $: viewOptions = getViewOptions(viewlet, $viewOptionStore)

  const handleViewModeChanged = (newMode: SprintViewMode) => {
    if (newMode === undefined || newMode === mode) {
      return
    }

    mode = newMode
  }

  const modeList: TabItem[] = [
    { id: 'all', labelIntl: tracker.string.AllSprints, action: () => handleViewModeChanged('all') },
    { id: 'planned', labelIntl: tracker.string.PlannedSprints, action: () => handleViewModeChanged('planned') },
    { id: 'active', labelIntl: tracker.string.ActiveSprints, action: () => handleViewModeChanged('active') },
    { id: 'closed', labelIntl: tracker.string.ClosedSprints, action: () => handleViewModeChanged('closed') }
  ]
</script>

<div class="ac-header full divide caption-height">
  <div class="ac-header__wrap-title mr-3">
    <span class="ac-header__title"><Label {label} /></span>
    <span class="componentTitle">
      › <Label label={title} />
    </span>
  </div>

  <div class="ac-header-full medium-gap mb-1">
    <Button label={tracker.string.Sprint} kind={'primary'} on:click={showCreateDialog} />
  </div>
</div>
<div class="ac-header full divide search-start">
  <div class="ac-header-full small-gap">
    <SearchEdit bind:value={search} on:change={() => {}} />
    <ActionIcon icon={IconMoreH} size={'small'} />
    <div class="buttons-divider" />
    <FilterButton _class={tracker.class.Issue} {space} />
  </div>
  <div class="ac-header-full medium-gap">
    {#if viewlet}
      <ViewletSettingButton bind:viewOptions {viewlet} />
      <ActionIcon icon={IconMoreH} size={'small'} />
    {/if}
  </div>
</div>
<div class="ac-header full divide search-start">
  <div class="ac-header-full small-gap">
    <TabList
      items={modeList}
      selected={mode}
      kind={'normal'}
      on:select={(result) => {
        if (result.detail !== undefined && result.detail.action) result.detail.action()
      }}
    />
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

  .title {
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
    padding: 0.65rem 0.75rem 0.65rem 2.25rem;
    background-color: var(--board-bg-color);
    border-top: 1px solid var(--divider-color);
    border-bottom: 1px solid var(--divider-color);
  }

  .buttonWrapper {
    margin-right: 1px;

    &:last-child {
      margin-right: 0;
    }
  }
</style>
