<script lang="ts">
  import type { Status } from '@anticrm/platform'
  import { Severity } from '@anticrm/platform'

  import Info from './icons/Info.svelte'
  import Label from '../Label.svelte'

  export let status: Status
</script>

<div class="status">
  {#if status.severity !== Severity.OK}
    <Info size={'small'}/>
  {/if}
  {#if status.severity !== Severity.OK}
    <span><Label label={status.code} params={status.params}/></span>
  {/if}
</div>

<style lang="scss">
  .status {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 11px;
    opacity: .3;
    user-select: none;

    span {
      margin-left: 8px;
    }
    &:hover {
      opacity: 1;
    }
  }
</style>