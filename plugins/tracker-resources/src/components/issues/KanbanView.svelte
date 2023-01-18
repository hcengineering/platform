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
  import { Class, Doc, DocumentQuery, Lookup, Ref, SortingOrder, WithLookup } from '@hcengineering/core'
  import { Kanban, TypeState } from '@hcengineering/kanban'
  import notification from '@hcengineering/notification'
  import { getResource } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import tags from '@hcengineering/tags'
  import { Issue, IssuesGrouping, IssuesOrdering, IssueStatus, Team } from '@hcengineering/tracker'
  import {
    Button,
    Component,
    getEventPositionElement,
    IconAdd,
    Loading,
    showPanel,
    showPopup,
    tooltip
  } from '@hcengineering/ui'
  import { ViewOptionModel, ViewOptions, ViewQueryOption } from '@hcengineering/view'
  import {
    focusStore,
    ListSelectionProvider,
    noCategory,
    SelectDirection,
    selectionStore
  } from '@hcengineering/view-resources'
  import ActionContext from '@hcengineering/view-resources/src/components/ActionContext.svelte'
  import Menu from '@hcengineering/view-resources/src/components/Menu.svelte'
  import { onMount } from 'svelte'
  import tracker from '../../plugin'
  import { getIssueStatusStates, getKanbanStatuses, getPriorityStates, issuesGroupBySorting } from '../../utils'
  import CreateIssue from '../CreateIssue.svelte'
  import ProjectEditor from '../projects/ProjectEditor.svelte'
  import AssigneePresenter from './AssigneePresenter.svelte'
  import SubIssuesSelector from './edit/SubIssuesSelector.svelte'
  import IssuePresenter from './IssuePresenter.svelte'
  import IssueStatusIcon from './IssueStatusIcon.svelte'
  import ParentNamesPresenter from './ParentNamesPresenter.svelte'
  import PriorityEditor from './PriorityEditor.svelte'
  import StatusEditor from './StatusEditor.svelte'
  import EstimationEditor from './timereport/EstimationEditor.svelte'

  export let space: Ref<Team> | undefined = undefined
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined
  export let query: DocumentQuery<Issue> = {}
  export let viewOptionsConfig: ViewOptionModel[] | undefined
  export let viewOptions: ViewOptions

  $: currentSpace = space || tracker.team.DefaultTeam
  $: groupBy = (viewOptions.groupBy ?? noCategory) as IssuesGrouping
  $: orderBy = viewOptions.orderBy
  $: sort = { [orderBy[0]]: orderBy[1] }
  $: dontUpdateRank = orderBy[0] !== IssuesOrdering.Manual

  const spaceQuery = createQuery()
  const statusesQuery = createQuery()

  let currentTeam: Team | undefined
  $: spaceQuery.query(tracker.class.Team, { _id: currentSpace }, (res) => {
    currentTeam = res.shift()
  })

  let resultQuery: DocumentQuery<any> = query
  $: getResultQuery(query, viewOptionsConfig, viewOptions).then((p) => (resultQuery = p))

  const client = getClient()
  const hierarchy = client.getHierarchy()

  async function getResultQuery (
    query: DocumentQuery<Issue>,
    viewOptions: ViewOptionModel[] | undefined,
    viewOptionsStore: ViewOptions
  ): Promise<DocumentQuery<Issue>> {
    if (viewOptions === undefined) return query
    let result = hierarchy.clone(query)
    for (const viewOption of viewOptions) {
      if (viewOption.actionTartget !== 'query') continue
      const queryOption = viewOption as ViewQueryOption
      const f = await getResource(queryOption.action)
      result = f(viewOptionsStore[queryOption.key] ?? queryOption.defaultValue, query)
    }
    return result
  }

  let issueStatuses: WithLookup<IssueStatus>[] | undefined
  $: issueStatusStates = getIssueStatusStates(issueStatuses)
  $: statusesQuery.query(
    tracker.class.IssueStatus,
    { attachedTo: currentSpace },
    (is) => {
      issueStatuses = is
    },
    {
      lookup: { category: tracker.class.IssueStatusCategory },
      sort: { rank: SortingOrder.Ascending }
    }
  )

  function toIssue (object: any): WithLookup<Issue> {
    return object as WithLookup<Issue>
  }

  const lookup: Lookup<Issue> = {
    assignee: contact.class.Employee,
    space: tracker.class.Team,
    _id: {
      subIssues: tracker.class.Issue
    }
  }

  let kanbanUI: Kanban
  const listProvider = new ListSelectionProvider((offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection) => {
    kanbanUI.select(offset, of, dir)
  })
  onMount(() => {
    ;(document.activeElement as HTMLElement)?.blur()
  })

  const showMenu = async (ev: MouseEvent, items: Doc[]): Promise<void> => {
    ev.preventDefault()
    showPopup(Menu, { object: items, baseMenuClass }, getEventPositionElement(ev), () => {
      // selection = undefined
    })
  }
  const issuesQuery = createQuery()
  let issueStates: TypeState[] = []
  const lookupIssue: Lookup<Issue> = {
    status: [tracker.class.IssueStatus, { category: tracker.class.IssueStatusCategory }],
    project: tracker.class.Project,
    sprint: tracker.class.Sprint,
    assignee: contact.class.Employee
  }
  $: issuesQuery.query(
    tracker.class.Issue,
    resultQuery,
    async (result) => {
      issueStates = await getKanbanStatuses(groupBy, result)
    },
    {
      lookup: lookupIssue,
      sort: issuesGroupBySorting[groupBy]
    }
  )

  let priorityStates: TypeState[] = []
  getPriorityStates().then((states) => {
    priorityStates = states
  })
  function getIssueStates (
    groupBy: IssuesGrouping,
    states: TypeState[],
    statusStates: TypeState[],
    priorityStates: TypeState[]
  ) {
    if (states.length > 0) return states
    if (groupBy === IssuesGrouping.Status) return statusStates
    if (groupBy === IssuesGrouping.Priority) return priorityStates
    return []
  }
  $: states = getIssueStates(groupBy, issueStates, issueStatusStates, priorityStates)

  const fullFilled: { [key: string]: boolean } = {}
  const getState = (state: any): WithLookup<IssueStatus> | undefined => {
    return issueStatuses?.filter((is) => is._id === state._id)[0]
  }
