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
  import attachment, { Attachment } from '@hcengineering/attachment'
  import { deleteFile } from '@hcengineering/attachment-resources/src/utils'
  import core, { AttachedData, Ref, SortingOrder, WithLookup } from '@hcengineering/core'
  import { draftStore, getClient, updateDraftStore } from '@hcengineering/presentation'
  import tags from '@hcengineering/tags'
  import {
    calcRank,
    DraftIssueChild,
    Issue,
    IssueParentInfo,
    IssueStatus,
    Project,
    Sprint,
    Team
  } from '@hcengineering/tracker'
  import { Button, closeTooltip, ExpandCollapse, IconAdd, Scroller } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import tracker from '../plugin'
  import Collapsed from './icons/Collapsed.svelte'
  import Expanded from './icons/Expanded.svelte'
  import DraftIssueChildEditor from './templates/DraftIssueChildEditor.svelte'
  import DraftIssueChildList from './templates/DraftIssueChildList.svelte'

  export let parent: Ref<Issue>
  export let teamId: Ref<Team>
  export let team: Team | undefined
  export let sprint: Ref<Sprint> | null = null
  export let project: Ref<Project> | null = null
  export let subIssues: DraftIssueChild[] = []
  export let statuses: WithLookup<IssueStatus>[]

  let isCollapsed = false
  let isCreating = false

  async function handleIssueSwap (ev: CustomEvent<{ fromIndex: number; toIndex: number }>) {
    if (subIssues) {
      const { fromIndex, toIndex } = ev.detail
      const [fromIssue] = subIssues.splice(fromIndex, 1)
      const leftPart = subIssues.slice(0, toIndex)
      const rightPart = subIssues.slice(toIndex)
      subIssues = [...leftPart, fromIssue, ...rightPart]
    }
  }

  const client = getClient()

  export async function save (parents: IssueParentInfo[]) {
    if (team === undefined) return
    saved = true

    for (const subIssue of subIssues) {
      const lastOne = await client.findOne<Issue>(tracker.class.Issue, {}, { sort: { rank: SortingOrder.Descending } })
      const incResult = await client.updateDoc(
        tracker.class.Team,
        core.space.Space,
        team._id,
        {
          $inc: { sequence: 1 }
        },
        true
      )
      const childId: Ref<Issue> = subIssue.id as Ref<Issue>
      const cvalue: AttachedData<Issue> = {
        title: subIssue.title.trim(),
        description: subIssue.description,
        assignee: subIssue.assignee,
        project: subIssue.project,
        sprint: subIssue.sprint,
        number: (incResult as any).object.sequence,
        status: subIssue.status,
        priority: subIssue.priority,
        rank: calcRank(lastOne, undefined),
        comments: 0,
        subIssues: 0,
        dueDate: null,
        parents,
        reportedTime: 0,
        estimation: subIssue.estimation,
        reports: 0,
        relations: [],
        childInfo: []
      }

      await client.addCollection(
        tracker.class.Issue,
        team._id,
        parent,
        tracker.class.Issue,
        'subIssues',
        cvalue,
        childId
      )

      if ((subIssue.labels?.length ?? 0) > 0) {
        const tagElements = await client.findAll(tags.class.TagElement, { _id: { $in: subIssue.labels } })
        for (const label of tagElements) {
          await client.addCollection(tags.class.TagReference, team._id, childId, tracker.class.Issue, 'labels', {
            title: label.title,
            color: label.color,
            tag: label._id
          })
        }
      }
      saveAttachments(childId)
    }
  }

  async function saveAttachments (issue: Ref<Issue>) {
    const draftAttachments: Record<Ref<Attachment>, Attachment> | undefined = $draftStore[issue]
    if (draftAttachments) {
      for (const key in draftAttachments) {
        await saveAttachment(draftAttachments[key as Ref<Attachment>], issue)
      }
    }
    removeDraft(issue)
  }

  async function saveAttachment (doc: Attachment, issue: Ref<Issue>): Promise<void> {
    await client.addCollection(
      attachment.class.Attachment,
      teamId,
      issue,
      tracker.class.Issue,
      'attachments',
      doc,
      doc._id
    )
  }

  export function load (value: DraftIssueChild[]) {
    subIssues = value
  }

  let saved = false

  onDestroy(() => {
    if (!saved) {
      subIssues.forEach((st) => {
        removeDraft(st.id, true)
      })
    }
  })

  export async function removeDraft (_id: string, removeFiles: boolean = false): Promise<void> {
    const draftAttachments: Record<Ref<Attachment>, Attachment> | undefined = $draftStore[_id]
    updateDraftStore(_id, undefined)
    if (removeFiles && draftAttachments) {
      for (const key in draftAttachments) {
        const attachment = draftAttachments[key as Ref<Attachment>]
        await deleteFile(attachment.file)
      }
    }
  }

  $: hasSubIssues = subIssues.length > 0
</script>

<div class="flex-between clear-mins">
  {#if hasSubIssues}
    <Button
      width="min-content"
      icon={isCollapsed ? Collapsed : Expanded}
      size="small"
      kind="transparent"
      label={tracker.string.SubIssuesList}
      labelParams={{ subIssues: subIssues.length }}
      on:click={() => {
        isCollapsed = !isCollapsed
        isCreating = false
      }}
    />
  {/if}

  <Button
    id="add-sub-issue"
    width="min-content"
    icon={hasSubIssues ? IconAdd : undefined}
    label={hasSubIssues ? undefined : tracker.string.AddSubIssues}
    labelParams={{ subIssues: 0 }}
    kind={'transparent'}
    size={'small'}
    showTooltip={{ label: tracker.string.AddSubIssues, props: { subIssues: 1 } }}
    on:click={() => {
      closeTooltip()
      isCreating = true
      isCollapsed = false
    }}
  />
</div>
{#if hasSubIssues}
  <ExpandCollapse isExpanded={!isCollapsed} on:changeContent>
    <div class="flex-col flex-no-shrink max-h-30 list clear-mins" class:collapsed={isCollapsed}>
      <Scroller>
        <DraftIssueChildList
          {statuses}
          {project}
          {sprint}
          bind:issues={subIssues}
          team={teamId}
          on:move={handleIssueSwap}
          on:update-issue
        />
      </Scroller>
    </div>
  </ExpandCollapse>
{/if}
{#if isCreating && team}
  <ExpandCollapse isExpanded={!isCollapsed} on:changeContent>
    <DraftIssueChildEditor
      {team}
      {statuses}
      {project}
      {sprint}
      on:close={() => {
        isCreating = false
      }}
      on:create={(evt) => {
        if (subIssues === undefined) {
          subIssues = []
        }
        subIssues = [...subIssues, evt.detail]
      }}
      on:changeContent
    />
  </ExpandCollapse>
{/if}

<style lang="scss">
  .list {
    border-top: 1px solid var(--divider-color);

    &.collapsed {
      padding-top: 1px;
      border-top: none;
    }
  }
</style>
