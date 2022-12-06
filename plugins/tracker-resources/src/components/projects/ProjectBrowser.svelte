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
  import { Button, IconAdd, Label, showPopup } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import { getIncludedProjectStatuses, projectsTitleMap, ProjectsViewMode } from '../../utils'
  import NewProject from './NewProject.svelte'
  import ProjectsListBrowser from './ProjectsListBrowser.svelte'

  export let label: IntlString
  export let query: DocumentQuery<Project> = {}
  export let search: string = ''
  export let mode: ProjectsViewMode = 'all'

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
    showPopup(NewProject, { space, targetElement: null }, null)
  }

  const handleViewModeChanged = (newMode: ProjectsViewMode) => {
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
  <Button size="small" icon={IconAdd} label={tracker.string.Project} kind={'primary'} on:click={showCreateDialog} />
</div>
<div class="itemsContainer">
  <div class="flex-center">
    <div class="flex-center">
      <div class="buttonWrapper">
        <Button
          size="small"
          shape="rectangle-right"
          selected={mode === 'all'}
          label={tracker.string.AllProjects}
          on:click={() => handleViewModeChanged('all')}
        />
      </div>
      <div class="buttonWrapper">
        <Button
          size="small"
          shape="rectangle"
          selected={mode === 'backlog'}
          label={tracker.string.BacklogProjects}
          on:click={() => handleViewModeChanged('backlog')}
        />
      </div>
      <div class="buttonWrapper">
        <Button
          size="small"
          shape="rectangle"
          selected={mode === 'active'}
          label={tracker.string.ActiveProjects}
          on:click={() => handleViewModeChanged('active')}
        />
      </div>
      <div class="buttonWrapper">
        <Button
          size="small"
          shape="rectangle-left"
          selected={mode === 'closed'}
          label={tracker.string.ClosedProjects}
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
