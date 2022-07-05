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
  import { Class, Doc, DocumentQuery, Lookup, Ref, SortingOrder, WithLookup } from '@anticrm/core'
  import { Kanban } from '@anticrm/kanban'
  import notification from '@anticrm/notification'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { Issue, IssuesGrouping, IssuesOrdering, IssueStatus, Team, ViewOptions } from '@anticrm/tracker'
  import { Button, Component, Icon, IconAdd, showPanel, showPopup, getPlatformColor } from '@anticrm/ui'
  import { focusStore, ListSelectionProvider, SelectDirection, selectionStore } from '@anticrm/view-resources'
  import ActionContext from '@anticrm/view-resources/src/components/ActionContext.svelte'
  import Menu from '@anticrm/view-resources/src/components/Menu.svelte'
  import { onMount } from 'svelte'
  import tracker from '../../plugin'
  import { getKanbanStatuses, issuesSortOrderMap } from '../../utils'
  import CreateIssue from '../CreateIssue.svelte'
  import ProjectEditor from '../projects/ProjectEditor.svelte'
  import AssigneePresenter from './AssigneePresenter.svelte'
  import SubIssuesSelector from './edit/SubIssuesSelector.svelte'
  import IssuePresenter from './IssuePresenter.svelte'
  import ParentNamesPresenter from './ParentNamesPresenter.svelte'
  import PriorityEditor from './PriorityEditor.svelte'
  import StatusEditor from './StatusEditor.svelte'

  export let currentSpace: Ref<Team> = tracker.team.DefaultTeam
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined
  export let viewOptions: ViewOptions
  export let query: DocumentQuery<Issue> = {}

  $: currentSpace = typeof query.space === 'string' ? query.space : tracker.team.DefaultTeam
  $: ({ groupBy, orderBy, shouldShowEmptyGroups, shouldShowSubIssues } = viewOptions)
  $: sort = { [orderBy]: issuesSortOrderMap[orderBy] }
  $: rankFieldName = orderBy === IssuesOrdering.Manual ? orderBy : undefined
  $: resultQuery = {
    ...(shouldShowSubIssues ? {} : { attachedTo: tracker.ids.NoParent }),
    space: currentSpace,
    ...query
  } as any

  const spaceQuery = createQuery()
  const statusesQuery = createQuery()

  const client = getClient()
  let currentTeam: Team | undefined
  $: spaceQuery.query(tracker.class.Team, { _id: currentSpace }, (res) => {
    currentTeam = res.shift()
  })

  let issueStatuses: WithLookup<IssueStatus>[] | undefined
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
    showPopup(
      Menu,
      { object: items, baseMenuClass },
      {
        getBoundingClientRect: () => DOMRect.fromRect({ width: 1, height: 1, x: ev.clientX, y: ev.clientY })
      },
      () => {
        // selection = undefined
      }
    )
  }
</script>

{#await getKanbanStatuses(client, groupBy, resultQuery, shouldShowEmptyGroups) then states}
  <ActionContext
    context={{
      mode: 'browser'
    }}
  />
  <Kanban
    bind:this={kanbanUI}
    _class={tracker.class.Issue}
    search=""
    {states}
    options={{ sort, lookup }}
    query={resultQuery}
    fieldName={groupBy}
    {rankFieldName}
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
      <div class="header flex-col">
        <div class="flex-between label font-medium w-full h-full">
          <div class="flex-row-center gap-2">
            <Icon icon={state.icon} fill={getPlatformColor(state.color)} size={'small'} />
            <span class="lines-limit-2 ml-2">{state.title}</span>
            <span class="counter ml-2 text-md">{count}</span>
          </div>
          {#if groupBy === IssuesGrouping.Status}
            <div class="flex gap-1">
              <Button
                icon={IconAdd}
                kind={'transparent'}
                showTooltip={{ label: tracker.string.AddIssueTooltip, direction: 'left' }}
                on:click={() => {
                  showPopup(CreateIssue, { space: currentSpace, status: state._id }, 'top')
                }}
              />
            </div>
          {/if}
        </div>
      </div>
    </svelte:fragment>
    <svelte:fragment slot="card" let:object>
      {@const issue = toIssue(object)}
      <div
        class="tracker-card"
        on:click={() => {
          showPanel(tracker.component.EditIssue, object._id, object._class, 'content')
        }}
      >
        <div class="flex-col mr-8">
          <div class="flex clear-mins names">
            <IssuePresenter value={issue} />
            <ParentNamesPresenter value={issue} />
          </div>
          <div class="flex-row-center gap-1">
            {#if groupBy !== 'status'}
              <StatusEditor value={issue} kind="list" />
            {/if}
            <span class="fs-bold caption-color mt-1 lines-limit-2">
              {object.title}
            </span>
          </div>
        </div>
        <div class="abs-rt-content">
          <AssigneePresenter
            value={issue.$lookup?.assignee}
            defaultClass={contact.class.Employee}
            issueId={issue._id}
            {currentSpace}
            isEditable={true}
          />
          <div class="flex-center mt-2">
            <Component is={notification.component.NotificationPresenter} props={{ value: object }} />
          </div>
        </div>
        <div class="buttons-group xsmall-gap mt-10px">
          {#if issue && issueStatuses && issue.subIssues > 0}
            <SubIssuesSelector {issue} {currentTeam} {issueStatuses} />
          {/if}
          <PriorityEditor value={issue} isEditable={true} kind={'link-bordered'} size={'inline'} justify={'center'} />
          <ProjectEditor
            value={issue}
            isEditable={true}
            kind={'link-bordered'}
            size={'inline'}
            justify={'center'}
            width={''}
          />
        </div>
      </div>
    </svelte:fragment>
  </Kanban>
{/await}

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
    padding: 0.5rem 1rem;
    min-height: 6.5rem;
  }
</style>
