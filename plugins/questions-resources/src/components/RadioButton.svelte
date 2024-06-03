<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import { RadioButton } from '@hcengineering/ui'
  import type { ComponentProps } from 'svelte'

  /**
   * Tiny wrapper around default RadioButton that fixes label padding issues
   */

  type $$Props = ComponentProps<RadioButton>
  $: ({ ...rest } = $$props as $$Props)
</script>

<span class="radio">
  <RadioButton {...rest} label={undefined} labelIntl={undefined} labelGap="medium" />
</span>

<style lang="scss">
  .radio {
    display: flex;

    :global(label) {
      display: none;
    }
  }
</style>
