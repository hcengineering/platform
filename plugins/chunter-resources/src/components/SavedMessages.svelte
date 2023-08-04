<script lang="ts">
  import attachment, { Attachment } from '@hcengineering/attachment'
  import { AttachmentPreview } from '@hcengineering/attachment-resources'
  import { ChunterMessage } from '@hcengineering/chunter'
  import { Person, PersonAccount, getName as getContactName } from '@hcengineering/contact'
  import { personAccountByIdStore, personByIdStore } from '@hcengineering/contact-resources'
  import core, { IdMap, Ref, WithLookup } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Label, Scroller } from '@hcengineering/ui'
  import chunter from '../plugin'
  import { getTime, openMessageFromSpecial } from '../utils'
  import Message from './Message.svelte'
  import Bookmark from './icons/Bookmark.svelte'

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

  function getName (
    a: Attachment,
    personAccountByIdStore: IdMap<PersonAccount>,
    personByIdStore: IdMap<Person>
  ): string | undefined {
    const acc = personAccountByIdStore.get(a.modifiedBy as Ref<PersonAccount>)
    if (acc !== undefined) {
      const emp = personByIdStore.get(acc?.person)
      if (emp !== undefined) {
        return getContactName(client.getHierarchy(), emp)
      }
    }
  }
</script>

<div class="ac-header full divide caption-height">
  <div class="ac-header__wrap-title">
    <span class="ac-header__title"><Label label={chunter.string.SavedItems} /></span>
  </div>
</div>
<Scroller>
  {#if savedMessages.length > 0 || savedAttachments.length > 0}
    {#each savedMessages as message}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="clear-mins flex-no-shrink" on:click={() => openMessageFromSpecial(message)}>
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
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="attachmentContainer flex-no-shrink clear-mins" on:click={() => openAttachment(att)}>
        <AttachmentPreview value={att} isSaved={true} />
        <div class="label">
          <Label
            label={chunter.string.SharedBy}
            params={{ name: getName(att, $personAccountByIdStore, $personByIdStore), time: getTime(att.modifiedOn) }}
          />
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
      background-color: var(--highlight-hover);
    }

    .label {
      padding-top: 1rem;
    }
  }
</style>
