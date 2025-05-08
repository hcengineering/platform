<script lang="ts">
  import { themeStore } from '@hcengineering/theme'
  import { updateCustomEmojis, updateUnicodeEmojis } from '../utils'
  import emojiPlugin from '@hcengineering/emoji'
  import { createQuery } from '@hcengineering/presentation'
  let parentElement: HTMLDivElement

  const customEmojisQuery = createQuery()
  $: customEmojisQuery.query(emojiPlugin.class.CustomEmoji, {}, (res) => {
    updateCustomEmojis(res)
  })

  $: void updateUnicodeEmojis($themeStore.language)
</script>

<div bind:this={parentElement} class="hidden"></div>
