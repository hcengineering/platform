<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'
  import { AttachmentRefInput } from '@hcengineering/attachment-resources'
  import { Doc, generateId, getCurrentAccount } from '@hcengineering/core'
  import { createQuery, DraftController, draftsStore, getClient } from '@hcengineering/presentation'
  import chunter, { ChatMessage } from '@hcengineering/chunter'

  export let object: Doc
  export let chatMessage: ChatMessage | undefined = undefined
  export let shouldSaveDraft: boolean = true
  export let focusIndex: number = -1
  export let boundary: HTMLElement | undefined = undefined

  type MessageDraft = Pick<ChatMessage, '_id' | 'message' | 'attachments'>

  const dispatch = createEventDispatcher()

  const client = getClient()
  const _class = chunter.class.ChatMessage
  const createdMessageQuery = createQuery()
  const account = getCurrentAccount()

  const draftKey = `${object._id}_${_class}`
  const draftController = new DraftController<MessageDraft>(draftKey)
  const currentDraft = shouldSaveDraft ? $draftsStore[draftKey] : undefined

  const emptyMessage = {
    message: '<p></p>',
    attachments: 0
  }

  let inputRef: AttachmentRefInput
  let currentMessage: MessageDraft = chatMessage ?? currentDraft ?? getDefault()
  let _id = currentMessage._id
  let inputContent = currentMessage.message
  let loading = false

  $: createdMessageQuery.query(chunter.class.ChatMessage, { _id }, (result: ChatMessage[]) => {
    if (result.length > 0 && _id !== chatMessage?._id) {
      // Ouch we have got comment with same id created already.
      currentMessage = getDefault()
      _id = currentMessage._id
      inputRef.removeDraft(false)
    }
  })

  function objectChange (draft: MessageDraft, empty: Partial<MessageDraft>) {
    if (shouldSaveDraft) {
      draftController.save(draft, empty)
    }
  }

  $: objectChange(currentMessage, emptyMessage)

  function getDefault (): MessageDraft {
    return {
      _id: generateId(),
      ...emptyMessage
    }
  }

  async function onUpdate (event: CustomEvent) {
    if (!shouldSaveDraft) {
      return
    }
    const { message, attachments } = event.detail
    currentMessage.message = message
    currentMessage.attachments = attachments
  }

  async function onMessage (event: CustomEvent) {
    loading = true

    try {
      draftController.remove()
      inputRef.removeDraft(false)

      if (chatMessage) {
        await editMessage(event)
      } else {
        await createMessage(event)
      }

      // Remove draft from Local Storage
      currentMessage = getDefault()
      _id = currentMessage._id
    } catch (err) {
      console.error(err)
    }
    dispatch('submit', false)
    loading = false
  }

  async function createMessage (event: CustomEvent) {
    const { message, attachments } = event.detail

    await client.addCollection<Doc, ChatMessage>(
      _class,
      object.space,
      object._id,
      object._class,
      'comments',
      { message, attachments },
      _id,
      Date.now(),
      account._id
    )
  }

  async function editMessage (event: CustomEvent) {
    if (chatMessage === undefined) {
      return
    }
    const { message, attachments } = event.detail
    await client.update(chatMessage, { message, attachments, isEdited: true })
  }
  export function submit (): void {
    inputRef.submit()
  }
</script>

<AttachmentRefInput
  {focusIndex}
  bind:this={inputRef}
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
