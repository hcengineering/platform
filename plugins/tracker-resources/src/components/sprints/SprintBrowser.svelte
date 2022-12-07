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
  import contact from '@hcengineering/contact'
  import { DocumentQuery, FindOptions, SortingOrder, WithLookup } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { Sprint } from '@hcengineering/tracker'
  import { Button, defaultSP, Icon, IconAdd, Label, Scroller, showPopup } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import { getIncludedSprintStatuses, sprintTitleMap, SprintViewMode } from '../../utils'
  import NewSprint from './NewSprint.svelte'
  import SprintDatePresenter from './SprintDatePresenter.svelte'
  import SprintListBrowser from './SprintListBrowser.svelte'
  import SprintProjectEditor from './SprintProjectEditor.svelte'

  export let label: IntlString
  export let query: DocumentQuery<Sprint> = {}
  export let search: string = ''
  export let mode: SprintViewMode = 'all'

  const ENTRIES_LIMIT = 200
  const resultSprintsQuery = createQuery()

  const sprintOptions: FindOptions<Sprint> = {
    sort: { startDate: SortingOrder.Descending },
    limit: ENTRIES_LIMIT,
    lookup: {
      lead: contact.class.Employee,
      project: tracker.class.Project
    }
  }

  let resultSprints: WithLookup<Sprint>[] = []

  $: includedSprintStatuses = getIncludedSprintStatuses(mode)
  $: title = sprintTitleMap[mode]
  $: includedSprintsQuery = { status: { $in: includedSprintStatuses } }

  $: baseQuery = {
    ...includedSprintsQuery,
    ...query
  }

  $: resultQuery = search === '' ? baseQuery : { $search: search, ...baseQuery }

  $: resultSprintsQuery.query<Sprint>(
    tracker.class.Sprint,
    { ...resultQuery },
    (result) => {
      resultSprints = result
    },
    sprintOptions
  )

  const space = typeof query.space === 'string' ? query.space : tracker.team.DefaultTeam
  const showCreateDialog = async () => {
    showPopup(NewSprint, { space, targetElement: null }, null)
  }

  const handleViewModeChanged = (newMode: SprintViewMode) => {
    if (newMode === undefined || newMode === mode) {
      return
    }

    mode = newMode
  }
</script>

<div class="fs-title flex-between header">
  <div class="flex-center">
    <Label {label} />
    <div class="projectTitle">
      › <Label label={title} />
    </div>
  </div>
  <Button size="small" icon={IconAdd} label={tracker.string.Sprint} kind={'primary'} on:click={showCreateDialog} />
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
    <!-- <div class="ml-3 filterButton">
        <Button
          size="small"
          icon={IconAdd}
          kind={'link-bordered'}
          borderStyle={'dashed'}
          label={tracker.string.Filter}
          on:click={() => {}}
        />
      </div> -->
  </div>
  <!-- <div class="flex-center">
      <div class="flex-center">
        <div class="buttonWrapper">
          <Button selected size="small" shape="rectangle-right" icon={tracker.icon.ProjectsList} />
        </div>
        <div class="buttonWrapper">
          <Button size="small" shape="rectangle-left" icon={tracker.icon.ProjectsTimeline} />
        </div>
      </div>
      <div class="ml-3">
        <Button size="small" icon={IconOptions} />
      </div>
    </div> -->
</div>
<div class="w-full h-full clear-mins">
  <Scroller fade={defaultSP}>
    <SprintListBrowser
      _class={tracker.class.Sprint}
      itemsConfig={[
        { key: '', presenter: Icon, props: { icon: tracker.icon.Sprint, size: 'small' } },
        { key: '', presenter: tracker.component.SprintPresenter, props: { kind: 'list' } },
        { key: '', presenter: SprintProjectEditor, props: { kind: 'list' } },
        {
          key: '$lookup.lead',
          presenter: tracker.component.LeadPresenter,
          props: {
            _class: tracker.class.Sprint,
            defaultClass: contact.class.Employee,
            shouldShowLabel: false,
            size: 'x-small'
          }
        },
        { key: '', presenter: tracker.component.SprintMembersPresenter, props: { kind: 'link' } },
        { key: '', presenter: SprintDatePresenter, props: { field: 'startDate' } },
        { key: '', presenter: SprintDatePresenter, props: { field: 'targetDate' } },
        { key: '', presenter: tracker.component.SprintStatusPresenter }
      ]}
      sprints={resultSprints}
    />
  </Scroller>
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

  // .filterButton {
  //   color: var(--caption-color);
  // }
</style>
