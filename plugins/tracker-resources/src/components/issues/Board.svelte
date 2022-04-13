<script lang="ts">
  import contact from '@anticrm/contact'
  import { FindOptions, Ref, WithLookup } from '@anticrm/core'
  import { Kanban } from '@anticrm/kanban'
  import { createQuery } from '@anticrm/presentation'
  import { Issue, IssueStatus, Team } from '@anticrm/tracker'
  import { Button, Component, Icon, IconAdd, IconMoreH, showPopup, Tooltip } from '@anticrm/ui'
  import view from '@anticrm/view'
  import tracker from '../../plugin'
  import CreateIssue from '../CreateIssue.svelte'
  import IssuePresenter from './IssuePresenter.svelte'

  export let currentSpace: Ref<Team>

  const states = [
    {
      _id: IssueStatus.Backlog,
      title: 'Backlog',
      color: 0,
      icon: tracker.icon.StatusBacklog
    },
    {
      _id: IssueStatus.InProgress,
      title: 'In progress',
      color: 1,
      icon: tracker.icon.StatusInProgress
    },
    {
      _id: IssueStatus.Todo,
      title: 'To do',
      color: 2,
      icon: tracker.icon.StatusTodo
    },
    {
      _id: IssueStatus.Done,
      title: 'Done',
      color: 3,
      icon: tracker.icon.StatusDone
    },
    {
      _id: IssueStatus.Canceled,
      title: 'Canceled',
      color: 4,
      icon: tracker.icon.StatusCanceled
    }
  ]
  /* eslint-disable no-undef */

  const spaceQuery = createQuery()

  let currentTeam: Team | undefined

  $: spaceQuery.query(tracker.class.Team, { _id: currentSpace }, (res) => {
    currentTeam = res.shift()
  })
  /* eslint-disable prefer-const */
  /* eslint-disable no-unused-vars */
  let issue: Issue

  function toIssue (object: any): WithLookup<Issue> {
    return object as WithLookup<Issue>
  }

  const options: FindOptions<Issue> = {
    lookup: {
      assignee: contact.class.Employee
    }
  }
</script>

{#if currentTeam}
  <div class="flex-between label font-medium w-full p-4">
    Board
  </div>
  <Kanban
    _class={tracker.class.Issue}
    space={currentSpace}
    search=""
    {states}
    {options}
    query={{}}
    fieldName={'status'}
    rankFieldName={'rank'}
  >
    <svelte:fragment slot="header" let:state let:count>
      <div class="header flex-col">        
        <div class="flex-between label font-medium w-full h-full mb-4">
          <div class="flex-row-center gap-2">
            <Icon icon={state.icon} size={'small'} />
            <span class="lines-limit-2 ml-2">{state.title}</span>
            <span class="counter ml-2 text-md">{count}</span>
          </div>
          <div class="flex gap-1">
            <Tooltip label={tracker.string.AddIssueTooltip} direction={'left'}>
              <Button
                icon={IconAdd}
                kind={'transparent'}
                on:click={(evt) => {
                  showPopup(CreateIssue, { space: currentSpace, issueStatus: state._id }, evt.target)
                }}
              />
            </Tooltip>
            <Button icon={IconMoreH} kind={'transparent'} />
          </div>
        </div>
      </div>
    </svelte:fragment>
    <svelte:fragment slot="card" let:object>
      {@const issue = toIssue(object)}
      <div class="flex-row h-18 pt-2 pb-2 pr-4 pl-4">
        <div class="flex-between mb-2">
          <IssuePresenter value={object} {currentTeam} />
          {#if issue.$lookup?.assignee}
            <Component
              is={view.component.ObjectPresenter}
              props={{ value: issue.$lookup.assignee, props: { showLabel: false } }}
            />
          {/if}
        </div>
        <span class="fs-bold title">
          {object.title}
        </span>
      </div>
    </svelte:fragment>
  </Kanban>
{/if}

<style lang="scss">
  .header {
    height: 6rem;
    min-height: 6rem;
    user-select: none;

    .filter {
      border-bottom: 1px solid var(--divider-color);
    }

    .label {
      color: var(--theme-caption-color);
      border-bottom: 1px solid var(--divider-color);
      .counter {
        color: rgba(var(--theme-caption-color), 0.8);
      }
    }
  }
  .title {
    color: var(--theme-caption-color);
  }
</style>
