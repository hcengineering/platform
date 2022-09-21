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
  import { Doc, Ref, WithLookup } from '@hcengineering/core'
  import { Issue, IssueStatus, Team } from '@hcengineering/tracker'
  import { ButtonKind, ButtonSize, getPlatformColor } from '@hcengineering/ui'
  import { Button, closeTooltip, ProgressCircle, SelectPopup, showPanel, showPopup } from '@hcengineering/ui'
  import { updateFocus } from '@hcengineering/view-resources'
  import tracker from '../../../plugin'
  import { getIssueId } from '../../../issues'

  export let value: WithLookup<Issue>
  export let currentTeam: Team | undefined
  export let statuses: WithLookup<IssueStatus>[] | undefined

  export let kind: ButtonKind = 'link-bordered'
  export let size: ButtonSize = 'inline'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = 'min-contet'

  let btn: HTMLElement

  let subIssues: Issue[] | undefined
  let doneStatus: Ref<Doc> | undefined
  let countComplate: number = 0

  $: if (value.$lookup?.subIssues !== undefined) {
    subIssues = value.$lookup.subIssues as Issue[]
    subIssues.sort((a, b) => (a.rank ?? '').localeCompare(b.rank ?? ''))
  }
  $: if (statuses && subIssues) {
    doneStatus = statuses.find((s) => s.category === tracker.issueStatusCategory.Completed)?._id ?? undefined
    if (doneStatus) countComplate = subIssues.filter((si) => si.status === doneStatus).length
  }
  $: hasSubIssues = (subIssues?.length ?? 0) > 0

  function getIssueStatusIcon (issue: Issue) {
    const status = statuses?.find((s) => issue.status === s._id)
    const category = status?.$lookup?.category
    const color = status?.color ?? category?.color

    return {
      ...(category?.icon !== undefined ? { icon: category.icon } : {}),
      ...(color !== undefined ? { iconColor: getPlatformColor(color) } : {})
    }
  }

  function openIssue (target: Ref<Issue>) {
    if (target !== value._id) {
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
            const text = currentTeam ? `${getIssueId(currentTeam, iss)} ${iss.title}` : iss.title

            return { id: iss._id, text, isSelected: iss._id === value._id, ...getIssueStatusIcon(iss) }
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
        },
        (selectedIssue) => {
          const focus = subIssues?.find((it) => it._id === selectedIssue.id)
          if (focus !== undefined) {
            updateFocus({ focus })
          }
        }
      )
    }
  }
</script>

{#if hasSubIssues}
  <div class="flex-center clear-mins" bind:this={btn}>
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
              <ProgressCircle bind:value={countComplate} bind:max={subIssues.length} size={'inline'} primary />
            </div>
            {countComplate}/{subIssues.length}
          </div>
        {/if}
      </svelte:fragment>
    </Button>
  </div>
{/if}
