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
  import { DocumentQuery, FindOptions, Ref, WithLookup } from '@anticrm/core'
  import { Issue, IssueStatus, Team } from '@anticrm/tracker'
  import { Component, Button, eventToHTMLElement, IconAdd, Scroller, showPopup, Tooltip } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import { IssuesGroupByKeys, IssuesOrderByKeys, issuesGroupPresenterMap, issuesSortOrderMap } from '../../utils'
  import CreateIssue from '../CreateIssue.svelte'
  import IssuesList from './IssuesList.svelte'

  export let query: DocumentQuery<Issue>
  export let groupBy: { key: IssuesGroupByKeys | undefined; group: Issue[IssuesGroupByKeys] | undefined }
  export let orderBy: IssuesOrderByKeys
  export let statuses: WithLookup<IssueStatus>[]
  export let currentSpace: Ref<Team> | undefined = undefined
  export let currentTeam: Team

  const dispatch = createEventDispatcher()
  const options: FindOptions<Issue> = {
    lookup: {
      assignee: contact.class.Employee,
      status: tracker.class.IssueStatus
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
            defaultName: groupBy.key === 'assignee' ? tracker.string.NoAssignee : undefined,
            statuses: groupBy.key === 'status' ? statuses : undefined
          }}
        />
        <span class="eLabelCounter ml-2">{issuesAmount}</span>
      </div>
      <div class="flex">
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
        { key: '', presenter: tracker.component.StatusPresenter, props: { currentSpace, statuses } },
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
    padding-left: 2.25rem;
    padding-right: 1.35rem;
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
