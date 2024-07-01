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
  import { Person, PersonAccount } from '@hcengineering/contact'
  import { personAccountByIdStore, personByIdStore } from '@hcengineering/contact-resources'
  import { Class, Doc, getCurrentAccount, Ref, WithLookup } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { AttachmentImageSize } from '@hcengineering/attachment-resources'
  import { getDocLinkTitle } from '@hcengineering/view-resources'
  import { Action, AnySvelteComponent, Icon, IconEdit } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import activity, { ActivityMessageViewType, DisplayActivityMessage } from '@hcengineering/activity'
  import { ActivityDocLink, ActivityMessageTemplate } from '@hcengineering/activity-resources'
  import chunter, { ChatExtension, ChatMessage, ChatMessageViewlet } from '@hcengineering/chunter'
  import { Attachment } from '@hcengineering/attachment'
  import { Asset } from '@hcengineering/platform'

  import ChatMessageHeader from './ChatMessageHeader.svelte'
  import { getMessageExtension, hulyChannelId } from '../../utils'
  import ChatMessageContent from './ChatMessageContent.svelte'

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
  export let hoverStyles: 'borderedHover' | 'filledHover' = 'borderedHover'
  export let withShowMore: boolean = true
  export let attachmentImageSize: AttachmentImageSize = 'auto'
  export let showLinksPreview = true
  export let videoPreload = true
  export let type: ActivityMessageViewType = 'default'
  export let typeIcon: Asset | AnySvelteComponent | undefined = undefined
  export let shortTime = false
  export let onClick: (() => void) | undefined = undefined

  const client = getClient()
  const { pendingCreatedDocs } = client
  const hierarchy = client.getHierarchy()
  const STALE_TIMEOUT_MS = 5000

  const currentAccount = getCurrentAccount()

  let user: PersonAccount | undefined = undefined
  let person: Person | undefined = undefined

  let parentMessage: DisplayActivityMessage | undefined = undefined
  let parentObject: Doc | undefined
  let object: Doc | undefined

  let viewlet: ChatMessageViewlet | undefined
  ;[viewlet] = value
    ? client.getModel().findAllSync(chunter.class.ChatMessageViewlet, {
      objectClass: value.attachedToClass,
      messageClass: value._class
    })
    : []

  $: user = $personAccountByIdStore.get(value?.createdBy ?? (value?.modifiedBy as any))
  $: person = user ? $personByIdStore.get(user.person) : undefined

  $: value &&
    getParentMessage(value.attachedToClass, value.attachedTo).then((res) => {
      parentMessage = res as DisplayActivityMessage
    })

  $: if (doc && value?.attachedTo === doc._id) {
    object = doc
  } else if (value) {
    void client.findOne(value.attachedToClass, { _id: value.attachedTo }).then((result) => {
      object = result
    })
  }

  $: parentMessage &&
    client.findOne(parentMessage.attachedToClass, { _id: parentMessage.attachedTo }).then((result) => {
      parentObject = result
    })

  $: links = showLinksPreview ? getLinks(value?.message) : []

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

  function getLinks (content?: string): HTMLLinkElement[] {
    if (!content) {
      return []
    }
    const parser = new DOMParser()
    const parent = parser.parseFromString(content, 'text/html').firstChild?.childNodes[1] as HTMLElement
    return parseLinks(parent.childNodes)
  }

  function parseLinks (nodes: NodeListOf<ChildNode>): HTMLLinkElement[] {
    const res: HTMLLinkElement[] = []
    nodes.forEach((node) => {
      if (node.nodeType !== Node.TEXT_NODE) {
        if (node.nodeName === 'A') {
          res.push(node as HTMLLinkElement)
        }
        res.push(...parseLinks(node.childNodes))
      }
    })
    return res
  }

  async function getParentMessage (_class: Ref<Class<Doc>>, _id: Ref<Doc>) {
    if (hierarchy.isDerived(_class, activity.class.ActivityMessage)) {
      return await client.findOne(_class, { _id })
    }
  }

  async function handleEditAction () {
    isEditing = true
  }

  let isEditing = false
  let additionalActions: Action[] = []

  let extension: ChatExtension | undefined = undefined

  $: getMessageExtension(value).then((res) => {
    extension = res
  })

  $: isOwn = user !== undefined && user._id === currentAccount._id
  $: isEditable = isOwn && (extension === undefined || extension.options.editable)

  $: additionalActions = isEditable
    ? [
        {
          label: activity.string.Edit,
          icon: IconEdit,
          group: 'edit',
          action: handleEditAction
        },
        ...actions
      ]
    : actions

  let attachments: Attachment[] = []
  $: attachments = (value?.$lookup?.attachments ?? []) as Attachment[]

  function handleSubmit () {
    isEditing = false
  }

  function handleEditCancel () {
    isEditing = false
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
    showDatePreposition={viewlet?.label !== undefined}
    {shortTime}
    {type}
    {onClick}
  >
    <svelte:fragment slot="avatar">
      {#if typeIcon !== undefined}
        <div class="typeMarker">
          <Icon icon={typeIcon} size="xx-small" />
        </div>
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="header">
      {#if $$slots.header}
        <slot name="header" {object} />
      {:else}
        <ChatMessageHeader message={value} {viewlet} {skipLabel} />
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="content">
      {#if $$slots.content}
        <slot name="content" {object} {isEditing} onSubmit={handleSubmit} onCancel={handleEditCancel} />
      {:else}
        <ChatMessageContent
          {value}
          message={value.message}
          {object}
          {isEditing}
          {videoPreload}
          {attachmentImageSize}
          {attachments}
          {links}
          {withShowMore}
          externalChannel={hulyChannelId}
          on:submit={handleSubmit}
          on:cancel={handleEditCancel}
        />
      {/if}
    </svelte:fragment>
  </ActivityMessageTemplate>
{/if}

<style lang="scss">
  .typeMarker {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    padding: var(--spacing-1);
    border-radius: 50%;
    background: var(--theme-bg-color);
    border: 1px solid var(--global-ui-BorderColor);
    bottom: -0.375rem;
    right: -0.625rem;
    color: var(--content-color);
  }
</style>
