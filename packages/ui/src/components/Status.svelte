<script lang="ts">
  import type { Status } from '@anticrm/platform'
  import { Severity } from '@anticrm/platform'

  import Info from './icons/Info.svelte'
  import Label from './Label.svelte'

  export let status: Status
</script>

<div class="flex-center overflow-label container {status.severity}">
  {#if status.severity !== Severity.OK}
    <Info size={'small'} />
    <div class="text-sm ml-2 overflow-label"><Label label={status.code} params={status.params} /></div>
  {/if}
</div>

<style lang="scss">
  .container {
    user-select: none;
    font-size: 14px;
    color: var(--theme-content-color);
    &.WARNING {
      color: yellow;
    }
    &.ERROR {
      color: var(--system-error-color);
    }
  }
</style>
