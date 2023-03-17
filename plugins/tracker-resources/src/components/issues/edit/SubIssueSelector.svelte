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
  import { Ref, SortingOrder, WithLookup } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Issue, IssueStatus } from '@hcengineering/tracker'
  import {
    Icon,
    tooltip,
    showPanel,
    IconForward,
    IconDetails,
    showPopup,
    SelectPopup,
    closeTooltip,
    Spinner,
    getPlatformColor
  } from '@hcengineering/ui'
  import tracker from '../../../plugin'
  import { getIssueId } from '../../../issues'
  import IssueStatusIcon from '../IssueStatusIcon.svelte'
  import { ListSelectionProvider } from '@hcengineering/view-resources'

  export let issue: WithLookup<Issue>

  const subIssuesQeury = createQuery()

  let subIssues: WithLookup<Issue>[] | undefined
  let subIssuesElement: Element

  function openIssue (target: Ref<Issue>) {
    if (target !== issue._id) {
      showPanel(tracker.component.EditIssue, target, issue._class, 'content')
    }
  }

  function openParentIssue () {
    if (parentIssue) {
      closeTooltip()
      ListSelectionProvider.Pop()
      openIssue(parentIssue._id)
    }
  }

  function showSubIssues () {
    if (subIssues) {
      closeTooltip()
      showPopup(
        SelectPopup,
        {
          value: subIssues.map((iss) => {
            const project = iss.$lookup?.space
            const status = iss.$lookup?.status as WithLookup<IssueStatus>
            const icon = status.$lookup?.category?.icon
            const color = status.color ?? status.$lookup?.category?.color

            return {
              id: iss._id,
              icon,
              isSelected: iss._id === issue._id,
              ...(project !== undefined ? { text: `${getIssueId(project, iss)} ${iss.title}` } : undefined),
              ...(color !== undefined ? { iconColor: getPlatformColor(color) } : undefined)
            }
          }),
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
  $: if (parentIssue && parentIssue.subIssues > 0) {
    subIssuesQeury.query(
      tracker.class.Issue,
      { space: issue.space, attachedTo: parentIssue._id },
      (res) => (subIssues = res),
      {
        sort: { modifiedOn: SortingOrder.Descending },
        lookup: {
          space: tracker.class.Project,
          status: [tracker.class.IssueStatus, { category: tracker.class.IssueStatusCategory }]
        }
      }
    )
  } else {
    subIssuesQeury.unsubscribe()
  }
</script>

{#if parentIssue}
  <div class="flex root">
    <div class="item clear-mins">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="flex-center parent-issue cursor-pointer"
        use:tooltip={{ label: tracker.string.OpenParent, direction: 'bottom' }}
        on:click={openParentIssue}
      >
        {#if issue?.$lookup?.status}
          <div class="pr-2">
            <IssueStatusIcon value={issue.$lookup.status} size="small" />
          </div>
        {/if}
        {#if issue.$lookup?.space}
          <span class="overflow-label flex-no-shrink mr-2">{getIssueId(issue.$lookup.space, parentIssue)}</span>
        {/if}
        <span class="overflow-label issue-title">{parentIssue.title}</span>
      </div>
    </div>

    <div class="item">
      {#if areSubIssuesLoading}
        <div class="flex-center spinner">
          <Spinner size="small" />
        </div>
      {:else}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          bind:this={subIssuesElement}
          class="flex-center sub-issues cursor-pointer"
          use:tooltip={{ label: tracker.string.OpenSubIssues, direction: 'bottom' }}
          on:click|preventDefault={showSubIssues}
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
      color: var(--accent-color);
      transition: color 0.15s;
    }

    &:hover .issue-title {
      color: var(--caption-color);
    }
    &:active .issue-title {
      color: var(--accent-color);
    }
  }

  .sub-issues {
    padding: $padding;
    color: var(--content-color);
    transition: color 0.15s;

    &:hover {
      color: var(--caption-color);
    }
    &:active {
      color: var(--accent-color);
    }
  }
</style>
