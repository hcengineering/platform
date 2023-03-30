<script lang="ts">
  import { Employee } from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'
  import { ButtonKind } from '@hcengineering/ui'
  import { PersonLabelTooltip } from '..'
  import EmployeeAttributePresenter from './EmployeeAttributePresenter.svelte'

  export let value: Ref<Employee> | Ref<Employee>[] | null | undefined
  export let kind: ButtonKind = 'link'
  export let tooltipLabels: PersonLabelTooltip | undefined = undefined
  export let onChange: ((value: Ref<Employee>) => void) | undefined = undefined
  export let inline = false
</script>

{#if Array.isArray(value)}
  <div class="inline-content">
    {#each value as employee}
      <EmployeeAttributePresenter value={employee} {kind} {tooltipLabels} {onChange} {inline} />
    {/each}
  </div>
{:else}
  <EmployeeAttributePresenter {value} {kind} {tooltipLabels} {onChange} {inline} />
{/if}

<style lang="scss">
  .inline-content {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    min-width: 0;
    gap: 0.5rem;
  }
</style>
