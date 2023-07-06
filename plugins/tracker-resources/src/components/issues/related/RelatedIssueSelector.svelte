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
  import { Doc, Ref, SortingOrder, WithLookup } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Issue, Project } from '@hcengineering/tracker'
  import {
    Button,
    ButtonKind,
    ButtonSize,
    closeTooltip,
    ProgressCircle,
    SelectPopup,
    showPanel,
    showPopup
  } from '@hcengineering/ui'
  import { statusStore } from '@hcengineering/view-resources'
  import tracker from '../../../plugin'
  import { subIssueListProvider } from '../../../utils'
  import RelatedIssuePresenter from './RelatedIssuePresenter.svelte'

  export let object: WithLookup<Doc & { related: number }> | undefined
  export let value: WithLookup<Doc & { related: number }> | undefined
  export let currentProject: Project | undefined

  export let kind: ButtonKind = 'link-bordered'
  export let size: ButtonSize = 'inline'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = 'min-contet'
  export let compactMode: boolean = false

  let btn: HTMLElement

  let subIssues: Issue[] = []
  let countComplete: number = 0

  const query = createQuery()

  $: _object = object ?? value

  $: _object && update(_object)

  function update (value: WithLookup<Doc & { related: number }>): void {
    if (value.$lookup?.related !== undefined) {
      query.unsubscribe()
      subIssues = value.$lookup.related as Issue[]
      subIssues.sort((a, b) => (a.rank ?? '').localeCompare(b.rank ?? ''))
    } else {
      query.query(
        tracker.class.Issue,
        { 'relations._id': value._id, 'relations._class': value._class },
        (res) => (subIssues = res),
        {
          sort: { rank: SortingOrder.Ascending }
        }
      )
    }
  }

  $: if (subIssues) {
    const doneStatuses = $statusStore
      .getDocs()
      .filter((s) => s.category === tracker.issueStatusCategory.Completed)
      .map((p) => p._id)
    countComplete = subIssues.filter((si) => doneStatuses.includes(si.status)).length
  }
  $: hasSubIssues = (subIssues?.length ?? 0) > 0

  function openIssue (target: Ref<Issue>) {
    subIssueListProvider(subIssues, target)
    showPanel(tracker.component.EditIssue, target, tracker.class.Issue, 'content')
  }

  function showSubIssues () {
    if (subIssues) {
      closeTooltip()
      showPopup(
        SelectPopup,
        {
          value: subIssues.map((iss) => {
            return {
              id: iss._id,
              isSelected: false,
              component: RelatedIssuePresenter,
              props: { project: currentProject, issue: iss }
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
