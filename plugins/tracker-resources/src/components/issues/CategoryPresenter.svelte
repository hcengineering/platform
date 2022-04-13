<script lang="ts">
  import contact from '@anticrm/contact'
  import { DocumentQuery, FindOptions, Ref } from '@anticrm/core'
  import { Issue, IssueStatus, Team } from '@anticrm/tracker'
  import { Icon, IconAdd, Scroller, Tooltip, Button, showPopup, Label } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import IssuesList from './IssuesList.svelte'
  import { issueStatuses } from '../../utils'
  import CreateIssue from '../CreateIssue.svelte'

  export let query: DocumentQuery<Issue>
  export let category: IssueStatus
  export let currentSpace: Ref<Team> | undefined = undefined
  export let currentTeam: Team

  const dispatch = createEventDispatcher()

  const options: FindOptions<Issue> = {
    lookup: {
      assignee: contact.class.Employee
    }
  }

  let issuesAmount = 0

  const handleNewIssueAdded = (event: Event) => {
    if (!currentSpace) {
      return
    }

    showPopup(CreateIssue, { space: currentSpace, issueStatus: category }, event.target)
  }
</script>

<div class="category" class:visible={issuesAmount > 0}>
  <div class="header categoryHeader flex-between label">
    <div class="flex-row-center gap-2">
      <Icon icon={issueStatuses[category].icon} size={'small'} />
      <span class="lines-limit-2"><Label label={issueStatuses[category].label} /></span>
      <span class="eLabelCounter ml-2">{issuesAmount}</span>
    </div>
    <div class="flex mr-1">
      <Tooltip label={tracker.string.AddIssueTooltip} direction={'left'}>
        <Button icon={IconAdd} kind={'transparent'} on:click={handleNewIssueAdded} />
      </Tooltip>
    </div>
  </div>
  <Scroller>
    <IssuesList
      _class={tracker.class.Issue}
      config={[
        { key: '', presenter: tracker.component.PriorityPresenter, props: { currentSpace } },
        { key: '', presenter: tracker.component.IssuePresenter, props: { currentTeam } },
        { key: '', presenter: tracker.component.StatusPresenter, props: { currentSpace } },
        { key: '', presenter: tracker.component.TitlePresenter },
        { key: 'modifiedOn', presenter: tracker.component.ModificationDatePresenter },
        { key: '', presenter: tracker.component.AssigneePresenter, props: { currentSpace } }
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

  .categoryHeader {
    height: 2.5rem;
    background-color: var(--theme-table-bg-hover);
    padding-left: 2rem;
  }

  .label {
    font-weight: 500;
    color: var(--theme-caption-color);
    .eLabelCounter {
      opacity: 0.8;
      font-weight: initial;
    }
  }
</style>
