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
  import { Doc, Ref, WithLookup, type Status } from '@hcengineering/core'
  import task from '@hcengineering/task'
  import { Project, type Issue } from '@hcengineering/tracker'
  import { Button, ButtonKind, ButtonSize, ProgressCircle } from '@hcengineering/ui'
  import { statusStore } from '@hcengineering/view-resources'
  import { listIssueStatusOrder, relatedIssues, type IssueRef } from '../../../utils'
  import RelatedIssuePopup from './RelatedIssuePopup.svelte'

  export let object: WithLookup<Doc> | undefined
  export let value: WithLookup<Doc> | undefined
  export let currentProject: Project | undefined

  export let kind: ButtonKind = 'link-bordered'
  export let size: ButtonSize = 'inline'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = 'min-contet'
  export let compactMode: boolean = false

  $: _object = object ?? value

  $: subIssues = sortStatuses(_object?._id !== undefined ? [...($relatedIssues.get(_object?._id) ?? [])] : [])
  let countComplete: number = 0

  function sortStatuses (statuses: IssueRef[]): { _id: Ref<Issue>, status: Ref<Status> }[] {
    statuses.sort((a, b) => {
      const aStatus = $statusStore.byId.get(a.status)
      const bStatus = $statusStore.byId.get(b.status)
      return (
        listIssueStatusOrder.indexOf(aStatus?.category ?? task.statusCategory.UnStarted) -
        listIssueStatusOrder.indexOf(bStatus?.category ?? task.statusCategory.UnStarted)
      )
    })
    return statuses
  }

  $: if (subIssues.length > 0) {
    const doneStatuses = $statusStore.array
      .filter((s) => s.category === task.statusCategory.Won || s.category === task.statusCategory.Lost)
      .map((p) => p._id)
    countComplete = subIssues.filter((si) => doneStatuses.includes(si.status)).length
  }
  $: hasSubIssues = subIssues.length > 0
</script>

{#if hasSubIssues}
  <div class="flex-center flex-no-shrink">
    <Button
      {width}
      {kind}
      {size}
      {justify}
      showTooltip={{
        component: RelatedIssuePopup,
        props: {
          refs: subIssues,
          currentProject,
          showShadow: false,
          width: 'large'
        }
      }}
    >
      <svelte:fragment slot="content">
        {#if subIssues}
          <div class="flex-row-center content-color text-sm pointer-events-none">
            {#if !compactMode}
              <div class="mr-1-5">
                <ProgressCircle bind:value={countComplete} bind:max={subIssues.length} size={'small'} primary />
              </div>
            {/if}
            {countComplete}/{subIssues.length}
          </div>
        {/if}
      </svelte:fragment>
    </Button>
  </div>
{/if}
