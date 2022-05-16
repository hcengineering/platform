<script lang="ts">
  import attachment, { Attachment } from '@anticrm/attachment'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { ChunterMessage } from '@anticrm/chunter'
  import core, { Ref, WithLookup } from '@anticrm/core'
  import contact, { Employee, EmployeeAccount, formatName } from '@anticrm/contact'
  import { getCurrentLocation, Label, navigate, Scroller } from '@anticrm/ui'
  import AttachmentPreview from '@anticrm/attachment-resources/src/components/AttachmentPreview.svelte'
  import Bookmark from './icons/Bookmark.svelte'
  import Message from './Message.svelte'
  import chunter from '../plugin'
  import { getTime } from '../utils'

  const client = getClient()
  let savedMessagesIds: Ref<ChunterMessage>[] = []
  let savedMessages: WithLookup<ChunterMessage>[] = []
  let savedAttachmentsIds: Ref<Attachment>[] = []
  let savedAttachments: WithLookup<Attachment>[] = []

  const messagesQuery = createQuery()
  const attachmentsQuery = createQuery()
  const savedMessagesQuery = createQuery()
  const savedAttachmentsQuery = createQuery()

  savedMessagesQuery.query(chunter.class.SavedMessages, {}, (res) => {
    savedMessagesIds = res.map((r) => r.attachedTo)
  })

  savedAttachmentsQuery.query(attachment.class.SavedAttachments, {}, (res) => {
    savedAttachmentsIds = res.map((r) => r.attachedTo)
  })

  $: savedMessagesIds &&
    messagesQuery.query(
      chunter.class.ChunterMessage,
      { _id: { $in: savedMessagesIds } },
      (res) => {
        savedMessages = res
      },
      {
        lookup: {
          _id: { attachments: attachment.class.Attachment },
          createBy: core.class.Account
        }
      }
    )

  $: savedAttachmentsIds &&
    attachmentsQuery.query(
      attachment.class.Attachment,
      { _id: { $in: savedAttachmentsIds } },
      (res) => {
        savedAttachments = res
      },
      {
        lookup: {
          modifiedBy: core.class.Account
        }
      }
    )

  let employees: Map<Ref<Employee>, Employee> = new Map<Ref<Employee>, Employee>()
  const employeeQuery = createQuery()

  employeeQuery.query(
    contact.class.Employee,
    {},
    (res) =>
      (employees = new Map(
        res.map((r) => {
          return [r._id, r]
        })
      )),
    {
      lookup: { _id: { statuses: contact.class.Status } }
    }
  )

  const pinnedQuery = createQuery()
  const pinnedIds: Ref<ChunterMessage>[] = []

  pinnedQuery.query(
    chunter.class.Channel,
    {},
    (res) => {
      res.forEach((ch) => pinnedIds.concat(ch?.pinned ?? []))
    },
    { limit: 1 }
  )

  function openMessage (message: ChunterMessage) {
    const loc = getCurrentLocation()

    if (message.attachedToClass === chunter.class.ChunterSpace) {
      loc.path.length = 3
      loc.path[2] = message.attachedTo
    } else if (message.attachedToClass === chunter.class.Message) {
      loc.path.length = 4
      loc.path[2] = message.space
      loc.path[3] = message.attachedTo
    }
    navigate(loc)
  }

  async function openAttachment (att: Attachment) {
    const messageId: Ref<ChunterMessage> = att.attachedTo as Ref<ChunterMessage>
    await client.findOne(chunter.class.ChunterMessage, { _id: messageId }).then((res) => {
      if (res !== undefined) openMessage(res)
    })
  }

  function getName (a: WithLookup<Attachment>): string | undefined {
    const name = (a.$lookup?.modifiedBy as EmployeeAccount).name
    if (name !== undefined) {
      return formatName(name)
    }
  }
</script>

<div class="ac-header full divide">
  <div class="ac-header__wrap-title">
    <span class="ac-header__title"><Label label={chunter.string.SavedItems} /></span>
  </div>
</div>
<Scroller>
  {#if savedMessages.length > 0 || savedAttachments.length > 0}
    {#each savedMessages as message}
      <div on:click={() => openMessage(message)}>
        <Message
          {message}
          {employees}
          on:openThread
          thread
          isPinned={pinnedIds.includes(message._id)}
          isSaved={savedMessagesIds.includes(message._id)}
          {savedAttachmentsIds}
        />
      </div>
    {/each}
    {#each savedAttachments as att}
      <div class="attachmentContainer" on:click={() => openAttachment(att)}>
        <AttachmentPreview value={att} isSaved={true} />
        <div class="label">
          <Label label={chunter.string.SharedBy} params={{ name: getName(att), time: getTime(att.modifiedOn) }} />
        </div>
      </div>
    {/each}
  {:else}
    <div class="empty">
      <Bookmark size={'large'} />
      <div class="an-element__label header">
        <Label label={chunter.string.EmptySavedHeader} />
      </div>
      <span class="an-element__label">
        <Label label={chunter.string.EmptySavedText} />
      </span>
    </div>
  {/if}
</Scroller>

<style lang="scss">
  .empty {
    display: flex;
    align-self: center;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    height: inherit;
    width: 30rem;
  }

  .header {
    font-weight: 600;
    margin: 1rem;
  }

  .attachmentContainer {
    padding: 2rem;

    &:hover {
      background-color: var(--board-card-bg-hover);
    }

    .label {
      padding-top: 1rem;
    }
  }
</style>
