<script lang="ts">
  import type { Status } from '@anticrm/platform'
  import { Severity } from '@anticrm/platform'

  import Info from './icons/Info.svelte'
  import Label from './Label.svelte'

  export let status: Status
  export let overflow: boolean = true
</script>

<div class="flex-center container {status.severity}" class:overflow-label={overflow}>
  {#if status.severity !== Severity.OK}
    <Info size={'small'} />
    <div class="text-sm ml-2" class:overflow-label={overflow}><Label label={status.code} params={status.params} /></div>
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
