<script lang="ts">
  import type { Status } from '@anticrm/platform'
  import { Severity } from '@anticrm/platform'

  import Info from './icons/Info.svelte'
  import InfoOld from './icons/InfoOld.svelte'
  import Label from '../Label.svelte'

  export let status: Status
</script>

<div class="container">
  {#if status.severity !== Severity.OK}
  <Info size={'small'}/>
  <InfoOld size={'small'}/>
  <InfoOld size={'small'}/>
  <span><Label label={status.code} params={status.params}/></span>
  {/if}
</div>

<style lang="scss">
  .container {
    display: inline-grid;
    grid-auto-flow: column;
    column-gap: .75em;
    user-select: none;
    span {
      color: var(--theme-content-accent-color);
    }
  }
</style>