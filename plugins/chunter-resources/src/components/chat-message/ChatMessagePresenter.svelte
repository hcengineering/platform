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
  import activity, { ActivityMessage, ActivityMessageViewType, DisplayActivityMessage } from '@hcengineering/activity'
  import { ActivityDocLink, ActivityMessageTemplate, MessageInlineAction } from '@hcengineering/activity-resources'
  import { Attachment } from '@hcengineering/attachment'
  import { AttachmentDocList, AttachmentImageSize } from '@hcengineering/attachment-resources'
  import chunter, { ChatMessage, ChatMessageViewlet } from '@hcengineering/chunter'
  import contact, { getCurrentEmployee, Person, SocialIdentity } from '@hcengineering/contact'
  import { getPersonByPersonIdCb, getSocialIdByPersonIdCb } from '@hcengineering/contact-resources'
  import { Class, Doc, Markup, Ref, Space, WithLookup } from '@hcengineering/core'
  import { getClient, MessageViewer, pendingCreatedDocs } from '@hcengineering/presentation'
  import { EmptyMarkup } from '@hcengineering/text'
  import { Action, Button, IconEdit, ShowMore } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { getDocLinkTitle } from '@hcengineering/view-resources'

  import { shownTranslatedMessagesStore, translatedMessagesStore, translatingMessagesStore } from '../../stores'
  import ChatMessageHeader from './ChatMessageHeader.svelte'
  import ChatMessageInput from './ChatMessageInput.svelte'

  export let value: WithLookup<ChatMessage> | undefined
  export let doc: Doc | undefined = undefined
  export let showNotify: boolean = false
  export let isHighlighted: boolean = false
  export let isSelected: boolean = false
  export let shouldScroll: boolean = false
  export let embedded: boolean = false
  export let withActions: boolean = true
  export let showEmbedded = false
  export let hideFooter = false
  export let skipLabel = false
  export let actions: Action[] = []
  export let hoverable = true
  export let inline = false
  export let hoverStyles: 'filledHover' = 'filledHover'
  export let withShowMore: boolean = true
  export let attachmentImageSize: AttachmentImageSize = 'x-large'
  export let videoPreload = false
  export let hideLink = false
  export let compact = false
  export let readonly = false
  export let type: ActivityMessageViewType = 'default'
  export let onClick: (() => void) | undefined = undefined
  export let onReply: ((message: ActivityMessage) => void) | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const STALE_TIMEOUT_MS = 5000
  const me = getCurrentEmployee()

  let parentMessage: DisplayActivityMessage | undefined = undefined
  let object: Doc | undefined

  let refInput: ChatMessageInput

  let viewlet: ChatMessageViewlet | undefined
  ;[viewlet] =
    value !== undefined
      ? client.getModel().findAllSync(chunter.class.ChatMessageViewlet, {
        objectClass: value.attachedToClass,
        messageClass: value._class
      })
      : []

  $: personId = value?.createdBy
  let person: Person | undefined
  let socialId: SocialIdentity | undefined
  $: if (personId !== undefined) {
    getPersonByPersonIdCb(personId, (p) => {
      person = p ?? undefined
    })
    getSocialIdByPersonIdCb(personId, (s) => {
      socialId = s ?? undefined
    })
  } else {
    person = undefined
    socialId = undefined
  }

  let originalText = value?.message

  $: if (value && originalText && originalText !== value?.message) {
    originalText = value.message
    translatedMessagesStore.update((map) => {
      if (value) {
        map.delete(value._id)
      }
      return map
    })
    shownTranslatedMessagesStore.update((map) => {
      if (value) {
        map.delete(value._id)
      }
      return map
    })
  } else {
    originalText = value?.message
  }

  $: value !== undefined &&
    getParentMessage(value.attachedToClass, value.attachedTo, value.space).then((res) => {
      parentMessage = res as DisplayActivityMessage
    })

  $: if (doc !== undefined && value?.attachedTo === doc._id) {
    object = doc
  } else if (value !== undefined) {
    void client.findOne(value.attachedToClass, { _id: value.attachedTo }).then((result) => {
      object = result
    })
  }

  let stale = false
  let markStaleId: NodeJS.Timeout | undefined
  $: pending = value?._id !== undefined && $pendingCreatedDocs[value._id]
  $: if (pending) {
    markStaleId = setTimeout(() => {
      stale = true
    }, STALE_TIMEOUT_MS)
  } else {
    if (markStaleId !== undefined) {
      clearTimeout(markStaleId)
      markStaleId = undefined
    }
    stale = false
  }

  async function getParentMessage (
    _class: Ref<Class<Doc>>,
    _id: Ref<Doc>,
    space: Ref<Space>
  ): Promise<ActivityMessage | undefined> {
    if (hierarchy.isDerived(_class, activity.class.ActivityMessage)) {
      return await client.findOne<ActivityMessage>(_class, { _id: _id as Ref<ActivityMessage>, space })
    }
  }

  async function handleEditAction (): Promise<void> {
    isEditing = true
  }

  let isEditing = false
  let additionalActions: Action[] = []

  $: isOwn = person !== undefined && person._id === me

  $: additionalActions = [
    ...(isOwn
      ? [
          {
            label: activity.string.Edit,
            icon: IconEdit,
            group: 'edit',
            action: handleEditAction
          }
        ]
      : []),
    ...actions
  ]

  let attachments: Attachment[] | undefined = undefined
  $: attachments = value?.$lookup?.attachments as Attachment[] | undefined

  let inlineActions: MessageInlineAction[] = []

  $: updateInlineActions($translatingMessagesStore, $shownTranslatedMessagesStore)
  function updateInlineActions (
    translatingMessages: Set<Ref<ChatMessage>>,
    shownTranslated: Set<Ref<ChatMessage>>
  ): void {
    if (value === undefined) {
      inlineActions = []
      return
    }

    const result: MessageInlineAction[] = []

    if (translatingMessages.has(value._id)) {
      result.push({
        label: chunter.string.Translating
      })
    } else if (shownTranslated.has(value._id)) {
      result.push({
        label: chunter.string.ShowOriginal,
        onClick: async () => {
          shownTranslatedMessagesStore.update((map) => {
            if (value) {
              map.delete(value._id)
            }
            return map
          })
        }
      })
    }

    inlineActions = result
  }

  $: socialProvider = value?.provider
    ? client.getModel().findAllSync(contact.class.ChannelProvider, { _id: value.provider })[0]
    : undefined

  let displayText: Markup = value?.message ?? EmptyMarkup

  $: if (value && $shownTranslatedMessagesStore.has(value._id)) {
    displayText = $translatedMessagesStore.get(value._id) ?? value?.message ?? EmptyMarkup
  } else {
    displayText = value?.message ?? EmptyMarkup
  }
