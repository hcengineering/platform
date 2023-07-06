<script lang="ts">
  import { Employee } from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'
  import { ButtonKind, IconSize } from '@hcengineering/ui'
  import { PersonLabelTooltip } from '..'
  import EmployeeAttributePresenter from './EmployeeAttributePresenter.svelte'

  export let value: Ref<Employee> | Ref<Employee>[] | null | undefined
  export let kind: ButtonKind = 'link'
  export let tooltipLabels: PersonLabelTooltip | undefined = undefined
  export let onChange: ((value: Ref<Employee>) => void) | undefined = undefined
  export let colorInherit: boolean = false
  export let accent: boolean = false
  export let inline: boolean = false
  export let shouldShowName: boolean = true
  export let avatarSize: IconSize = kind === 'regular' ? 'small' : 'card'
</script>

{#if Array.isArray(value)}
  <div class="inline-content">
    {#each value as employee}
      <EmployeeAttributePresenter
        value={employee}
        {kind}
        {tooltipLabels}
        {onChange}
        {inline}
        {colorInherit}
        {accent}
        {shouldShowName}
        {avatarSize}
        on:accent-color
      />
    {/each}
  </div>
{:else}
  <EmployeeAttributePresenter
    {value}
    {kind}
    {tooltipLabels}
    {onChange}
    {inline}
    {colorInherit}
    {accent}
    {shouldShowName}
    {avatarSize}
    on:accent-color
  />
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
