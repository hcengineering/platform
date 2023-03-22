<script lang="ts">
  import attachment, { Attachment } from '@hcengineering/attachment'
  import { AttachmentPreview } from '@hcengineering/attachment-resources'
  import { ChunterMessage } from '@hcengineering/chunter'
  import contact, { EmployeeAccount, getName as getContactName } from '@hcengineering/contact'
  import { employeeByIdStore } from '@hcengineering/contact-resources'
  import core, { IdMap, Ref, toIdMap, WithLookup } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Label, Scroller } from '@hcengineering/ui'
  import chunter from '../plugin'
  import { getTime, openMessageFromSpecial } from '../utils'
  import Bookmark from './icons/Bookmark.svelte'
  import Message from './Message.svelte'

  const client = getClient()
  let savedMessagesIds: Ref<ChunterMessage>[] = []
  let savedMessages: WithLookup<ChunterMessage>[] = []
  let savedAttachmentsIds: Ref<Attachment>[] = []
  let savedAttachments: WithLookup<Attachment>[] = []
  let accounts: IdMap<EmployeeAccount> = new Map()

  const messagesQuery = createQuery()
  const attachmentsQuery = createQuery()
  const savedMessagesQuery = createQuery()
  const savedAttachmentsQuery = createQuery()
  const accQ = createQuery()

  accQ.query(contact.class.EmployeeAccount, {}, (res) => (accounts = toIdMap(res)))

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
    attachmentsQuery.query(attachment.class.Attachment, { _id: { $in: savedAttachmentsIds } }, (res) => {
      savedAttachments = res
    })

  const pinnedQuery = createQuery()
  const pinnedIds: Ref<ChunterMessage>[] = []

  pinnedQuery.query(
    chunter.class.Channel,
    {},
    (res) => {
      res.forEach((ch) => {
        if (ch.pinned) {
          pinnedIds.push(...ch.pinned)
        }
      })
    },
    {}
  )

  async function openAttachment (att: Attachment) {
    const messageId: Ref<ChunterMessage> = att.attachedTo as Ref<ChunterMessage>
    await client.findOne(chunter.class.ChunterMessage, { _id: messageId }).then((res) => {
      if (res !== undefined) openMessageFromSpecial(res)
    })
  }

  function getName (a: Attachment): string | undefined {
    const acc = accounts.get(a.modifiedBy as Ref<EmployeeAccount>)
    if (acc !== undefined) {
      const emp = $employeeByIdStore.get(acc?.employee)
      if (emp !== undefined) {
        return getContactName(emp)
      }
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
      <div on:click={() => openMessageFromSpecial(message)}>
        <Message
          {message}
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
