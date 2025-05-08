<script lang="ts">
  import { themeStore } from '@hcengineering/theme'
  import { updateEmojis } from '../utils'
  import emojiPlugin, { CustomEmoji } from '@hcengineering/emoji'
  import { createQuery, getBlobRef } from '@hcengineering/presentation'
  let parentElement: HTMLDivElement

  const customEmojisQuery = createQuery()
  let customEmojis: CustomEmoji[] = []
  $: customEmojisQuery.query(emojiPlugin.class.CustomEmoji, {}, (res) => {
    customEmojis = res
    console.log(customEmojis)
  })

  $: void updateEmojis($themeStore.language)
</script>

<div bind:this={parentElement} class="hidden"></div>
