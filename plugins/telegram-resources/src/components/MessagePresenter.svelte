<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { TelegramChatMessage, TelegramChannelMessage, TelegramMessageStatus } from '@hcengineering/telegram'
  import { Doc, getCurrentAccount, Ref, WithLookup } from '@hcengineering/core'
  import { Action, Icon, IconCheckmark, Label, Spinner } from '@hcengineering/ui'
  import { AttachmentImageSize } from '@hcengineering/attachment-resources'
  import { ActivityMessageViewType } from '@hcengineering/activity'
  import { ChatMessageContent, ChatMessagePresenter } from '@hcengineering/chunter-resources'
  import notification from '@hcengineering/notification'
  import { createQuery } from '@hcengineering/presentation'
  import attachment, { Attachment } from '@hcengineering/attachment'

  import TelegramIcon from './icons/Telegram.svelte'
  import telegram from '../plugin'

  export let value: WithLookup<TelegramChatMessage> | undefined
  export let doc: Doc | undefined = undefined
  export let isHighlighted: boolean = false
  export let isSelected: boolean = false
  export let shouldScroll: boolean = false
  export let actions: Action[] = []
  export let attachmentImageSize: AttachmentImageSize = 'x-large'
  export let showLinksPreview = true
  export let type: ActivityMessageViewType = 'default'
  export let embedded = false
  export let onClick: (() => void) | undefined = undefined

  const me = getCurrentAccount()
  const channelMessageQuery = createQuery()

  let channelMessage: WithLookup<TelegramChannelMessage> | undefined = undefined

  $: if (value && value?.$lookup?.channelMessage === undefined) {
    channelMessageQuery.query(
      telegram.class.TelegramChannelMessage,
      { _id: value.channelMessage as Ref<TelegramChannelMessage> },
      (res) => {
        channelMessage = res[0]
      },
      { lookup: { _id: { attachments: attachment.class.Attachment } } }
    )
  } else {
    channelMessage = value?.$lookup?.channelMessage as WithLookup<TelegramChannelMessage>
    channelMessageQuery.unsubscribe()
  }

  let attachments: Attachment[] = []
  $: attachments = (channelMessage?.$lookup?.attachments ?? []) as Attachment[]
</script>

{#if value && channelMessage}
  <ChatMessagePresenter
    {value}
    {doc}
    {isHighlighted}
    {isSelected}
    {shouldScroll}
    {actions}
    hoverable
    hoverStyles="filledHover"
    {attachmentImageSize}
    {showLinksPreview}
    {embedded}
    {type}
    withShowMore={false}
    skipLabel={false}
    typeIcon={TelegramIcon}
    {onClick}
  >
    <svelte:fragment slot="header">
      {#if me._id === value.createdBy && !embedded}
        {@const status = channelMessage.status}
        {#if status === TelegramMessageStatus.Sent}
          <span class="status">
            <Icon icon={IconCheckmark} size="x-small" />
          </span>
        {:else if status === TelegramMessageStatus.New}
          <span class="status">
            <Spinner size="xx-small" />
          </span>
        {/if}
      {/if}

      {#if channelMessage?.editedOn}
        <span class="text-sm lower"><Label label={notification.string.Edited} /></span>
      {/if}
    </svelte:fragment>

    <svelte:fragment slot="content" let:object let:isEditing let:onSubmit let:onCancel>
      <ChatMessageContent
        {value}
        attachmentsDoc={channelMessage}
        message={channelMessage?.content ?? ''}
        {object}
        {isEditing}
        {attachments}
        externalChannel={value.channelId}
        on:submit={onSubmit}
        on:cancel={onCancel}
      />
    </svelte:fragment>
  </ChatMessagePresenter>
{/if}

<style lang="scss">
  .status {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    margin-left: 0.25rem;
  }

  span {
    margin-left: 0.25rem;
    font-weight: 400;
    line-height: 1.25rem;
  }
</style>
