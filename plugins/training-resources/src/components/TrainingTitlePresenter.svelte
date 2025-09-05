<!--
  Copyright © 2023 Hardcore Engineering Inc.
-->

<script lang="ts">
  import { type Training } from '@hcengineering/training'
  import { DocNavLink } from '@hcengineering/view-resources'

  export let value: Training
  export let disabled: boolean = false
  export let accent: boolean = false
</script>

{#if value}
  <div class="content-halfcontent-color">
    <DocNavLink object={value} {disabled} noOverflow accent>
      <span class="whitespace-nowrap" class:fs-bold={accent}>
        {value.title}
      </span>
    </DocNavLink>
  </div>
{/if}
