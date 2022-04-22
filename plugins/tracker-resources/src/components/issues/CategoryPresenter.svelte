<script lang="ts">
  import contact from '@anticrm/contact'
  import { DocumentQuery, FindOptions, Ref } from '@anticrm/core'
  import { Issue, Team } from '@anticrm/tracker'
  import { Component, Button, eventToHTMLElement, IconAdd, Scroller, showPopup, Tooltip } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import { IssuesGroupByKeys, IssuesOrderByKeys, issuesGroupPresenterMap, issuesSortOrderMap } from '../../utils'
  import CreateIssue from '../CreateIssue.svelte'
  import IssuesList from './IssuesList.svelte'

  export let query: DocumentQuery<Issue>
  export let groupBy: { key: IssuesGroupByKeys | undefined; group: Issue[IssuesGroupByKeys] | undefined }
  export let orderBy: IssuesOrderByKeys
  export let currentSpace: Ref<Team> | undefined = undefined
  export let currentTeam: Team

  const dispatch = createEventDispatcher()
  const options: FindOptions<Issue> = {
    lookup: {
      assignee: contact.class.Employee
    }
  }

  let issuesAmount = 0

  $: grouping = groupBy.key !== undefined && groupBy.group !== undefined ? { [groupBy.key]: groupBy.group } : {}
  $: headerComponent = groupBy.key !== undefined ? issuesGroupPresenterMap[groupBy.key] : null

  const handleNewIssueAdded = (event: MouseEvent) => {
    if (!currentSpace) {
      return
    }

    showPopup(CreateIssue, { space: currentSpace, ...grouping }, eventToHTMLElement(event))
  }
</script>

<div class="category">
  {#if headerComponent}
    <div class="header categoryHeader flex-between label">
      <div class="flex-row-center gap-2">
        <Component
          is={headerComponent}
          props={{
            isEditable: false,
            shouldShowLabel: true,
            value: grouping,
            defaultName: groupBy.key === 'assignee' ? tracker.string.NoAssignee : undefined
          }}
        />
        <span class="eLabelCounter ml-2">{issuesAmount}</span>
      </div>
      <div class="flex mr-1">
        <Tooltip label={tracker.string.AddIssueTooltip} direction={'left'}>
          <Button icon={IconAdd} kind={'transparent'} on:click={handleNewIssueAdded} />
        </Tooltip>
      </div>
    </div>
  {/if}
  <Scroller>
    <IssuesList
      _class={tracker.class.Issue}
      itemsConfig={[
        { key: '', presenter: tracker.component.PriorityPresenter, props: { currentSpace } },
        { key: '', presenter: tracker.component.IssuePresenter, props: { currentTeam } },
        { key: '', presenter: tracker.component.StatusPresenter, props: { currentSpace } },
        { key: '', presenter: tracker.component.TitlePresenter, props: { shouldUseMargin: true } },
        { key: '', presenter: tracker.component.DueDatePresenter, props: { currentSpace } },
        { key: 'modifiedOn', presenter: tracker.component.ModificationDatePresenter },
        { key: '', presenter: tracker.component.AssigneePresenter, props: { currentSpace } }
      ]}
      options={{ ...options, sort: { [orderBy]: issuesSortOrderMap[orderBy] } }}
      query={{ ...query, ...grouping }}
      on:content={(evt) => {
        issuesAmount = evt.detail.length
        dispatch('content', issuesAmount)
      }}
    />
  </Scroller>
</div>

<style lang="scss">
  .categoryHeader {
    height: 2.5rem;
    background-color: var(--theme-table-bg-hover);
    padding-left: 2.3rem;
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
