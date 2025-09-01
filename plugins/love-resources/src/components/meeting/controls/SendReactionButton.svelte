<script lang="ts">
  import emojiPlugin from '@hcengineering/emoji'
  import { ModernButton, showPopup } from '@hcengineering/ui'
  import { lk } from '../../../utils'

  export let size: 'large' | 'medium' | 'small' | 'extra-small' | 'min' = 'large'

  function addReaction (event: MouseEvent): void {
    showPopup(
      emojiPlugin.component.EmojiPopup,
      {},
      event?.target as HTMLElement,
      async (result) => {
        const emoji = result?.text
        if (emoji == null) return
        void lk.localParticipant.sendChatMessage(emoji, { topic: 'reaction' })
      },
      () => {}
    )
  }
</script>

<ModernButton icon={emojiPlugin.icon.Emoji} kind={'secondary'} {size} on:click={addReaction} />