</script>

{#if inline && object}
  {#await getDocLinkTitle(client, object._id, object._class, object) then title}
    <ActivityDocLink
      {object}
      {title}
      panelComponent={hierarchy.classHierarchyMixin(object._class, view.mixin.ObjectPanel)?.component ??
        view.component.EditDoc}
    />
  {/await}
{:else if value && !inline}
  <ActivityMessageTemplate
    message={value}
    {viewlet}
    {parentMessage}
    {person}
    socialId={socialId?.type !== 'huly' ? socialId : undefined}
    {showNotify}
    {isHighlighted}
    {isSelected}
    {shouldScroll}
    {embedded}
    withActions={withActions && !isEditing}
    actions={additionalActions}
    {showEmbedded}
    {hideFooter}
    {hoverable}
    {hoverStyles}
    {skipLabel}
    {pending}
    {stale}
    {readonly}
    excludedActions={$shownTranslatedMessagesStore.has(value._id)
      ? [chunter.action.TranslateMessage]
      : [chunter.action.ShowOriginalMessage]}
    socialIcon={socialProvider?.icon}
    showDatePreposition={hideLink}
    {inlineActions}
    {type}
    {onClick}
    {onReply}
  >
    <svelte:fragment slot="header">
      <ChatMessageHeader label={viewlet?.label} />
    </svelte:fragment>
    <svelte:fragment slot="content">
      {#if !isEditing}
        {#if withShowMore}
          <ShowMore limit={compact ? 80 : undefined}>
            <div class="clear-mins" {...!pending && { 'data-delivered': true }}>
              <MessageViewer message={displayText} />
              {#if (value.attachments ?? 0) > 0}
                <div class="mt-2" />
              {/if}
              <AttachmentDocList {value} {attachments} imageSize={attachmentImageSize} {videoPreload} {isOwn} />
            </div>
          </ShowMore>
        {:else}
          <div class="clear-mins" {...!pending && { 'data-delivered': true }}>
            <MessageViewer message={displayText} />
            {#if (value.attachments ?? 0) > 0}
              <div class="mt-2" />
            {/if}
            <AttachmentDocList {value} {attachments} imageSize={attachmentImageSize} {videoPreload} {isOwn} />
          </div>
        {/if}
      {:else if object}
        <ChatMessageInput
          bind:this={refInput}
          chatMessage={value}
          shouldSaveDraft={false}
          focusIndex={1000}
          autofocus
          {object}
          on:submit={() => {
            isEditing = false
          }}
        />
        <div class="flex-row-center gap-2 justify-end mt-2">
          <Button
            label={view.string.Cancel}
            on:click={() => {
              isEditing = false
            }}
          />
          <Button label={activity.string.Update} accent on:click={() => refInput.submit()} />
        </div>
      {/if}
    </svelte:fragment>
  </ActivityMessageTemplate>
{/if}
