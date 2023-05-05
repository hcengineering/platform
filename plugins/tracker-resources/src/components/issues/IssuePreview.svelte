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
  import chunter from '@hcengineering/chunter'
  import { CommentPopup } from '@hcengineering/chunter-resources'
  import { Ref } from '@hcengineering/core'
  import { createQuery, getClient, MessageViewer } from '@hcengineering/presentation'
  import { Issue, Project } from '@hcengineering/tracker'
  import { Label, resizeObserver, Scroller } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import AssigneeEditor from './AssigneeEditor.svelte'
  import IssueStatusActivity from './IssueStatusActivity.svelte'
  import PriorityEditor from './PriorityEditor.svelte'
  import StatusEditor from './StatusEditor.svelte'

  export let object: Issue
  let issue: Issue | undefined

  const client = getClient()
  $: space = object.space
  const issueQuery = createQuery()
  const spaceQuery = createQuery()

  $: issueQuery.query(
    object._class,
    { _id: object._id },
    (res) => {
      issue = res[0]
    },
    { limit: 1 }
  )

  let currentProject: Project | undefined

  $: spaceQuery.query(tracker.class.Project, { _id: space }, (res) => ([currentProject] = res))
  $: issueName = currentProject && issue && `${currentProject.identifier}-${issue.number}`

  const limit: number = 350

  let cHeight: number

  let parent: Issue | undefined

  async function getParent (attachedTo: Ref<Issue> | undefined): Promise<void> {
    if (attachedTo === undefined || attachedTo === tracker.ids.NoParent) {
      parent = undefined
    } else {
      parent = await client.findOne(tracker.class.Issue, { _id: attachedTo })
    }
  }

  $: getParent(issue?.attachedTo as Ref<Issue>)
</script>

<div class="flex">
  <Scroller>
    <div class="w-165 scrollerContent">
      {#if parent}
        <div class="mb-4 ml-2">{parent.title}</div>
      {/if}
      {#if issue}
        <div class="fs-title text-xl ml-2">{issueName} {issue.title}</div>
        <div class="flex mt-2">
          <StatusEditor value={issue} shouldShowLabel kind={'transparent'} />
          <PriorityEditor value={issue} shouldShowLabel />
          {#if issue.assignee}
            <AssigneeEditor value={issue} width={'min-content'} />
          {/if}
        </div>
        <IssueStatusActivity {issue} />

        <div class="mb-2">
          <Label label={tracker.string.Description} />:
        </div>
        {#if issue.description}
          <div
            class="descr ml-2"
            class:mask={cHeight >= limit}
            use:resizeObserver={(element) => {
              cHeight = element.clientHeight
            }}
          >
            <MessageViewer message={issue.description} />
          </div>
        {:else}
          <div class="ml-2 content-dark-color">
            <Label label={tracker.string.NoDescription} />
          </div>
        {/if}
        {#if issue.attachments}
          <div class="mt-2 mb-2">
            <Label label={attachment.string.Attachments} />:
          </div>
          <div>
            <AttachmentDocList value={issue} />
          </div>
        {/if}
        {#if issue.comments}
          <div class="mt-2 mb-2">
            <Label label={chunter.string.Comments} />:
          </div>
          <div class="ml-2">
            <CommentPopup objectId={issue._id} object={issue} />
          </div>
        {/if}
      {/if}
    </div>
  </Scroller>
</div>

<style lang="scss">
  .descr {
    overflow: hidden;

    &.mask {
      mask: linear-gradient(to top, rgba(0, 0, 0, 0) 0, black 5rem);
    }
  }

  .scrollerContent {
    height: fit-content;
    max-height: 32rem;
  }
</style>
