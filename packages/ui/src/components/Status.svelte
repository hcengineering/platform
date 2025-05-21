<script lang="ts">
  import type { Status } from '@hcengineering/platform'
  import { Severity } from '@hcengineering/platform'

  import Info from './icons/Info.svelte'
  import Label from './Label.svelte'
  import { AccountRole, getCurrentAccount } from '@hcengineering/core'
  import ui from '../plugin'

  export let status: Status
  export let overflow: boolean = true

  const account = getCurrentAccount()
  $: isReadOnly = account?.role === AccountRole.ReadOnlyGuest
</script>

{#if isReadOnly}
  <div class="flex-center container {Severity.INFO}" class:overflow-label={overflow}>
    <Info size={'small'} />
    <span class="text-sm ml-2" class:overflow-label={overflow}>
      <Label label={ui.string.ReadOnlyModeWarning} />
    </span>
  </div>
{:else}
  <div class="flex-center container {status.severity}" class:overflow-label={overflow}>
    {#if status.severity !== Severity.OK}
      <Info size={'small'} />
      <span class="text-sm ml-2" class:overflow-label={overflow}>
        <Label label={status.code} params={status.params} />
      </span>
    {/if}
  </div>
{/if}

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
