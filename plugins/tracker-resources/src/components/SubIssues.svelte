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
  import core, { AttachedData, Ref, SortingOrder } from '@hcengineering/core'
  import { DraftController, draftsStore, getClient } from '@hcengineering/presentation'
  import tags from '@hcengineering/tags'
  import { calcRank, Component, Issue, IssueDraft, IssueParentInfo, Project, Sprint } from '@hcengineering/tracker'
  import { Button, closeTooltip, ExpandCollapse, IconAdd, Scroller } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import tracker from '../plugin'
  import Collapsed from './icons/Collapsed.svelte'
  import Expanded from './icons/Expanded.svelte'
  import DraftIssueChildEditor from './templates/DraftIssueChildEditor.svelte'
  import DraftIssueChildList from './templates/DraftIssueChildList.svelte'

  export let parent: Ref<Issue>
  export let projectId: Ref<Project>
  export let project: Project | undefined
  export let sprint: Ref<Sprint> | null = null
  export let component: Ref<Component> | null = null
  export let subIssues: IssueDraft[] = []
  export let shouldSaveDraft: boolean = false
  let lastProject = project

  let isCollapsed = false
  let isCreating = $draftsStore[tracker.ids.IssueDraftChild] !== undefined

  async function handleIssueSwap (ev: CustomEvent<{ fromIndex: number; toIndex: number }>) {
    if (subIssues) {
      const { fromIndex, toIndex } = ev.detail
      const [fromIssue] = subIssues.splice(fromIndex, 1)
      const leftPart = subIssues.slice(0, toIndex)
      const rightPart = subIssues.slice(toIndex)
      subIssues = [...leftPart, fromIssue, ...rightPart]
    }
  }

  $: onProjectChange(project)

  function onProjectChange (project: Project | undefined) {
    if (lastProject?._id === project?._id) return
    lastProject = project
    if (project === undefined) return
    subIssues.forEach((p) => {
      p.status = project.defaultIssueStatus
      p.space = project._id
    })
  }

  const client = getClient()

  export async function save (parents: IssueParentInfo[]) {
    if (project === undefined) return
    saved = true

    for (const subIssue of subIssues) {
      const lastOne = await client.findOne<Issue>(tracker.class.Issue, {}, { sort: { rank: SortingOrder.Descending } })
      const incResult = await client.updateDoc(
        tracker.class.Project,
        core.space.Space,
        project._id,
        {
          $inc: { sequence: 1 }
        },
        true
      )
      const childId = subIssue._id
      const cvalue: AttachedData<Issue> = {
        title: subIssue.title.trim(),
        description: subIssue.description,
        assignee: subIssue.assignee,
        component: subIssue.component,
        sprint: subIssue.sprint,
        number: (incResult as any).object.sequence,
        status: subIssue.status ?? project.defaultIssueStatus,
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
        childInfo: [],
        createOn: Date.now()
      }

      await client.addCollection(
        tracker.class.Issue,
        project._id,
        parent,
        tracker.class.Issue,
        'subIssues',
        cvalue,
        childId
      )

      if ((subIssue.labels?.length ?? 0) > 0) {
        for (const label of subIssue.labels) {
          await client.addCollection(tags.class.TagReference, project._id, childId, tracker.class.Issue, 'labels', {
            title: label.title,
            color: label.color,
            tag: label.tag
          })
        }
      }
      saveAttachments(childId)
    }
  }

  async function saveAttachments (issue: Ref<Issue>) {
    const draftAttachments = $draftsStore[`${issue}_attachments`]
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
      projectId,
      issue,
      tracker.class.Issue,
      'attachments',
      doc,
      doc._id
    )
  }

  export function load (value: IssueDraft[]) {
    subIssues = value
  }

  let saved = false

  onDestroy(() => {
    if (!saved) {
      subIssues.forEach((st) => {
        removeDraft(st._id, true)
      })
    }
  })

  export async function removeDraft (_id: string, removeFiles: boolean = false): Promise<void> {
    const draftAttachments = $draftsStore[`${_id}_attachments`]
    DraftController.remove(`${_id}_attachments`)
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
          {component}
          {sprint}
          bind:issues={subIssues}
          project={projectId}
          on:move={handleIssueSwap}
          on:update-issue
        />
      </Scroller>
    </div>
  </ExpandCollapse>
{/if}
{#if isCreating && project}
  <ExpandCollapse isExpanded={!isCollapsed} on:changeContent>
    <DraftIssueChildEditor
      {project}
      {component}
      {sprint}
      {shouldSaveDraft}
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
