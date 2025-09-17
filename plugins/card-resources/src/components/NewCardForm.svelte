<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { getClient, getCommunicationClient, SpaceSelector } from '@hcengineering/presentation'
  import { ModernButton, ModernEditbox, ButtonIcon, IconSend, IconMinimize } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import card from '../plugin'
  import { TypeSelector } from '../index'
  import core, { Data, generateId, Markup, Ref, getCurrentAccount } from '@hcengineering/core'
  import { Card, type CardSpace, MasterTag } from '@hcengineering/card'
  import { getResource } from '@hcengineering/platform'
  import { EmptyMarkup, markupToText, isEmptyMarkup, markupToJSON } from '@hcengineering/text'
  import { createCard } from '../utils'
  import { AttachmentStyledBox } from '@hcengineering/attachment-resources'
  import { AttachIcon } from '@hcengineering/text-editor-resources'
  import { AttachmentID, BlobParams } from '@hcengineering/communication-types'
  import { markupToMarkdown } from '@hcengineering/text-markdown'
  import textEditor, { type RefAction } from '@hcengineering/text-editor'
  import { defaultMessageInputActions } from '@hcengineering/communication-resources'
  import chat from '@hcengineering/chat'

  import EditorActions from './EditorActions.svelte'

  const dispatch = createEventDispatcher()
  const communicationClient = getCommunicationClient()

  const threadMasterTag = chat.masterTag.Thread

  export let type: Ref<MasterTag> = threadMasterTag

  let title: string = ''
  let space: Ref<CardSpace> | undefined = undefined
  let description = EmptyMarkup
  let _id = generateId<Card>()
  let isExpanded = false
  let descriptionBox: AttachmentStyledBox

  let creating = false
  $: applyDisabled = (title.trim() === '' && isEmptyMarkup(description)) || space == null || type == null || creating

  const account = getCurrentAccount()

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: extension =
    type != null
      ? client
        .getModel()
        .findAllSync(card.mixin.CreateCardExtension, {})
        .find((it) => hierarchy.isDerived(type, it._id))
      : undefined

  async function okAction (): Promise<void> {
    if (space === undefined || type == null) return

    try {
      creating = true

      const cardTitle = title.trim().length > 0 ? title.trim() : markupToText(description).slice(0, 50)
      const data: Partial<Data<Card>> = {
        title: cardTitle
      }

      if (extension?.canCreate !== undefined) {
        const fn = await getResource(extension.canCreate)
        const res = await fn(space, data)
        if (res === false) {
          return
        } else if (typeof res === 'string') {
          return
        }
      }

      const isThread = type === threadMasterTag
      const cardDescription = isThread ? EmptyMarkup : description
      const createdCard = await createCard(type, space, data, cardDescription, _id)
      if (isThread) {
        if (createdCard == null) {
          console.error('Failed to create thread card')
          return
        }
        const blobs: BlobParams[] = descriptionBox.getAttachments().map((attachment) => ({
          blobId: attachment.file,
          mimeType: attachment.type,
          fileName: attachment.name,
          size: attachment.size
        }))
        await createMessage(createdCard, description, blobs)
      } else {
        await descriptionBox.createAttachments()
      }
      if (createdCard != null) {
        dispatch('selectCard', createdCard)
      }
      clear()
    } finally {
      _id = generateId<Card>()
      creating = false
    }
  }

  async function createMessage (card: Ref<Card>, markup: Markup, blobs: BlobParams[]): Promise<void> {
    const markdown = markupToMarkdown(markupToJSON(markup))
    const { messageId } = await communicationClient.createMessage(card, type, markdown)

    if (blobs.length > 0) {
      void communicationClient.attachmentPatch<BlobParams>(card, messageId, {
        add: blobs.map((it) => ({
          id: it.blobId as any as AttachmentID,
          type: it.mimeType,
          params: it
        }))
      })
    }
  }

  function clear (): void {
    title = ''
    description = EmptyMarkup
    _id = generateId<Card>()
  }

  function expand (): void {
    const prevExpanded = isExpanded
    isExpanded = true
    if (!prevExpanded) {
      setTimeout(() => {
        descriptionBox?.focus?.()
      }, 0)
    }
  }

  const attachAction: RefAction = {
    label: textEditor.string.Attach,
    icon: AttachIcon,
    action: () => {
      dispatch('focus')
      descriptionBox.handleAttach()
    },
    order: 1000
  }
</script>

<div class="create-card rounded-form">
  {#if isExpanded}
    <div class="corner-container">
      <ButtonIcon
        icon={IconMinimize}
        size="extra-small"
        on:click={() => (isExpanded = false)}
        kind="tertiary"
        tooltip={{ label: card.string.ShowLess }}
        disabled={creating}
      />
    </div>
    <div class="form-row title">
      <ModernEditbox
        bind:value={title}
        label={card.string.CardTitle}
        size="large"
        kind="transparent"
        width="100%"
        disabled={creating}
      />
    </div>
  {/if}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="form-row description" class:collapsed={!isExpanded} on:click={expand}>
    <AttachmentStyledBox
      bind:this={descriptionBox}
      objectId={_id}
      _class={type}
      {space}
      alwaysEdit
      showButtons={true}
      bind:content={description}
      placeholder={card.string.CardContent}
      kind="indented"
      maxHeight="limited"
      isScrollable={false}
      kitOptions={{ reference: true }}
      enableAttachments={true}
      fullWidth={true}
      on:focus={() => (isExpanded = true)}
    >
      <svelte:fragment slot="actions">
        {#if isExpanded}
          <div class="form-row form-row-bottom">
            <div class="form-dropdowns">
              <SpaceSelector
                _class={card.class.CardSpace}
                query={{ archived: false, members: account.uuid }}
                label={core.string.Space}
                bind:space
                focus={false}
                readonly={creating}
                kind={'regular'}
                size={'small'}
              />
              <TypeSelector size={'small'} bind:value={type} disabled={creating} />
              <div class="spacer" />
              <div class="right-divider" />
              <EditorActions actions={[...defaultMessageInputActions, attachAction]} />
            </div>
            <ModernButton
              label={card.string.Post}
              icon={IconSend}
              iconSize="small"
              size="small"
              kind="primary"
              disabled={applyDisabled}
              loading={creating}
              on:click={okAction}
            />
          </div>
        {/if}
      </svelte:fragment>
    </AttachmentStyledBox>
  </div>
</div>

<style lang="scss">
  .corner-container {
    position: absolute;
    top: 0.75rem;
    right: 1rem;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    pointer-events: auto;
  }
  .create-card {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin: 1rem 0;
    border-radius: 1rem;
    border: 1px solid var(--theme-divider-color);
    background: var(--theme-surface-color);
    box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.04);
    padding: 1rem;
    position: relative;
  }
  .rounded-form {
    border-radius: 1rem;
  }
  .form-row {
    display: flex;
    width: 100%;
    &.title {
      z-index: 1;
    }
    &.description {
      padding-left: 0.375rem;
      margin-top: -2rem;
      padding-top: 1rem;
      width: 100%;
      max-height: 20rem;

      &.collapsed {
        margin-bottom: -1rem;
      }
    }
  }
  .form-row-bottom {
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding-top: 0.5rem;
  }
  .form-dropdowns {
    display: flex;
    gap: 0.75rem;
    flex: 1;
  }
</style>
