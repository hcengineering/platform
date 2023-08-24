<script lang="ts">
  import { AttachmentRefInput } from '@hcengineering/attachment-resources'
  import chunter, { DirectMessage, Message, getDirectChannel } from '@hcengineering/chunter'
  import { PersonAccount } from '@hcengineering/contact'
  import { Ref, generateId, getCurrentAccount } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'

  export let account: PersonAccount
  export let loading: boolean = true

  const client = getClient()

  const me = getCurrentAccount()._id

  const _class = chunter.class.Message
  let messageId = generateId() as Ref<Message>

  let space: Ref<DirectMessage> | undefined

  $: _getDirectChannel(account?._id)
  async function _getDirectChannel (account?: Ref<PersonAccount>): Promise<void> {
    if (account === undefined) {
      return
    }

    space = await getDirectChannel(client, me as Ref<PersonAccount>, account)
  }

  async function onMessage (event: CustomEvent) {
    if (space === undefined) {
      return
    }

    const { message, attachments } = event.detail
    await client.addCollection(
      _class,
      space,
      space,
      chunter.class.DirectMessage,
      'messages',
      {
        content: message,
        createBy: me,
        attachments
      },
      messageId
    )

    messageId = generateId()
  }
</script>

{#if space !== undefined}
  <div class="reference">
    <AttachmentRefInput bind:loading {space} {_class} objectId={messageId} on:message={onMessage} />
  </div>
{/if}

<style lang="scss">
  .reference {
    margin: 1.25rem 2.5rem;
  }
</style>
