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
  import { Issue, IssueStatus, Project } from '@hcengineering/tracker'
  import {
    Button,
    ButtonKind,
    ButtonSize,
    closeTooltip,
    getPlatformColor,
    ProgressCircle,
    SelectPopup,
    showPanel,
    showPopup
  } from '@hcengineering/ui'
  import { getIssueId } from '../../../issues'
  import tracker from '../../../plugin'
  import { subIssueListProvider } from '../../../utils'
  import { statusStore } from '@hcengineering/presentation'

  export let value: WithLookup<Issue>
  export let currentProject: Project | undefined = undefined

  export let kind: ButtonKind = 'link-bordered'
  export let size: ButtonSize = 'inline'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = 'min-contet'

  let btn: HTMLElement

  $: project = currentProject

  let subIssues: Issue[] = []
  let countComplete: number = 0

  const projectQuery = createQuery()
  $: if (currentProject === undefined) {
    projectQuery.query(
      tracker.class.Project,
      {
        _id: value.space
      },
      (res) => ([project] = res)
    )
  } else {
    projectQuery.unsubscribe()
  }
  const query = createQuery()

  $: update(value)

  function update (value: WithLookup<Issue>): void {
    if (value.$lookup?.subIssues !== undefined) {
      query.unsubscribe()
      subIssues = value.$lookup.subIssues as Issue[]
      subIssues.sort((a, b) => (a.rank ?? '').localeCompare(b.rank ?? ''))
    } else if (value.subIssues > 0) {
      query.query(tracker.class.Issue, { attachedTo: value._id }, (res) => (subIssues = res), {
        sort: { rank: SortingOrder.Ascending }
      })
    } else {
      query.unsubscribe()
    }
  }

  $: if (subIssues) {
    const doneStatuses = $statusStore.statuses
      .filter((s) => s.category === tracker.issueStatusCategory.Completed)
      .map((p) => p._id)
    countComplete = subIssues.filter((si) => doneStatuses.includes(si.status)).length
  }
  $: hasSubIssues = (subIssues?.length ?? 0) > 0

  function getIssueStatusIcon (issue: Issue, statuses: Map<Ref<WithLookup<IssueStatus>>, WithLookup<IssueStatus>>) {
    const status = statuses.get(issue.status)
    const category = status?.$lookup?.category
    const color = status?.color ?? category?.color

    return {
      ...(category?.icon !== undefined ? { icon: category.icon } : {}),
      ...(color !== undefined ? { iconColor: getPlatformColor(color) } : {})
    }
  }

  function openIssue (target: Ref<Issue>) {
    if (target !== value._id) {
      subIssueListProvider(subIssues, target)
      showPanel(tracker.component.EditIssue, target, value._class, 'content')
    }
  }

  function showSubIssues () {
    if (subIssues) {
      closeTooltip()
      showPopup(
        SelectPopup,
        {
          value: subIssues.map((iss) => {
            const text = project ? `${getIssueId(project, iss)} ${iss.title}` : iss.title

            return {
              id: iss._id,
              text,
              isSelected: iss._id === value._id,
              ...getIssueStatusIcon(iss, $statusStore.byId)
            }
          }),
          width: 'large'
        },
        {
          getBoundingClientRect: () => {
            const rect = btn.getBoundingClientRect()
            const offsetX = 0
            const offsetY = 0

            return DOMRect.fromRect({ width: 1, height: 1, x: rect.left + offsetX, y: rect.bottom + offsetY })
          }
        },
        (selectedIssue) => {
          selectedIssue !== undefined && openIssue(selectedIssue)
        }
      )
    }
  }
</script>

{#if hasSubIssues}
  <div class="flex-center flex-no-shrink" bind:this={btn}>
    <Button
      {width}
      {kind}
      {size}
      {justify}
      on:click={(ev) => {
        ev.stopPropagation()
        if (subIssues) showSubIssues()
      }}
    >
      <svelte:fragment slot="content">
        {#if subIssues}
          <div class="flex-row-center content-color text-sm pointer-events-none">
            <div class="mr-1">
              <ProgressCircle bind:value={countComplete} bind:max={subIssues.length} size={'inline'} primary />
            </div>
            {countComplete}/{subIssues.length}
          </div>
        {/if}
      </svelte:fragment>
    </Button>
  </div>
{/if}
