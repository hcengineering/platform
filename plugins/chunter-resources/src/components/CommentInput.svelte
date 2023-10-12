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
  import { AttachmentRefInput } from '@hcengineering/attachment-resources'
  import { Comment } from '@hcengineering/chunter'
  import { AttachedData, Doc, generateId, Ref } from '@hcengineering/core'
  import { createQuery, DraftController, draftsStore, getClient } from '@hcengineering/presentation'
  import chunter from '../plugin'

  export let object: Doc
  export let shouldSaveDraft: boolean = true
  export let focusIndex: number = -1
  export let boundary: HTMLElement | undefined = undefined

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

  const createdQuery = createQuery()

  $: createdQuery.query(chunter.class.Comment, { _id }, (docs) => {
    if (docs.length > 0) {
      // Ouch we have got comment with same id created already.
      comment = getDefault()
      _id = comment._id
      commentInputBox.removeDraft(false)
    }
  })

  function objectChange (object: CommentDraft, empty: any) {
    if (shouldSaveDraft) {
      draftController.save(object, empty)
    }
  }

  $: objectChange(comment, empty)

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
    try {
      draftController.remove()
      commentInputBox.removeDraft(false)
      await client.addCollection<Doc, Comment>(
        _class,
        object.space,
        object._id,
        object._class,
        'comments',
        { message, attachments },
        _id
      )

      // Remove draft from Local Storage
      comment = getDefault()
      _id = comment._id
    } catch (err) {
      console.error(err)
    } finally {
      loading = false
    }
  }
</script>

<AttachmentRefInput
  {focusIndex}
  bind:this={commentInputBox}
  bind:content={inputContent}
  {_class}
  space={object.space}
  bind:objectId={_id}
  {shouldSaveDraft}
  {boundary}
  on:message={onMessage}
  on:update={onUpdate}
  on:focus
  on:blur
  bind:loading
/>
