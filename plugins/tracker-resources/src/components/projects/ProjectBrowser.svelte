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
  import { DocumentQuery, FindOptions, SortingOrder } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { Project } from '@hcengineering/tracker'
  import { Button, IconAdd, Label, showPopup, TabList } from '@hcengineering/ui'
  import type { TabItem } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import view from '@hcengineering/view'
  import { getIncludedProjectStatuses, projectsTitleMap, ProjectsViewMode } from '../../utils'
  import NewProject from './NewProject.svelte'
  import ProjectsListBrowser from './ProjectsListBrowser.svelte'

  export let label: IntlString
  export let query: DocumentQuery<Project> = {}
  export let search: string = ''
  export let mode: ProjectsViewMode = 'all'
  export let viewMode: 'list' | 'timeline' = 'list'

  const ENTRIES_LIMIT = 200
  const resultProjectsQuery = createQuery()

  const projectOptions: FindOptions<Project> = {
    sort: { modifiedOn: SortingOrder.Descending },
    limit: ENTRIES_LIMIT,
    lookup: { lead: contact.class.Employee, members: contact.class.Employee }
  }

  let resultProjects: Project[] = []

  $: includedProjectStatuses = getIncludedProjectStatuses(mode)
  $: title = projectsTitleMap[mode]
  $: includedProjectsQuery = { status: { $in: includedProjectStatuses } }

  $: baseQuery = {
    ...includedProjectsQuery,
    ...query
  }

  $: resultQuery = search === '' ? baseQuery : { $search: search, ...baseQuery }

  $: resultProjectsQuery.query<Project>(
    tracker.class.Project,
    { ...resultQuery },
    (result) => {
      resultProjects = result
    },
    projectOptions
  )

  const space = typeof query.space === 'string' ? query.space : tracker.team.DefaultTeam
  const showCreateDialog = async () => {
    showPopup(NewProject, { space, targetElement: null }, 'top')
  }

  const handleViewModeChanged = (newMode: ProjectsViewMode) => {
    if (newMode === undefined || newMode === mode) {
      return
    }

    mode = newMode
  }

  const modeList: TabItem[] = [
    { id: 'all', labelIntl: tracker.string.AllProjects, action: () => handleViewModeChanged('all') },
    { id: 'backlog', labelIntl: tracker.string.BacklogProjects, action: () => handleViewModeChanged('backlog') },
    { id: 'active', labelIntl: tracker.string.ActiveProjects, action: () => handleViewModeChanged('active') },
    { id: 'closed', labelIntl: tracker.string.ClosedProjects, action: () => handleViewModeChanged('closed') }
  ]
  const viewList: TabItem[] = [
    { id: 'list', icon: view.icon.List, tooltip: view.string.List },
    { id: 'timeline', icon: view.icon.Timeline, tooltip: view.string.Timeline }
  ]
</script>

<div class="fs-title flex-between header">
  <div class="flex-center">
    <Label {label} />
    <div class="projectTitle">
      › <Label label={title} />
    </div>
  </div>
  <Button size="small" icon={IconAdd} label={tracker.string.Project} kind={'primary'} on:click={showCreateDialog} />
</div>
<div class="itemsContainer">
  <div class="flex-row-center">
    <TabList
      items={modeList}
      selected={mode}
      kind={'normal'}
      on:select={(result) => {
        if (result.detail !== undefined && result.detail.action) result.detail.action()
      }}
    />
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
  <TabList
    items={viewList}
    selected={viewMode}
    kind={'secondary'}
    size={'small'}
    on:select={(result) => {
      if (result.detail !== undefined && result.detail.id !== viewMode) viewMode = result.detail.id
    }}
  />
</div>
<ProjectsListBrowser
  _class={tracker.class.Project}
  itemsConfig={[
    { key: '', presenter: tracker.component.IconPresenter },
    { key: '', presenter: tracker.component.ProjectPresenter, props: { kind: 'list' } },
    {
      key: '$lookup.lead',
      presenter: tracker.component.LeadPresenter,
      props: { _class: tracker.class.Project, defaultClass: contact.class.Employee, shouldShowLabel: false }
    },
    { key: '', presenter: tracker.component.ProjectMembersPresenter, props: { kind: 'link' } },
    { key: '', presenter: tracker.component.TargetDatePresenter },
    { key: '', presenter: tracker.component.ProjectStatusPresenter }
  ]}
  projects={resultProjects}
  {viewMode}
/>

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
    padding: 0.65rem 0.75rem 0.65rem 2.25rem;
    background-color: var(--board-bg-color);
    border-top: 1px solid var(--divider-color);
    border-bottom: 1px solid var(--divider-color);
  }

  // .filterButton {
  //   color: var(--caption-color);
  // }
</style>
