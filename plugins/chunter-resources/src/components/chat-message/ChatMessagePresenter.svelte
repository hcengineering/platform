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
  import { personByIdStore } from '@hcengineering/contact-resources'
  import core, { Account, Class, Doc, getCurrentAccount, Ref, WithLookup } from '@hcengineering/core'
  import { createQuery, getClient, MessageViewer } from '@hcengineering/presentation'
  import { AttachmentDocList, AttachmentImageSize } from '@hcengineering/attachment-resources'
  import { getDocLinkTitle, LinkPresenter } from '@hcengineering/view-resources'
  import { Action, Button, IconEdit, ShowMore } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import activity, { DisplayActivityMessage } from '@hcengineering/activity'
  import { ActivityDocLink, ActivityMessageTemplate } from '@hcengineering/activity-resources'
  import chunter, { ChatMessage, ChatMessageViewlet } from '@hcengineering/chunter'
  import { Attachment } from '@hcengineering/attachment'

  import ChatMessageHeader from './ChatMessageHeader.svelte'
  import ChatMessageInput from './ChatMessageInput.svelte'

  export let value: WithLookup<ChatMessage> | undefined
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
  export let hideLink = false
  export let compact = false
  export let onClick: (() => void) | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const userQuery = createQuery()
  const currentAccount = getCurrentAccount()

  let user: PersonAccount | undefined = undefined
  let person: Person | undefined = undefined

  let parentMessage: DisplayActivityMessage | undefined = undefined
  let parentObject: Doc | undefined
  let object: Doc | undefined

  let refInput: ChatMessageInput

  let viewlet: ChatMessageViewlet | undefined
  ;[viewlet] = value
    ? client.getModel().findAllSync(chunter.class.ChatMessageViewlet, {
      objectClass: value.attachedToClass,
      messageClass: value._class
    })
    : []

  $: value &&
    userQuery.query(core.class.Account, { _id: value.createdBy }, (res: Account[]) => {
      user = res[0] as PersonAccount
    })

  $: person = user?.person && $personByIdStore.get(user.person)

  $: value &&
    getParentMessage(value.attachedToClass, value.attachedTo).then((res) => {
      parentMessage = res as DisplayActivityMessage
    })

  $: value &&
    client.findOne(value.attachedToClass, { _id: value.attachedTo }).then((result) => {
      object = result
    })

  $: parentMessage &&
    client.findOne(parentMessage.attachedToClass, { _id: parentMessage.attachedTo }).then((result) => {
      parentObject = result
    })

  $: links = showLinksPreview ? getLinks(value?.message) : []

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

  $: isOwn = user !== undefined && user._id === currentAccount._id

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
    showDatePreposition={hideLink}
    {onClick}
  >
    <svelte:fragment slot="header">
      <ChatMessageHeader {object} {parentObject} message={value} {viewlet} {person} {skipLabel} {hideLink} />
    </svelte:fragment>
    <svelte:fragment slot="content">
      {#if !isEditing}
        {#if withShowMore}
          <ShowMore limit={compact ? 80 : undefined}>
            <div class="clear-mins">
              <MessageViewer message={value.message} />
              <AttachmentDocList {value} {attachments} imageSize={attachmentImageSize} {videoPreload} />
              {#each links as link}
                <LinkPresenter {link} />
              {/each}
            </div>
          </ShowMore>
        {:else}
          <div class="clear-mins">
            <MessageViewer message={value.message} />
            <AttachmentDocList {value} {attachments} imageSize={attachmentImageSize} {videoPreload} />
            {#each links as link}
              <LinkPresenter {link} />
            {/each}
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
