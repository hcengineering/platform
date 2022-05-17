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
  import contact from '@anticrm/contact'
  import { DocumentQuery, FindOptions, Ref, SortingOrder } from '@anticrm/core'
  import { IntlString } from '@anticrm/platform'
  import { createQuery } from '@anticrm/presentation'
  import { Project, Team } from '@anticrm/tracker'
  import { Button, IconAdd, IconOptions, Label, showPopup } from '@anticrm/ui'

  import tracker from '../../plugin'
  import NewProject from './NewProject.svelte'
  import ProjectsListBrowser from './ProjectsListBrowser.svelte'

  export let currentSpace: Ref<Team>
  export let title: IntlString = tracker.string.AllProjects
  export let query: DocumentQuery<Project> = {}
  export let search: string = ''

  const ENTRIES_LIMIT = 200
  const resultProjectsQuery = createQuery()

  const projectOptions: FindOptions<Project> = {
    sort: { modifiedOn: SortingOrder.Descending },
    limit: ENTRIES_LIMIT,
    lookup: { lead: contact.class.Employee, members: contact.class.Employee }
  }

  let resultProjects: Project[] = []

  $: baseQuery = {
    space: currentSpace,
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

  const showCreateDialog = async () => {
    showPopup(NewProject, { space: currentSpace, targetElement: null }, null)
  }
</script>

<div>
  <div class="fs-title flex-between header">
    <div class="flex-center">
      <Label label={tracker.string.Projects} />
      <div class="projectTitle">
        › <Label label={title} />
      </div>
    </div>
    <Button size="small" icon={IconAdd} label={tracker.string.Project} kind="secondary" on:click={showCreateDialog} />
  </div>
  <div class="itemsContainer">
    <div class="flex-center">
      <div class="flex-center">
        <div class="buttonWrapper">
          <Button selected size="small" shape="rectangle-right" label={tracker.string.AllProjects} />
        </div>
        <div class="buttonWrapper">
          <Button size="small" shape="rectangle" label={tracker.string.BacklogProjects} />
        </div>
        <div class="buttonWrapper">
          <Button size="small" shape="rectangle" label={tracker.string.ActiveProjects} />
        </div>
        <div class="buttonWrapper">
          <Button size="small" shape="rectangle-left" label={tracker.string.ClosedProjects} />
        </div>
      </div>
      <div class="ml-3 filterButton">
        <Button
          size="small"
          icon={IconAdd}
          kind={'link-bordered'}
          borderStyle={'dashed'}
          label={tracker.string.Filter}
          on:click={() => {}}
        />
      </div>
    </div>
    <div class="flex-center">
      <div class="flex-center">
        <div class="buttonWrapper">
          <Button selected size="small" shape="rectangle-right" icon={tracker.icon.ProjectsList} />
        </div>
        <div class="buttonWrapper">
          <Button size="small" shape="rectangle-left" icon={tracker.icon.ProjectsTimeline} />
        </div>
      </div>
      <div class="ml-3">
        <Button size="small" icon={IconOptions} on:click={() => {}} />
      </div>
    </div>
  </div>
  <ProjectsListBrowser
    _class={tracker.class.Project}
    itemsConfig={[
      { key: '', presenter: tracker.component.IconPresenter },
      { key: '', presenter: tracker.component.ProjectPresenter },
      {
        key: '$lookup.lead',
        presenter: tracker.component.LeadPresenter,
        props: { currentSpace, defaultClass: contact.class.Employee, shouldShowLabel: false }
      },
      { key: '', presenter: tracker.component.ProjectMembersPresenter, props: { kind: 'link' } },
      { key: '', presenter: tracker.component.DueDatePresenter },
      { key: '', presenter: tracker.component.ProjectStatusPresenter }
    ]}
    projects={resultProjects}
  />
</div>

<style lang="scss">
  .header {
    min-height: 3.5rem;
    padding-left: 2.25rem;
    padding-right: 0.5rem;
    border-bottom: 1px solid var(--theme-button-border-hovered);
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

  .filterButton {
    color: var(--caption-color);
  }
</style>
