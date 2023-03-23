<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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
  import { Comment } from '@hcengineering/chunter'
  import { AttachedData, Doc, generateId, Ref } from '@hcengineering/core'
  import { DraftController, draftsStore, getClient } from '@hcengineering/presentation'
  import { AttachmentRefInput } from '@hcengineering/attachment-resources'
  import { createBacklinks } from '../backlinks'
  import chunter from '../plugin'
  import { onDestroy } from 'svelte'

  export let object: Doc
  export let shouldSaveDraft: boolean = true

  const client = getClient()
  const _class = chunter.class.Comment

  type CommentDraft = AttachedData<Comment> & { _id: Ref<Comment> }

  const draftKey = `${object._id}_comment`
  const draftController = new DraftController<CommentDraft>(draftKey)

  const empty = {
    message: '<p></p>',
    attachments: 0
  }

  let commentInputBox: AttachmentRefInput
  const draftComment = shouldSaveDraft ? $draftsStore[draftKey] : undefined
  let comment: CommentDraft = draftComment ?? getDefault()
  let _id: Ref<Comment> = comment._id
  let inputContent: string = comment.message

  if (shouldSaveDraft) {
    draftController.watch(comment, empty)
  }

  onDestroy(draftController.unsubscribe)

  function getDefault (): CommentDraft {
    return {
      _id: generateId(),
      ...empty
    }
  }

  async function onUpdate (event: CustomEvent) {
    if (!shouldSaveDraft) {
      return
    }
    const { message, attachments } = event.detail
    if (comment) {
      comment.message = message
      comment.attachments = message
    } else {
      comment = {
        _id,
        message,
        attachments
      }
    }
  }

  let loading = false

  async function onMessage (event: CustomEvent) {
    loading = true
    const { message, attachments } = event.detail
    await client.addCollection<Doc, Comment>(
      _class,
      object.space,
      object._id,
      object._class,
      'comments',
      { message, attachments },
      _id
    )

    // Create an backlink to document
    await createBacklinks(client, object._id, object._class, _id, message)

    // Remove draft from Local Storage
    _id = generateId()
    comment = getDefault()
    draftController.remove()
    commentInputBox.removeDraft(false)
    loading = false
  }
</script>

<AttachmentRefInput
  bind:this={commentInputBox}
  bind:content={inputContent}
  {_class}
  space={object.space}
  bind:objectId={_id}
  {shouldSaveDraft}
  on:message={onMessage}
  on:update={onUpdate}
  bind:loading
/>
