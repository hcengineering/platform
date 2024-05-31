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
  import attachment from '@hcengineering/attachment'
  import { AttachmentDocList } from '@hcengineering/attachment-resources'
  import { ChatMessagePopup } from '@hcengineering/chunter-resources'
  import { Ref } from '@hcengineering/core'
  import { IconForward, createQuery, getClient } from '@hcengineering/presentation'
  import { CollaborativeTextEditor } from '@hcengineering/text-editor'
  import { Issue } from '@hcengineering/tracker'
  import { Label, Scroller, resizeObserver } from '@hcengineering/ui'
  import { getCollaborationUser } from '@hcengineering/view-resources'

  import tracker from '../../plugin'
  import AssigneeEditor from './AssigneeEditor.svelte'
  import IssueStatusActivity from './IssueStatusActivity.svelte'
  import PriorityEditor from './PriorityEditor.svelte'
  import StatusEditor from './StatusEditor.svelte'

  export let object: Issue

  let issue: Issue | undefined

  const client = getClient()
  const issueQuery = createQuery()

  const user = getCollaborationUser()

  $: issueQuery.query(
    object._class,
    { _id: object._id },
    (res) => {
      issue = res[0]
    },
    { limit: 1 }
  )

  const limit: number = 350
  let cHeight: number = 0

  let parent: Issue | undefined

  async function getParent (attachedTo: Ref<Issue> | undefined): Promise<void> {
    if (attachedTo === undefined || attachedTo === tracker.ids.NoParent) {
      parent = undefined
    } else {
      parent = await client.findOne(tracker.class.Issue, { _id: attachedTo })
    }
  }

  $: void getParent(issue?.attachedTo as Ref<Issue>)
</script>

{#if issue}
  <div class="ap-header flex-between">
    <div class="flex-col">
      <div class="flex-row-center gap-1">
        {#if parent}
          <span class="overflow-label content-color">{parent.title}</span>
          <IconForward size={'x-small'} />
        {/if}
        <span class="content-dark-color">{issue.identifier}</span>
      </div>
      <span class="overflow-label text-xl caption-color">{issue.title}</span>
    </div>
  </div>
  <Scroller padding={'0.75rem 1.75rem 0'} noFade>
    <div class="flex-row-center gap-2 mb-2">
      <StatusEditor value={issue} shouldShowLabel kind={'regular'} />
      <PriorityEditor value={issue} shouldShowLabel kind={'regular'} />
      {#if issue.assignee}
        <AssigneeEditor object={issue} kind={'regular'} />
      {/if}
    </div>

    <div class="grid-preview">
      <IssueStatusActivity {issue} accentHeader />
    </div>

    <div class="mt-6 mb-2 overflow-label fs-bold content-dark-color">
      <Label label={tracker.string.Description} />:
    </div>
    {#if issue.description}
      <div class="description-container" class:masked={cHeight > limit} style:max-height={`${limit}px`}>
        <div class="description-content" use:resizeObserver={(element) => (cHeight = element.clientHeight)}>
          {#key issue._id}
            <CollaborativeTextEditor collaborativeDoc={issue.description} field="description" {user} readonly />
          {/key}
        </div>
      </div>
    {:else}
      <div class="overflow-label content-darker-color">
        <Label label={tracker.string.NoDescription} />
      </div>
    {/if}
    {#if issue.attachments}
      <div class="mt-6 mb-2 overflow-label fs-bold content-dark-color">
        <Label label={attachment.string.Attachments} />:
      </div>
      <AttachmentDocList value={issue} />
    {/if}
    {#if issue.comments}
      <div class="mt-6">
        <ChatMessagePopup objectId={issue._id} object={issue} />
      </div>
    {/if}
    <div class="h-3 flex-no-shrink" />
  </Scroller>
  <div class="h-3 flex-no-shrink" />
{/if}

<style lang="scss">
  .description-container {
    overflow: hidden;
    height: auto;
    min-height: 0;

    &.masked {
      mask-image: linear-gradient(0deg, #0000 0, #000f 4rem);
    }
    .description-content {
      width: 100%;
      min-width: 0;
      height: max-content;
      min-height: 0;
    }
  }
  .grid-preview {
    display: grid;
    grid-template-columns: 1fr 2fr;
    grid-auto-rows: minmax(2rem, max-content);
    justify-content: start;
    align-items: center;
    row-gap: 0.25rem;
    column-gap: 1rem;
    margin-top: 0.5rem;
  }
</style>
