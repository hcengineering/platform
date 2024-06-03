<!--
  Copyright © 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import { EditBox } from '@hcengineering/ui'

  export let value: string
  export let readonly = false

  let editBox: EditBox | undefined = undefined
  export function focus (): void {
    if (editBox) {
      editBox.focus()
    }
  }
</script>

{#if readonly}
  {value}
{:else}
  <EditBox
    bind:this={editBox}
    kind="editbox"
    fullSize
    bind:value
    on:value
    on:change
    on:input
    on:keydown
    disabled={readonly}
  />
{/if}
