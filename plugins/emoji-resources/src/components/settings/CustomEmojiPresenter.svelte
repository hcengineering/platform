<script lang="ts">
  import { Ref, Blob } from '@hcengineering/core'

  import { getBlobRef } from '@hcengineering/presentation'

  export let value: Ref<Blob> | undefined
</script>

{#await getBlobRef(value) then image}
  <span class="emoji emojiOnly"><img src={image.src} alt='test' /></span>
{/await}

<style lang="scss">
  .emojiOnly {
    font-size: 2rem;
    line-height: 115%;
  }
</style>
