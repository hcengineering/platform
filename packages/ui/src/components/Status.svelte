<script lang="ts">
  import type { Status } from '@anticrm/platform'
  import { Severity } from '@anticrm/platform'

  import Info from './icons/Info.svelte'
  import Label from './Label.svelte'

  export let status: Status
</script>

<div class="flex-center container {status.severity}">
  {#if status.severity !== Severity.OK}
    <Info size={'small'}/>
    <span><Label label={status.code} params={status.params}/></span>
  {/if}
</div>

<style lang="scss">
  .container {
    user-select: none;
    color: var(--theme-content-color);
    span { margin-left: .75em; }
    &.WARNING { color: yellow; }
    &.ERROR { color: var(--system-error-color); }
  }
</style>