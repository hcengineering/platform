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
  import { IntlString } from '@anticrm/platform'
  import { Issue, IssueStatus, Team } from '@anticrm/tracker'
  import { Icon, IconAdd, Scroller, Tooltip, Button, showPopup, Label } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import CreateIssue from '../CreateIssue.svelte'
  import IssuesList from './IssuesList.svelte'

  export let query: DocumentQuery<Issue>
  export let categoryId: Ref<IssueStatus>
  export let categories: WithLookup<IssueStatus>[]
  export let currentSpace: Ref<Team> | undefined = undefined
  export let currentTeam: Team

  const dispatch = createEventDispatcher()

  const options: FindOptions<Issue> = {
    lookup: {
      assignee: contact.class.Employee,
      status: tracker.class.IssueStatus
    }
  }

  $: category = categories.find((c) => c._id === categoryId)
  $: categoryIcon = category?.$lookup?.category?.icon
  $: categoryLabel = (category?.name || '') as IntlString // TODO: replace with <span>

  let issuesAmount = 0

  const handleNewIssueAdded = (event: Event) => {
    if (!currentSpace) {
      return
    }

    showPopup(CreateIssue, { space: currentSpace, issueStatus: categoryId }, event.target)
  }
</script>

<div class="category" class:visible={issuesAmount > 0}>
  <div class="header categoryHeader flex-between label">
    <div class="flex-row-center gap-2">
      {#if categoryIcon}
        <Icon icon={categoryIcon} size={'small'} />
      {/if}
      <span class="lines-limit-2"><Label label={categoryLabel} /></span>
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
      leftItemsConfig={[
        { key: '', presenter: tracker.component.PriorityPresenter, props: { currentSpace } },
        { key: '', presenter: tracker.component.IssuePresenter, props: { currentTeam } },
        { key: '', presenter: tracker.component.StatusPresenter, props: { currentSpace, categories } },
        { key: '', presenter: tracker.component.TitlePresenter }
      ]}
      rightItemsConfig={[
        { key: '', presenter: tracker.component.DueDatePresenter, props: { currentSpace } },
        { key: 'modifiedOn', presenter: tracker.component.ModificationDatePresenter },
        { key: '', presenter: tracker.component.AssigneePresenter, props: { currentSpace } }
      ]}
      {options}
      query={{ ...query, status: categoryId }}
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
