<script lang="ts">
  import contact from '@anticrm/contact'
  import { DocumentQuery, FindOptions } from '@anticrm/core'
  import { Issue, IssueStatus, Team } from '@anticrm/tracker'
  import { ActionIcon, Icon, IconAdd, Scroller } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import IssuesList from './IssuesList.svelte'

  export let query: DocumentQuery<Issue>
  export let category: IssueStatus
  export let currentTeam: Team

  const dispatch = createEventDispatcher()

  const statusIconsMap = Object.freeze({
    [IssueStatus.Backlog]: tracker.icon.StatusBacklog,
    [IssueStatus.Todo]: tracker.icon.StatusTodo,
    [IssueStatus.InProgress]: tracker.icon.StatusInProgress,
    [IssueStatus.Done]: tracker.icon.StatusDone,
    [IssueStatus.Canceled]: tracker.icon.StatusCanceled
  })

  const options: FindOptions<Issue> = {
    lookup: {
      assignee: contact.class.Employee
    }
  }

  let issuesAmount = 0
</script>

<div class="category" class:visible={issuesAmount > 0}>
  <div class="header">
    <div class="title">
      <div class="icon">
        <Icon icon={statusIconsMap[category]} size={'small'} />
      </div>
      <div class="fs-title">
        {IssueStatus[category]}
        {issuesAmount}
      </div>
    </div>
    <div class="mr-3">
      <ActionIcon label={tracker.string.AddIssue} icon={IconAdd} size={'small'} />
    </div>
  </div>
  <Scroller>
    <IssuesList
      _class={tracker.class.Issue}
      config={[
        { key: '', presenter: tracker.component.IssuePresenter, props: { currentTeam } },
        { key: '', presenter: tracker.component.TitlePresenter },
        { key: 'modifiedOn', presenter: tracker.component.ModificationDatePresenter },
        {
          key: '$lookup.assignee',
          props: {
            shouldShowName: false,
            shouldShowPlaceholder: true,
            tooltipLabels: { personLabel: tracker.string.AssignedTo, placeholderLabel: tracker.string.AssignTo }
          }
        }
      ]}
      {options}
      query={{ ...query, status: category }}
      on:content={(evt) => {
        issuesAmount = evt.detail.length
        dispatch('content', issuesAmount)
      }}
    />
  </Scroller>
</div>

<style lang="scss">
  .category {
    display: none;
    &.visible {
      display: block;
    }
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 2.5rem;
    background-color: var(--theme-table-bg-hover);
    padding-left: 2rem;
  }

  .title {
    display: flex;
    align-items: center;
  }

  .icon {
    margin-right: 0.75rem;
    width: 1rem;
    height: 1rem;
  }
</style>
