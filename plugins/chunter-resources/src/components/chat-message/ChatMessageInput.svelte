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
  import contact, { type Person } from '@hcengineering/contact'
  import core, {
    type AccountUuid,
    Class,
    Doc,
    generateId,
    getCurrentAccount,
    Ref,
    resolveMentionGrantTarget,
    type Space,
    type CommitResult
  } from '@hcengineering/core'
  import { createQuery, DraftController, draftsStore, getClient } from '@hcengineering/presentation'
  import { EmptyMarkup, isEmptyMarkup, markupToJSON } from '@hcengineering/text'
  import { extractReferences } from '@hcengineering/text-core'
  import { createEventDispatcher } from 'svelte'
  import { getObjectId } from '@hcengineering/view-resources'
  import { showPopup, ThrottledCaller } from '@hcengineering/ui'
  import { getSpace, editingMessageStore } from '@hcengineering/activity-resources'

  import { getChannelSpace } from '../../utils'
  import { applyMentionGrantChoices } from '../../mentionGrants'
  import ChannelTypingInfo from '../ChannelTypingInfo.svelte'
  import MentionGrantConfirm from './MentionGrantConfirm.svelte'

  export let object: Doc
  export let chatMessage: ChatMessage | undefined = undefined
  export let shouldSaveDraft: boolean = true
  export let focusIndex: number = -1
  export let boundary: HTMLElement | undefined = undefined
  export let loading = false
  export let collection: string = 'comments'
  export let autofocus = false
  export let withTypingInfo = false
  export let onKeyDown: ((e: KeyboardEvent) => void) | undefined = undefined

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

  const acc = getCurrentAccount()
  const throttle = new ThrottledCaller(500)

  async function deleteTypingInfo (): Promise<void> {
    if (!withTypingInfo) return
    void clearTyping(acc.primarySocialId, object._id)
  }

  async function updateTypingInfo (): Promise<void> {
    if (!withTypingInfo) return

    throttle.call(() => {
      void setTyping(acc.primarySocialId, object._id)
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

  /**
   * Disclosure UX for the mention-grants-access flow. Resolves the set of NEW
   * grantees (mentioned Persons not already in the grant-target space) and asks
   * the actor to confirm/deselect each. Returns:
   *   - null  => cancel (do not send)
   *   - Map   => send; map is personId -> grant choice (true/false). Empty map
   *              when there is nothing to disclose (send unchanged).
   * The actual access grant happens server-side via the chunter trigger; this
   * dialog only discloses + lets the actor opt specific people out.
   */
  async function resolveMentionGrantChoices (markup: string): Promise<Map<string, boolean> | null> {
    if (markup === undefined || markup === '' || isEmptyMarkup(markup)) return new Map()
    let node
    try {
      node = markupToJSON(markup)
    } catch {
      return new Map()
    }
    const references = extractReferences(node)
    const mentionedPersonIds = references
      .filter(({ objectClass }) => hierarchy.isDerived(objectClass, contact.class.Person))
      .filter(({ grantsAccess }) => grantsAccess !== 'false') // V3c: already-denied refs need no disclosure
      .map(({ objectId }) => objectId as Ref<Person>)
    if (mentionedPersonIds.length === 0) return new Map()

    const grantTarget = await resolveMentionGrantTarget(object, (cls, q) => client.findAll(cls, q))
    if (grantTarget == null) return new Map()

    const space = (await client.findAll<Space>(core.class.Space, { _id: grantTarget.space }))[0]
    if (space === undefined) return new Map()
    const members = new Set<AccountUuid>(space.members ?? [])

    const persons = await client.findAll(contact.class.Person, { _id: { $in: mentionedPersonIds } })
    const newGrantees = persons.filter((p) => p.personUuid != null && !members.has(p.personUuid as AccountUuid))
    if (newGrantees.length === 0) return new Map()

    const targetName: string = (grantTarget as any).name ?? (grantTarget as any).title ?? grantTarget._id
    const spaceName: string = (space as any).name ?? space._id
    const grantees = newGrantees.map((p) => ({ id: p._id, name: p.name ?? String(p.personUuid) }))

    return await new Promise<Map<string, boolean> | null>((resolve) => {
      showPopup(
        MentionGrantConfirm,
        { grantees, targetName, spaceName },
        undefined,
        (res?: Map<string, boolean>) => {
          resolve(res instanceof Map ? res : null)
        }
      )
    })
  }

  // Runs the mention-grants disclosure for an outgoing/edited message and
  // rewrites event.detail.message with the actor's per-grantee choices.
  // Returns false if the actor cancelled (caller must abort the send).
  async function prepareMentionGrantChoices (event: CustomEvent): Promise<boolean> {
    const markup = event.detail?.message
    const choices = await resolveMentionGrantChoices(typeof markup === 'string' ? markup : '')
    if (choices === null) return false // actor cancelled
    if (choices.size > 0 && typeof markup === 'string') {
      event.detail.message = applyMentionGrantChoices(markup, choices)
    }
    return true
  }

  // Returns true if the message was sent, false if the actor cancelled the
  // grant dialog or the send failed. The caller (onMessage) must only clear
  // the draft/input on a true result, otherwise a cancelled grant dialog
  // would lose the unsent comment.
  async function handleCreate (event: CustomEvent, _id: Ref<ChatMessage>): Promise<boolean> {
    try {
      if (!(await prepareMentionGrantChoices(event))) return false

      const res = await createMessage(event, _id, `chunter.create.${_class} ${object._class}`)

      console.log(`create.${_class} measure`, res.serverTime, res.time)
      const objectId = await getObjectId(object, client.getHierarchy())
      Analytics.handleEvent(ChunterEvents.MessageCreated, { ok: res.result, objectId, objectClass: object._class })
      return true
    } catch (err: any) {
      const objectId = await getObjectId(object, client.getHierarchy())
      Analytics.handleEvent(ChunterEvents.MessageCreated, { ok: false, objectId, objectClass: object._class })
      Analytics.handleError(err)
      return false
    }
  }

  async function handleEdit (event: CustomEvent): Promise<boolean> {
    try {
      if (!(await prepareMentionGrantChoices(event))) return false

      await editMessage(event)
      const objectId = await getObjectId(object, client.getHierarchy())
      Analytics.handleEvent(ChunterEvents.MessageEdited, { ok: true, objectId, objectClass: object._class })
      return true
    } catch (err: any) {
      const objectId = await getObjectId(object, client.getHierarchy())
      Analytics.handleEvent(ChunterEvents.MessageEdited, { ok: false, objectId, objectClass: object._class })
      Analytics.handleError(err)
      return false
    }
  }

  async function onMessage (event: CustomEvent): Promise<void> {
    loading = true

    let ok = false
    if (chatMessage !== undefined) {
      ok = await handleEdit(event)
    } else {
      ok = await handleCreate(event, _id)
      void deleteTypingInfo()
    }

    // Only clear the input / drop the draft after a successful send or edit.
    // A cancelled grant dialog (ok === false) must preserve the unsent comment.
    if (ok) {
      draftController.remove()
      inputRef.removeDraft(false)
      clear()
      dispatch('submit', false)
    }
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

  function handleKeyDown (event: KeyboardEvent): boolean {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      if (inputRef.isEmptyDraft() && chatMessage == null) {
        onKeyDown?.(event)
      }
    }

    if (event.key === 'Escape') {
      if ($editingMessageStore === undefined) return false
      event.stopPropagation()
      event.preventDefault()
      editingMessageStore.set(undefined)
    }
    return false
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
  onKeyDown={handleKeyDown}
/>

{#if withTypingInfo}
  <ChannelTypingInfo {object} />
{/if}
