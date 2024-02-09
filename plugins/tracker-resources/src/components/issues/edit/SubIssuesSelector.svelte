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
  import core, { IdMap, Ref, SortingOrder, StatusCategory, WithLookup, toIdMap } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import task, { getStates } from '@hcengineering/task'
  import { typeStore } from '@hcengineering/task-resources'
  import { Issue, Project } from '@hcengineering/tracker'
  import { Button, ButtonKind, ButtonSize, ProgressCircle, SelectPopup, showPanel } from '@hcengineering/ui'
  import { statusStore } from '@hcengineering/view-resources'
  import tracker from '../../../plugin'
  import { listIssueStatusOrder } from '../../../utils'
  import IssueStatusIcon from '../IssueStatusIcon.svelte'

  export let value: WithLookup<Issue>
  export let currentProject: Project | undefined = undefined

  export let kind: ButtonKind = 'link-bordered'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = 'min-content'
  export let compactMode: boolean = false

  let btn: HTMLElement

  $: project = currentProject

  let subIssues: Issue[] = []
  let _subIssues: Issue[] = []
  let countComplete: number = 0

  const projectQuery = createQuery()
  $: if (currentProject === undefined) {
    projectQuery.query(
      tracker.class.Project,
      {
        _id: value.space
      },
      (res) => {
        ;[project] = res
      }
    )
  } else {
    projectQuery.unsubscribe()
  }
  const query = createQuery()

  $: update(value)

  let categories: IdMap<StatusCategory> = new Map()

  void getClient()
    .findAll(core.class.StatusCategory, {})
    .then((res) => {
      categories = toIdMap(res)
    })

  function update (value: WithLookup<Issue>): void {
    if (value.$lookup?.subIssues !== undefined) {
      query.unsubscribe()
      subIssues = value.$lookup.subIssues as Issue[]
    } else if (value.subIssues > 0) {
      query.query(
        tracker.class.Issue,
        { attachedTo: value._id },
        (res) => {
          subIssues = res
        },
        {
          sort: { rank: SortingOrder.Ascending }
        }
      )
    } else {
      query.unsubscribe()
      subIssues = []
    }
  }

  $: if (subIssues != null) {
    const doneStatuses = getStates(project, $typeStore, $statusStore.byId)
      .filter((s) => s?.category === task.statusCategory.Won || s?.category === task.statusCategory.Lost)
      .map((p) => p._id)
    countComplete = subIssues.filter((si) => doneStatuses.includes(si.status)).length
  }
  $: hasSubIssues = (subIssues?.length ?? 0) > 0

  function openIssue (target: Ref<Issue>): void {
    if (target !== value._id) {
      showPanel(tracker.component.EditIssue, target, value._class, 'content')
    }
  }

  $: {
    subIssues.sort((a, b) => {
      const aStatus = $statusStore.byId.get(a.status)
      const bStatus = $statusStore.byId.get(b.status)
      const res =
        listIssueStatusOrder.indexOf(aStatus?.category ?? task.statusCategory.UnStarted) -
        listIssueStatusOrder.indexOf(bStatus?.category ?? task.statusCategory.UnStarted)
      return res
    })
    _subIssues = subIssues
  }

  $: subIssuesValue = _subIssues.map((iss) => {
    const text = `${iss.identifier} ${iss.title}`
    const c = $statusStore.byId.get(iss.status)?.category
    const category = c !== undefined ? categories.get(c) : undefined
    return {
      id: iss._id,
      text,
      isSelected: iss._id === value._id,
      icon: IssueStatusIcon,
      iconProps: {
        value: $statusStore.byId.get(iss.status),
        size: 'small',
        fill: undefined
      },
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

{#if hasSubIssues}
  <div class="flex-center flex-no-shrink" bind:this={btn}>
    <Button
      {width}
      {kind}
      {size}
      {justify}
      showTooltip={{
        component: SelectPopup,
        props: {
          value: subIssuesValue,
          onSelect: openIssue,
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