</script>

{#if !states?.length}
  <Loading />
{:else}
  <ActionContext
    context={{
      mode: 'browser'
    }}
  />
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <Kanban
    bind:this={kanbanUI}
    _class={tracker.class.Issue}
    {states}
    {dontUpdateRank}
    options={{ sort, lookup }}
    query={resultQuery}
    fieldName={groupBy}
    on:content={(evt) => {
      listProvider.update(evt.detail)
    }}
    on:obj-focus={(evt) => {
      listProvider.updateFocus(evt.detail)
    }}
    selection={listProvider.current($focusStore)}
    checked={$selectionStore ?? []}
    on:check={(evt) => {
      listProvider.updateSelection(evt.detail.docs, evt.detail.value)
    }}
    on:contextmenu={(evt) => showMenu(evt.detail.evt, evt.detail.objects)}
  >
    <svelte:fragment slot="header" let:state let:count>
      {@const stateWLU = getState(state)}
      <div class="header flex-col">
        <div class="flex-between label font-medium w-full h-full">
          <div class="flex-row-center gap-2">
            {#if stateWLU !== undefined}<IssueStatusIcon value={stateWLU} size={'small'} />{/if}
            <span class="lines-limit-2 ml-2">{state.title}</span>
            <span class="counter ml-2 text-md">{count}</span>
          </div>
          <div class="flex gap-1">
            <Button
              icon={IconAdd}
              kind={'transparent'}
              showTooltip={{ label: tracker.string.AddIssueTooltip, direction: 'left' }}
              on:click={() => {
                showPopup(CreateIssue, { space: currentSpace, [groupBy]: state._id }, 'top')
              }}
            />
          </div>
        </div>
      </div>
    </svelte:fragment>
    <svelte:fragment slot="card" let:object>
      {@const issue = toIssue(object)}
      {@const issueId = object._id}
      <div
        class="tracker-card"
        on:click={() => {
          showPanel(tracker.component.EditIssue, object._id, object._class, 'content')
        }}
      >
        <div class="flex-col ml-4 mr-8">
          <div class="flex clear-mins names">
            <IssuePresenter value={issue} />
            <ParentNamesPresenter value={issue} />
          </div>
          <div class="flex-row-center gap-1 mt-1">
            {#if groupBy !== 'status'}
              <StatusEditor value={issue} kind="list" isEditable={false} />
            {/if}
            <span class="fs-bold caption-color lines-limit-2">
              {object.title}
            </span>
          </div>
        </div>
        <div class="abs-rt-content">
          <AssigneePresenter
            value={issue.$lookup?.assignee}
            defaultClass={contact.class.Employee}
            object={issue}
            isEditable={true}
          />
          <div class="flex-center mt-2">
            <Component is={notification.component.NotificationPresenter} props={{ value: object }} />
          </div>
        </div>
        <div class="buttons-group xsmall-gap states-bar">
          {#if issue && issue.subIssues > 0}
            <SubIssuesSelector value={issue} {currentTeam} />
          {/if}
          <PriorityEditor value={issue} isEditable={true} kind={'link-bordered'} size={'inline'} justify={'center'} />
          <ProjectEditor
            value={issue}
            isEditable={true}
            kind={'link-bordered'}
            size={'inline'}
            justify={'center'}
            width={''}
            bind:onlyIcon={fullFilled[issueId]}
          />
          <EstimationEditor kind={'list'} size={'small'} value={issue} />
          <div
            class="clear-mins"
            use:tooltip={{
              component: fullFilled[issueId] ? tags.component.LabelsPresenter : undefined,
              props: { object: issue, kind: 'full' }
            }}
          >
            <Component
              is={tags.component.LabelsPresenter}
              props={{ object: issue, ckeckFilled: fullFilled[issueId] }}
              on:change={(res) => {
                if (res.detail.full) fullFilled[issueId] = true
              }}
            />
          </div>
        </div>
      </div>
    </svelte:fragment>
  </Kanban>
{/if}

<style lang="scss">
  .names {
    font-size: 0.8125rem;
  }

  .header {
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--divider-color);

    .label {
      color: var(--caption-color);
      .counter {
        color: rgba(var(--caption-color), 0.8);
      }
    }
  }
  .tracker-card {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    // padding: 0.5rem 1rem;
    min-height: 6.5rem;
  }
  .states-bar {
    flex-shrink: 10;
    width: fit-content;
    margin: 0.625rem 1rem 0;
  }
</style>
