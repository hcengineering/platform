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
  import { Issue, Project } from '@hcengineering/tracker'
  import {
    Button,
    ButtonKind,
    ButtonSize,
    ProgressCircle,
    SelectPopup,
    closeTooltip,
    showPanel,
    showPopup
  } from '@hcengineering/ui'
  import { statusStore } from '@hcengineering/view-resources'
  import { getIssueId } from '../../../issues'
  import tracker from '../../../plugin'
  import { subIssueListProvider } from '../../../utils'
  import IssueStatusIcon from '../IssueStatusIcon.svelte'

  export let value: WithLookup<Issue>
  export let currentProject: Project | undefined = undefined

  export let kind: ButtonKind = 'link-bordered'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = 'min-contet'
  export let compactMode: boolean = false

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
    const doneStatuses = $statusStore
      .getDocs()
      .filter(
        (s) =>
          s.category === tracker.issueStatusCategory.Completed || s.category === tracker.issueStatusCategory.Canceled
      )
      .map((p) => p._id)
    countComplete = subIssues.filter((si) => doneStatuses.includes(si.status)).length
  }
  $: hasSubIssues = (subIssues?.length ?? 0) > 0

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
              icon: IssueStatusIcon,
              iconProps: {
                value: $statusStore.get(iss.status),
                size: 'small',
                fill: undefined
              }
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
            {#if !compactMode}
              <div class="mr-1-5">
                <ProgressCircle bind:value={countComplete} bind:max={subIssues.length} size={'small'} accented />
              </div>
            {/if}
            {countComplete}/{subIssues.length}
          </div>
        {/if}
      </svelte:fragment>
    </Button>
  </div>
{/if}
