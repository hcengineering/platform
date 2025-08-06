<script lang="ts">
  import type { Status } from '@hcengineering/platform'
  import { tooltip as tp } from '../tooltips'
  import type { LabelAndProps } from '../types'

  export let status: Status
  export let overflow: boolean = true
  export let multicolor: boolean = true
  export let tooltip: LabelAndProps | undefined = undefined
</script>

<div class="flex-center container {status.severity}" class:overflow-label={overflow} class:multicolor use:tp={tooltip}>
  <div class="status-circle"></div>
</div>

<style lang="scss">
  .container {
    user-select: none;
    color: var(--theme-content-color);
    &.OK {
      color: var(--theme-state-positive-color);
    }
    &.WARNING {
      color: var(--theme-warning-color);
    }
    &.ERROR {
      color: var(--theme-state-negative-color);
    }
  }

  .status-circle {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background-color: currentColor;
  }
</style>
