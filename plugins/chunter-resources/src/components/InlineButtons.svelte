<script lang="ts">
  import { ModernButton } from '@hcengineering/ui'
  import chunter, { ChatMessage, InlineButton } from '@hcengineering/chunter'
  import presentation, { createQuery } from '@hcengineering/presentation'
  import { getMetadata } from '@hcengineering/platform'

  export let value: ChatMessage
  export let inlineButtons: InlineButton[] = []

  const query = createQuery()

  $: if ((value.inlineButtons ?? 0) > 0 && inlineButtons.length === 0) {
    query.query(chunter.class.InlineButton, { attachedTo: value._id, space: value.space }, (res) => {
      inlineButtons = res
    })
  } else {
    query.unsubscribe()
  }

  async function handleInlineButtonClick (button: InlineButton): Promise<void> {
    const token = getMetadata(presentation.metadata.Token) ?? ''

    if (token === '') {
      return
    }
    try {
      await fetch(button.url, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ _id: button._id, name: button.name, messageId: value._id, channelId: value.attachedTo })
      })
    } catch (e) {
      console.error(e)
    }
  }
</script>

{#each inlineButtons as button}
  <ModernButton
    title={button.title}
    label={button.titleIntl}
    size="small"
    on:click={() => {
      void handleInlineButtonClick(button)
    }}
  />
{/each}
