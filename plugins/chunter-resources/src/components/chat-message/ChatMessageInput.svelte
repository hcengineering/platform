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
  import activity, { ActivityMessage } from '@hcengineering/activity'
  import { Analytics } from '@hcengineering/analytics'
  import { AttachmentRefInput } from '@hcengineering/attachment-resources'
  import chunter, { ChatMessage, ChunterEvents, ThreadMessage } from '@hcengineering/chunter'
  import { Class, Doc, generateId, Ref, type CommitResult } from '@hcengineering/core'
  import { createQuery, DraftController, draftsStore, getClient } from '@hcengineering/presentation'
  import { EmptyMarkup, isEmptyMarkup } from '@hcengineering/text'
  import { createEventDispatcher } from 'svelte'
  import { getObjectId } from '@hcengineering/view-resources'
  import { ThrottledCaller } from '@hcengineering/ui'
  import { getSpace } from '@hcengineering/activity-resources'
  import { getCurrentEmployee } from '@hcengineering/contact'
  import { getChannelSpace } from '../../utils'
  import ChannelTypingInfo from '../ChannelTypingInfo.svelte'

  export let object: Doc
  export let chatMessage: ChatMessage | undefined = undefined
  export let shouldSaveDraft: boolean = true
  export let focusIndex: number = -1
  export let boundary: HTMLElement | undefined = undefined
  export let loading = false
  export let collection: string = 'comments'
  export let autofocus = false
  export let withTypingInfo = false

  import { setTyping, clearTyping } from '@hcengineering/presence-resources'

  type MessageDraft = Pick<ChatMessage, '_id' | 'message' | 'attachments'>

  const dispatch = createEventDispatcher()

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const _class: Ref<Class<ChatMessage>> = hierarchy.isDerived(object._class, activity.class.ActivityMessage)
    ? chunter.class.ThreadMessage
    : chunter.class.ChatMessage
  const createdMessageQuery = createQuery()

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
    createdMessageQuery.query(_class, { _id, space: getSpace(object) }, (result: ChatMessage[]) => {
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

  function objectChange (draft: MessageDraft, empty: Partial<MessageDraft>): void {
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

  const me = getCurrentEmployee()
  const throttle = new ThrottledCaller(500)

  async function deleteTypingInfo (): Promise<void> {
    if (!withTypingInfo) return
    void clearTyping(me, object._id)
  }

  async function updateTypingInfo (): Promise<void> {
    if (!withTypingInfo) return

    throttle.call(() => {
      void setTyping(me, object._id)
    })
  }

  function onUpdate (event: CustomEvent): void {
    if (!isEmptyMarkup(event.detail.message)) {
      void updateTypingInfo()
    }
    if (!shouldSaveDraft) {
      return
    }
    const { message, attachments } = event.detail
    currentMessage.message = message
    currentMessage.attachments = attachments
  }

  async function handleCreate (event: CustomEvent, _id: Ref<ChatMessage>): Promise<void> {
    try {
      const res = await createMessage(event, _id, `chunter.create.${_class} ${object._class}`)

      console.log(`create.${_class} measure`, res.serverTime, res.time)
      const objectId = await getObjectId(object, client.getHierarchy())
      Analytics.handleEvent(ChunterEvents.MessageCreated, { ok: res.result, objectId, objectClass: object._class })
    } catch (err: any) {
      const objectId = await getObjectId(object, client.getHierarchy())
      Analytics.handleEvent(ChunterEvents.MessageCreated, { ok: false, objectId, objectClass: object._class })
      Analytics.handleError(err)
      console.error(err)
    }
  }

  async function handleEdit (event: CustomEvent): Promise<void> {
    try {
      await editMessage(event)
      const objectId = await getObjectId(object, client.getHierarchy())
      Analytics.handleEvent(ChunterEvents.MessageEdited, { ok: true, objectId, objectClass: object._class })
    } catch (err: any) {
      const objectId = await getObjectId(object, client.getHierarchy())
      Analytics.handleEvent(ChunterEvents.MessageEdited, { ok: false, objectId, objectClass: object._class })
      Analytics.handleError(err)
      console.error(err)
    }
  }

  async function onMessage (event: CustomEvent): Promise<void> {
    draftController.remove()
    inputRef.removeDraft(false)

    if (chatMessage !== undefined) {
      loading = true
      await handleEdit(event)
    } else {
      void handleCreate(event, _id)
      void deleteTypingInfo()
    }

    // Remove draft from Local Storage
    clear()
    dispatch('submit', false)
    loading = false
  }

  async function createMessage (event: CustomEvent, _id: Ref<ChatMessage>, msg: string): Promise<CommitResult> {
    const { message, attachments } = event.detail
    const operations = client.apply(undefined, msg)

    if (_class === chunter.class.ThreadMessage) {
      const parentMessage = object as ActivityMessage

      await operations.addCollection<ActivityMessage, ThreadMessage>(
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
    } else {
      await operations.addCollection<Doc, ChatMessage>(
        _class,
        getSpace(object),
        object._id,
        object._class,
        collection,
        { message, attachments },
        _id
      )
    }
    return await operations.commit()
  }

  async function editMessage (event: CustomEvent): Promise<void> {
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
  docId={object._id}
  docClass={object._class}
  {_class}
  space={getChannelSpace(object._class, object._id, object.space)}
  skipAttachmentsPreload={(currentMessage.attachments ?? 0) === 0}
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

{#if withTypingInfo}
  <ChannelTypingInfo {object} />
{/if}
