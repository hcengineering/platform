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
  import { getClient } from '@hcengineering/presentation'
  import { fetchMetadataLocalStorage, setMetadataLocalStorage } from '@hcengineering/ui'
  import { AttachmentRefInput } from '@hcengineering/attachment-resources'
  import { createBacklinks } from '../backlinks'
  import chunter from '../plugin'

  export let object: Doc
  export let shouldSaveDraft: boolean = true

  const client = getClient()
  const _class = chunter.class.Comment
  let _id: Ref<Comment> = generateId()
  let inputContent: string = ''
  let draftComment: Comment | undefined

  $: updateDraft(object)

  $: updateCommentInput(draftComment)

  async function updateCommentInput (draftComment: Comment | undefined) {
    inputContent = draftComment ? draftComment.message : ''
  }

  function commentIsEmpty (message: string, attachments: number): boolean {
    return !(message.length > 0 || attachments > 0)
  }

  async function updateDraft (object: Doc) {
    const drafts = fetchMetadataLocalStorage(chunter.metadata.CommentDrafts) ?? {}
    draftComment = drafts[object._id]
  }

  async function removeDraft (object: Doc) {
    const drafts = fetchMetadataLocalStorage(chunter.metadata.CommentDrafts)
    if (drafts !== null && drafts[object._id]) {
      delete drafts[object._id]
      setMetadataLocalStorage(chunter.metadata.CommentDrafts, drafts)
    }
  }

  async function saveDraft (object: Doc) {
    const drafts = fetchMetadataLocalStorage(chunter.metadata.CommentDrafts) ?? {}
    if (draftComment) {
      drafts[object._id] = draftComment
      setMetadataLocalStorage(chunter.metadata.CommentDrafts, drafts)
    }
  }

  async function onUpdate (event: CustomEvent) {
    const { message, attachments } = event.detail
    if (commentIsEmpty(message, attachments)) {
      removeDraft(object)
      draftComment = undefined
      return
    }
    if (!draftComment) {
      draftComment = createDraftFromObject()
    }
    draftComment.message = message
    draftComment.attachments = attachments

    saveDraft(object)
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

  async function onMessage (event: CustomEvent) {
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
    _id = generateId()
  }
</script>

<AttachmentRefInput
  bind:content={inputContent}
  {_class}
  space={object.space}
  objectId={_id}
  on:message={onMessage}
  on:update={onUpdate}
/>
