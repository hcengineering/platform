<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { getBlobRef } from '@hcengineering/presentation'
  import { getEmojiByShortCode } from '@hcengineering/emoji-resources'
  import { isCustomEmoji } from '@hcengineering/emoji'

  export let emoji: string = ''
  export let width: number = 0
  export let height: number = 0
  export let duration: number = 2000

  const dispatch = createEventDispatcher()

  let offsetX: number = 0
  let isVisible: boolean = false
  let x: number = 0
  let size: number = 0

  $: customEmoji = getEmojiByShortCode(emoji)

  onMount(() => {
    offsetX = (Math.random() * width) / 4 - width / 8
    size = height / 4
    x = width / 2 - size / 2
    isVisible = true
    setTimeout(() => {
      isVisible = false
      dispatch('complete')
    }, duration)
  })
</script>

{#if isVisible}
  <div
    class="reaction"
    style="
      left: {x}px;
      font-size: {size}px;
      --x-offset: {offsetX}px;
      --duration: {duration}ms;
    "
  >
    {#if customEmoji !== undefined && isCustomEmoji(customEmoji)}
      <span class="emoji">
        {#await getBlobRef(customEmoji.image) then blobSrc}
          <img src={blobSrc.src} alt={emoji} />
        {/await}
      </span>
    {:else}
      {emoji}
    {/if}
  </div>
{/if}

<style lang="scss">
  .reaction {
    position: absolute;
    bottom: 0px;
    pointer-events: none;
    z-index: 100;
    opacity: 1;
    animation: floatUp var(--duration) ease-out forwards;
    will-change: transform, opacity;
    transform: translateZ(0);
  }

  @keyframes floatUp {
    0% {
      transform: translate3d(0, 0, 0) scale(1);
      opacity: 1;
    }
    100% {
      transform: translate3d(var(--x-offset), -100px, 0) scale(1.5);
      opacity: 0;
    }
  }
</style>
