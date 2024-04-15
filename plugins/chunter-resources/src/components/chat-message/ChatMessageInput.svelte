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
  import { Analytics } from '@hcengineering/analytics'
  import { createEventDispatcher } from 'svelte'
  import { AttachmentRefInput } from '@hcengineering/attachment-resources'
  import { Class, Doc, generateId, getCurrentAccount, Ref } from '@hcengineering/core'
  import { createQuery, DraftController, draftsStore, getClient } from '@hcengineering/presentation'
  import chunter, { ChatMessage, ThreadMessage } from '@hcengineering/chunter'
  import { PersonAccount } from '@hcengineering/contact'
  import activity, { ActivityMessage } from '@hcengineering/activity'
  import { EmptyMarkup } from '@hcengineering/text-editor'

  export let object: Doc
  export let chatMessage: ChatMessage | undefined = undefined
  export let shouldSaveDraft: boolean = true
  export let focusIndex: number = -1
  export let boundary: HTMLElement | undefined = undefined
  export let loading = false
  export let collection: string = 'comments'
  export let autofocus = false

  type MessageDraft = Pick<ChatMessage, '_id' | 'message' | 'attachments'>

  const dispatch = createEventDispatcher()

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const _class: Ref<Class<ChatMessage>> = hierarchy.isDerived(object._class, activity.class.ActivityMessage)
    ? chunter.class.ThreadMessage
    : chunter.class.ChatMessage
  const createdMessageQuery = createQuery()
  const account = getCurrentAccount() as PersonAccount

  const draftKey = `${object._id}_${_class}`
  const draftController = new DraftController<MessageDraft>(draftKey)
  const currentDraft = shouldSaveDraft ? $draftsStore[draftKey] : undefined

  const emptyMessage: Pick<MessageDraft, 'message' | 'attachments'> = {
    message: EmptyMarkup,
    attachments: 0
  }

  let inputRef: AttachmentRefInput
  let currentMessage: MessageDraft = chatMessage ?? currentDraft ?? getDefault()
  let _id = currentMessage._id
  let inputContent = currentMessage.message

  $: if (currentDraft != null) {
    createdMessageQuery.query(_class, { _id }, (result: ChatMessage[]) => {
      if (result.length > 0 && _id !== chatMessage?._id) {
        // Ouch we have got comment with same id created already.
        clear()
      }
    })
  } else {
    createdMessageQuery.unsubscribe()
  }

  function clear (): void {
    currentMessage = getDefault()
    _id = currentMessage._id
    inputRef.removeDraft(false)
  }

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
    } catch (err: any) {
      Analytics.handleError(err)
      console.error(err)
    }
    dispatch('submit', false)
    loading = false
  }

  async function createMessage (event: CustomEvent) {
    const { message, attachments } = event.detail

    if (_class === chunter.class.ThreadMessage) {
      const parentMessage = object as ActivityMessage

      await client.addCollection<ActivityMessage, ThreadMessage>(
        chunter.class.ThreadMessage,
        parentMessage.space,
        parentMessage._id,
        parentMessage._class,
        'replies',
        {
          message,
          attachments,
          objectClass: parentMessage.attachedToClass,
          objectId: parentMessage.attachedTo
        },
        _id as Ref<ThreadMessage>
      )

      clear()

      await client.update(parentMessage, { lastReply: Date.now() })

      const hasPerson = !!parentMessage.repliedPersons?.includes(account.person)

      if (!hasPerson) {
        await client.update(parentMessage, { $push: { repliedPersons: account.person } })
      }
    } else {
      await client.addCollection<Doc, ChatMessage>(
        _class,
        object.space,
        object._id,
        object._class,
        collection,
        { message, attachments },
        _id
      )
      clear()
    }
  }

  async function editMessage (event: CustomEvent) {
    if (chatMessage === undefined) {
      return
    }
    const { message, attachments } = event.detail
    await client.update(chatMessage, { message, attachments, editedOn: Date.now() })
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
  {autofocus}
  on:message={onMessage}
  on:update={onUpdate}
  on:focus
  on:blur
  bind:loading
/>
