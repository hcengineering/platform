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
  import { Ref, SortingOrder, WithLookup } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import { Team, Issue, IssueStatus } from '@anticrm/tracker'
  import {
    Icon,
    tooltip,
    showPanel,
    IconForward,
    IconDetails,
    showPopup,
    SelectPopup,
    closeTooltip,
    Spinner
  } from '@anticrm/ui'
  import tracker from '../../../plugin'
  import { getIssueId } from '../../../utils'

  export let issue: WithLookup<Issue>
  export let team: Team
  export let issueStatuses: WithLookup<IssueStatus>[]

  const subIssuesQeury = createQuery()

  let subIssues: Issue[] | undefined
  let subIssuesElement: Element

  function getIssueStatusIcon (issue: Issue) {
    return issueStatuses.find((s) => issue.status === s._id)?.$lookup?.category?.icon ?? null
  }

  function openIssue (target: Ref<Issue>) {
    if (target !== issue._id) {
      showPanel(tracker.component.EditIssue, target, issue._class, 'content')
    }
  }

  function openParentIssue () {
    if (parentIssue) {
      closeTooltip()
      openIssue(parentIssue._id)
    }
  }

  function showSubIssues () {
    if (subIssues) {
      closeTooltip()
      showPopup(
        SelectPopup,
        {
          value: subIssues.map((iss) => ({
            id: iss._id,
            icon: getIssueStatusIcon(iss),
            text: `${getIssueId(team, iss)} ${iss.title}`,
            isSelected: iss._id === issue._id
          })),
          width: 'large'
        },
        {
          getBoundingClientRect: () => {
            const rect = subIssuesElement.getBoundingClientRect()
            const offsetX = 5
            const offsetY = -1

            return DOMRect.fromRect({ width: 1, height: 1, x: rect.right + offsetX, y: rect.top + offsetY })
          }
        },
        (selectedIssue) => selectedIssue !== undefined && openIssue(selectedIssue)
      )
    }
  }

  $: areSubIssuesLoading = !subIssues
  $: parentIssue = issue.$lookup?.attachedTo ? (issue.$lookup?.attachedTo as Issue) : null
  $: if (parentIssue) {
    subIssuesQeury.query(
      tracker.class.Issue,
      { space: issue.space, attachedTo: parentIssue._id },
      (res) => (subIssues = res),
      { sort: { modifiedOn: SortingOrder.Descending } }
    )
  } else {
    subIssuesQeury.unsubscribe()
  }
</script>

{#if parentIssue}
  {@const icon = getIssueStatusIcon(issue)}
  <div class="flex root">
    <div class="item clear-mins">
      <div
        class="flex-center parent-issue cursor-pointer"
        use:tooltip={{ label: tracker.string.OpenParent, direction: 'bottom' }}
        on:click={openParentIssue}
      >
        {#if icon}
          <div class="pr-2">
            <Icon {icon} size="small" />
          </div>
        {/if}
        <span class="overflow-label flex-no-shrink mr-2">{getIssueId(team, parentIssue)}</span>
        <span class="overflow-label issue-title">{parentIssue.title}</span>
      </div>
    </div>

    <div class="item">
      {#if areSubIssuesLoading}
        <div class="flex-center spinner">
          <Spinner size="small" />
        </div>
      {:else}
        <div
          bind:this={subIssuesElement}
          class="flex-center sub-issues cursor-pointer"
          use:tooltip={{ label: tracker.string.OpenSubIssues, direction: 'bottom' }}
          on:click|preventDefault={areSubIssuesLoading ? undefined : showSubIssues}
        >
          <span class="overflow-label">{subIssues?.length}</span>
          <div class="ml-2">
            <!-- TODO: fix icon -->
            <Icon icon={IconDetails} size="small" />
          </div>
          <div class="ml-1-5">
            <Icon icon={IconForward} size="small" />
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style lang="scss">
  $padding: 0.375rem 0.75rem;
  $border: 1px solid var(--button-border-color);

  .root {
    max-width: fit-content;
    line-height: 150%;
    border: $border;
    border-radius: 0.25rem;
    box-shadow: var(--primary-shadow);

    .item {
      position: relative;

      &:not(:first-child)::before {
        position: absolute;
        content: '';
        border-left: $border;
        inset: 0.375rem auto;
      }
    }
  }

  .spinner {
    padding: $padding;
    height: 100%;
  }

  .parent-issue {
    padding: $padding;

    .issue-title {
      color: var(--theme-content-accent-color);
      transition: color 0.15s;
    }

    &:hover {
      .issue-title {
        color: var(--theme-caption-color);
      }
    }
    &:active {
      .issue-title {
        color: var(--theme-content-accent-color);
      }
    }
  }

  .sub-issues {
    padding: $padding;
    color: var(--theme-content-color);
    transition: color 0.15s;

    &:hover {
      color: var(--theme-caption-color);
    }
    &:active {
      color: var(--theme-content-accent-color);
    }
  }
</style>
