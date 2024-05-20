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
  import task from '@hcengineering/task'
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
  import { statusStore } from '@hcengineering/view-resources'
  import { issueLinkFragmentProvider } from '../../../issues'
  import tracker from '../../../plugin'
  import { listIssueStatusOrder } from '../../../utils'
  import IssueStatusIcon from '../IssueStatusIcon.svelte'

  export let issue: WithLookup<Issue>
  $: parentIssueId = issue.attachedTo !== tracker.ids.NoParent ? issue.attachedTo : undefined
  $: dependencyIssueId = issue.dependency.length ? issue.dependency[0]?.dependencyId : undefined
  let parentIssue: Issue | undefined = undefined
  let dependencyIssue: Issue | undefined = undefined
  const parentQuery = createQuery()
  const dependencyQuery = createQuery()

  const subIssuesQuery = createQuery()

  let subIssues: WithLookup<Issue>[] | undefined
  let subIssuesElement: Element

  async function openIssue (target: Issue) {
    if (target._id !== issue._id) {
      const loc = await issueLinkFragmentProvider(target)
      navigate(loc)
    }
  }

  function openSubIssue(target: Ref<Issue>) {
    const subIssue = subIssues?.find((p) => p._id === target)
    if (subIssue !== undefined) {
      openIssue(subIssue)
    }
  }

  function openParentIssue() {
    if (parentIssue) {
      closeTooltip()
      openIssue(parentIssue)
    }
  }

  function openDependencyIssue() {
    if (dependencyIssue) {
      closeTooltip()
      openIssue(dependencyIssue)
    }
  }

  $: areSubIssuesLoading = !subIssues

  $: if (parentIssueId) {
    subIssuesQuery.query(
      tracker.class.Issue,
      { attachedTo: parentIssueId },
      (res) => {
        subIssues = res
      },
      {
        sort: { modifiedOn: SortingOrder.Descending },
        lookup: {
          status: [tracker.class.IssueStatus, { category: core.class.StatusCategory }]
        }
      }
    )
    parentQuery.query(
      tracker.class.Issue,
      { _id: parentIssueId },
      (res) => {
        parentIssue = res[0]
      },
      {
        limit: 1
      }
    )
  } else {
    subIssuesQuery.unsubscribe()
    parentQuery.unsubscribe()
    parentIssue = undefined
    subIssues = []
  }

  $: if (dependencyIssueId) {
    subIssuesQuery.query(
      tracker.class.Issue,
      { attachedToDependency: dependencyIssueId },
      (res) => {
        subIssues = res
      },
      {
        sort: { modifiedOn: SortingOrder.Descending },
        lookup: {
          status: [tracker.class.IssueStatus, { category: core.class.StatusCategory }]
        }
      }
    )
    dependencyQuery.query(
      tracker.class.Issue,
      { _id: dependencyIssueId },
      (res) => {
        dependencyIssue = res[0]
      },
      {
        limit: 1
      }
    )
  } else {
    subIssuesQuery.unsubscribe()
    dependencyQuery.unsubscribe()
    dependencyIssue = undefined
    subIssues = []
  }

  $: parentStatus = parentIssue ? $statusStore.byId.get(parentIssue.status) : undefined
  $: dependencyStatus = dependencyIssue ? $statusStore.byId.get(dependencyIssue.status) : undefined

  let categories: IdMap<StatusCategory> = new Map()

  getClient()
    .findAll(core.class.StatusCategory, {})
    .then((res) => {
      categories = toIdMap(res)
    })

  let sortedSubIssues: WithLookup<Issue>[] = []

  $: {
    if (subIssues !== undefined) {
      subIssues.sort((a, b) => {
        const aStatus = $statusStore.byId.get(a.status)
        const bStatus = $statusStore.byId.get(b.status)
        const res =
          listIssueStatusOrder.indexOf(aStatus?.category ?? task.statusCategory.UnStarted) -
          listIssueStatusOrder.indexOf(bStatus?.category ?? task.statusCategory.UnStarted)
        return res
      })
      sortedSubIssues = subIssues ?? []
    }
  }

  $: subIssueValue = sortedSubIssues.map((iss) => {
    const status = iss.$lookup?.status as WithLookup<IssueStatus> | undefined
    const icon = status?.$lookup?.category?.icon
    const color = status?.color ?? status?.$lookup?.category?.color

    const c = $statusStore.byId.get(iss.status)?.category
    const category = c !== undefined ? categories.get(c) : undefined

    return {
      id: iss._id,
      icon,
      isSelected: iss._id === issue._id,
      text: `${iss.identifier} ${iss.title}`,
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
      <!-- svelte-ignore a11y-no-static-element-interactions -->
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
        <span class="overflow-label flex-no-shrink mr-2">{parentIssue.identifier}</span>
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

{#if dependencyIssue}
  <div class="flex root">
    <div class="item clear-mins">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="flex-center parent-issue cursor-pointer"
        use:tooltip={{ label: tracker.string.OpenDependency, direction: 'bottom' }}
        on:click={openDependencyIssue}
      >
        {#if dependencyStatus}
          <div class="pr-2">
            <IssueStatusIcon space={dependencyIssue.space} value={dependencyStatus} size="small" />
          </div>
        {/if}
        <span class="overflow-label flex-no-shrink mr-2">{dependencyIssue.identifier}</span>
        <span class="overflow-label issue-title">{dependencyIssue.title}</span>
      </div>
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
