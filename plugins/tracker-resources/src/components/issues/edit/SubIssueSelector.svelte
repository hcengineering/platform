<!-- 
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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
  import core, { IdMap, Ref, SortingOrder, StatusCategory, WithLookup, toIdMap } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Issue, IssueStatus } from '@hcengineering/tracker'
  import {
    Icon,
    IconDetails,
    IconForward,
    SelectPopup,
    Spinner,
    closeTooltip,
    getPlatformColorDef,
    navigate,
    themeStore,
    tooltip
  } from '@hcengineering/ui'
  import { ListSelectionProvider, statusStore } from '@hcengineering/view-resources'
  import { getIssueId, issueLinkFragmentProvider } from '../../../issues'
  import tracker from '../../../plugin'
  import IssueStatusIcon from '../IssueStatusIcon.svelte'
  import { listIssueStatusOrder } from '../../../utils'

  export let issue: WithLookup<Issue>

  const subIssuesQeury = createQuery()

  let subIssues: WithLookup<Issue>[] | undefined
  let subIssuesElement: Element

  async function openIssue (target: Issue) {
    if (target._id !== issue._id) {
      const loc = await issueLinkFragmentProvider(target)
      navigate(loc)
    }
  }

  function openSubIssue (target: Ref<Issue>) {
    const subIssue = subIssues?.find((p) => p._id === target)
    if (subIssue !== undefined) {
      openIssue(subIssue)
    }
  }

  function openParentIssue () {
    if (parentIssue) {
      closeTooltip()
      ListSelectionProvider.Pop()
      openIssue(parentIssue)
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
          status: [tracker.class.IssueStatus, { category: core.class.StatusCategory }]
        }
      }
    )
  } else {
    subIssuesQeury.unsubscribe()
  }

  $: parentStatus = parentIssue ? $statusStore.get(parentIssue.status) : undefined

  let categories: IdMap<StatusCategory> = new Map()

  getClient()
    .findAll(core.class.StatusCategory, {})
    .then((res) => {
      categories = toIdMap(res)
    })

  let sortedSubIssues: WithLookup<Issue>[] = []

  $: {
    if (subIssues !== undefined) {
      subIssues.sort(
        (a, b) =>
          listIssueStatusOrder.indexOf($statusStore.get(a.status)?.category ?? tracker.issueStatusCategory.Backlog) -
          listIssueStatusOrder.indexOf($statusStore.get(b.status)?.category ?? tracker.issueStatusCategory.Backlog)
      )
      sortedSubIssues = subIssues ?? []
    }
  }

  $: subIssueValue = sortedSubIssues.map((iss) => {
    const project = iss.$lookup?.space
    const status = iss.$lookup?.status as WithLookup<IssueStatus>
    const icon = status.$lookup?.category?.icon
    const color = status.color ?? status.$lookup?.category?.color

    const c = $statusStore.get(iss.status)?.category
    const category = c !== undefined ? categories.get(c) : undefined

    return {
      id: iss._id,
      icon,
      isSelected: iss._id === issue._id,
      ...(project !== undefined ? { text: `${getIssueId(project, iss)} ${iss.title}` } : undefined),
      ...(color !== undefined ? { iconColor: getPlatformColorDef(color, $themeStore.dark).icon } : undefined),
      category:
        category !== undefined
          ? {
              label: category.label,
              icon: category.icon
            }
          : undefined
    }
  })
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
        {#if parentStatus}
          <div class="pr-2">
            <IssueStatusIcon space={parentIssue.space} value={parentStatus} size="small" />
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
          use:tooltip={{
            component: SelectPopup,
            props: {
              value: subIssueValue,
              onSelect: openSubIssue,
              showShadow: false,
              width: 'large'
            }
          }}
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
