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
  import { Milestone } from '@hcengineering/tracker'
  import { Button, IconAdd, Label, SearchEdit, TabItem, TabList, showPopup } from '@hcengineering/ui'
  import { ViewOptions, Viewlet } from '@hcengineering/view'
  import { FilterBar, FilterButton, ViewletSelector, ViewletSettingButton } from '@hcengineering/view-resources'
  import tracker from '../../plugin'
  import { MilestoneViewMode, getIncludedMilestoneStatuses, milestoneTitleMap } from '../../utils'
  import MilestoneContent from './MilestoneContent.svelte'
  import NewMilestone from './NewMilestone.svelte'

  export let label: IntlString
  export let query: DocumentQuery<Milestone> = {}
  export let search: string = ''
  export let mode: MilestoneViewMode = 'all'

  const space = typeof query.space === 'string' ? query.space : tracker.project.DefaultProject
  const showCreateDialog = async () => {
    showPopup(NewMilestone, { space, targetElement: null }, 'top')
  }

  export let panelWidth: number = 0

  let viewlet: WithLookup<Viewlet> | undefined = undefined
  let viewOptions: ViewOptions | undefined

  let searchQuery: DocumentQuery<Milestone> = { ...query }
  function updateSearchQuery (search: string): void {
    searchQuery = search === '' ? { ...query } : { ...query, $search: search }
  }
  $: if (query) updateSearchQuery(search)

  $: includedMilestoneStatuses = getIncludedMilestoneStatuses(mode)
  $: title = milestoneTitleMap[mode]
  $: includedMilestonesQuery = { status: { $in: includedMilestoneStatuses } }

  let resultQuery: DocumentQuery<Milestone> = { ...searchQuery }

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

  const handleViewModeChanged = (newMode: MilestoneViewMode) => {
    if (newMode === undefined || newMode === mode) {
      return
    }

    mode = newMode
  }

  const modeList: TabItem[] = [
    { id: 'all', labelIntl: tracker.string.AllMilestones, action: () => handleViewModeChanged('all') },
    { id: 'planned', labelIntl: tracker.string.PlannedMilestones, action: () => handleViewModeChanged('planned') },
    { id: 'active', labelIntl: tracker.string.ActiveMilestones, action: () => handleViewModeChanged('active') },
    { id: 'closed', labelIntl: tracker.string.ClosedMilestones, action: () => handleViewModeChanged('closed') }
  ]
</script>

<div class="ac-header full divide caption-height">
  <div class="ac-header__wrap-title mr-3">
    <span class="ac-header__title"><Label {label} /></span>
    <span class="componentTitle">
      &nbsp;› <Label label={title} />
    </span>
  </div>

  <div class="ac-header-full medium-gap mb-1">
    <Button icon={IconAdd} label={tracker.string.Milestone} kind={'accented'} on:click={showCreateDialog} />
  </div>
</div>
<div class="ac-header full divide search-start">
  <div class="ac-header-full small-gap">
    <SearchEdit bind:value={search} on:change={() => {}} />
    <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
    <div class="buttons-divider" />
    <FilterButton _class={tracker.class.Milestone} {space} />
  </div>
  <div class="ac-header-full medium-gap">
    <ViewletSelector viewletQuery={{ attachTo: tracker.class.Milestone }} bind:viewlet />
    <ViewletSettingButton bind:viewOptions bind:viewlet />
    <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
  </div>
</div>
<div class="ac-header tabs-start full divide">
  <TabList
    items={modeList}
    selected={mode}
    kind={'plain'}
    on:select={(result) => {
      if (result.detail !== undefined && result.detail.action) result.detail.action()
    }}
  />
</div>

<FilterBar
  _class={tracker.class.Milestone}
  query={searchQuery}
  {space}
  {viewOptions}
  on:change={(e) => (resultQuery = e.detail)}
/>

<div class="flex w-full h-full clear-mins">
  {#if viewlet && viewOptions}
    <MilestoneContent {viewlet} query={{ ...resultQuery, ...includedMilestonesQuery }} {space} {viewOptions} />
  {/if}
  {#if $$slots.aside !== undefined && asideShown}
    <div class="popupPanel-body__aside flex" class:float={asideFloat} class:shown={asideShown}>
      <slot name="aside" />
    </div>
  {/if}
</div>
