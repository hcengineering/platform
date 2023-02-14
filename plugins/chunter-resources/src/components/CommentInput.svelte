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
  import { Doc, generateId, Ref } from '@hcengineering/core'
  import { getClient, draftStore, updateDraftStore } from '@hcengineering/presentation'
  import { AttachmentRefInput } from '@hcengineering/attachment-resources'
  import { createBacklinks } from '../backlinks'
  import chunter from '../plugin'

  export let object: Doc
  export let shouldSaveDraft: boolean = false

  const client = getClient()
  const _class = chunter.class.Comment

  let _id: Ref<Comment> = generateId()
  let inputContent: string = ''
  let commentInputBox: AttachmentRefInput
  let draftComment: Comment | undefined = undefined
  let saveTimer: number | undefined

  $: updateDraft(object)
  $: updateCommentFromDraft(draftComment)

  async function updateDraft (object: Doc) {
    if (!shouldSaveDraft) {
      return
    }
    draftComment = $draftStore[object._id]
    if (!draftComment) {
      _id = generateId()
    }
  }

  async function updateCommentFromDraft (draftComment: Comment | undefined) {
    if (!shouldSaveDraft) {
      return
    }
    inputContent = draftComment ? draftComment.message : ''
    _id = draftComment ? draftComment._id : _id
  }

  function commentIsEmpty (message: string, attachments: number): boolean {
    return (message === '<p></p>' || message === '') && !(attachments > 0)
  }

  async function saveDraft (object: Doc) {
    updateDraftStore(object._id, draftComment)
  }

  async function handleCommentUpdate (message: string, attachments: number) {
    if (commentIsEmpty(message, attachments)) {
      draftComment = undefined
      saveDraft(object)
      _id = generateId()
      return
    }
    if (!draftComment) {
      draftComment = createDraftFromObject()
    }
    draftComment.message = message
    draftComment.attachments = attachments

    await commentInputBox.createAttachments()
    saveDraft(object)
  }

  async function onUpdate (event: CustomEvent) {
    if (!shouldSaveDraft) {
      return
    }
    const { message, attachments } = event.detail
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    saveTimer = setTimeout(() => {
      handleCommentUpdate(message, attachments)
    }, 200)
  }

  function createDraftFromObject () {
    const newDraft: Comment = {
      _id,
      _class: chunter.class.Comment,
      space: object.space,
      modifiedOn: Date.now(),
      modifiedBy: object.modifiedBy,
      attachedTo: object._id,
      attachedToClass: object._class,
      collection: 'comments',
      message: '',
      attachments: 0
    }
    return newDraft
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
    draftComment = undefined
    await saveDraft(object)
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
