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
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Project } from '@hcengineering/tracker'
  import { Button, IconAdd, Label, showPopup, TabList, Component } from '@hcengineering/ui'
  import type { TabItem } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import view, { Viewlet } from '@hcengineering/view'
  import { setActiveViewletId, getActiveViewletId } from '@hcengineering/view-resources'
  import { getIncludedProjectStatuses, projectsTitleMap, ProjectsViewMode } from '../../utils'
  import NewProject from './NewProject.svelte'

  export let label: IntlString
  export let query: DocumentQuery<Project> = {}
  export let search: string = ''
  export let mode: ProjectsViewMode = 'all'

  const ENTRIES_LIMIT = 200
  const resultProjectsQuery = createQuery()
  const client = getClient()

  let viewlets: WithLookup<Viewlet>[] = []
  let selectedViewlet: WithLookup<Viewlet> | undefined = undefined

  $: update()

  async function update (): Promise<void> {
    viewlets = await client.findAll(
      view.class.Viewlet,
      { attachTo: tracker.class.Project },
      {
        lookup: {
          descriptor: view.class.ViewletDescriptor
        }
      }
    )
    const _id = getActiveViewletId()
    selectedViewlet = viewlets.find((viewlet) => viewlet._id === _id) || viewlets[0]
    setActiveViewletId(selectedViewlet._id)
  }

  $: viewslist = viewlets.map((views) => {
    return {
      id: views._id,
      icon: views.$lookup?.descriptor?.icon,
      tooltip: views.$lookup?.descriptor?.label
    }
  })

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
  {#if viewslist && selectedViewlet}
    <TabList
      items={viewslist}
      selected={selectedViewlet?._id}
      kind={'secondary'}
      size={'small'}
      on:select={(result) => {
        if (result.detail !== undefined) {
          selectedViewlet = viewlets.find((vl) => vl._id === result.detail.id)
          if (selectedViewlet) setActiveViewletId(selectedViewlet._id)
        }
      }}
    />
  {/if}
</div>
{#if selectedViewlet && selectedViewlet.$lookup?.descriptor?.component}
  <Component
    is={selectedViewlet.$lookup?.descriptor?.component}
    props={{
      _class: tracker.class.Project,
      viewlet: selectedViewlet,
      projects: resultProjects
    }}
  />
{/if}

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
