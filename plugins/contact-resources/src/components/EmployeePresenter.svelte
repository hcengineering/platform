<script lang="ts">
  import { Employee } from '@anticrm/contact'
  import EmployeeStatusPresenter from './EmployeeStatusPresenter.svelte'
  import PersonPresenter from '../components/PersonPresenter.svelte'
  import { showPopup } from '@anticrm/ui'
  import EmployeePreviewPopup from './EmployeePreviewPopup.svelte'
  import { WithLookup } from '@anticrm/core'
  import { IntlString } from '@anticrm/platform'

  export let value: WithLookup<Employee> | null | undefined
  export let tooltipLabels: { personLabel: IntlString; placeholderLabel?: IntlString } | undefined = undefined
  export let shouldShowAvatar: boolean = true
  export let shouldShowName: boolean = true
  export let shouldShowPlaceholder = false
  export let onEmployeeEdit: ((event: MouseEvent) => void) | undefined = undefined

  let container: HTMLElement

  const onEdit = () => {
    if (value) {
      showPopup(
        EmployeePreviewPopup,
        {
          employeeId: value._id
        },
        container
      )
    }
  }

  $: handlePersonEdit = onEmployeeEdit ?? onEdit
</script>

<div bind:this={container} class="flex-row-center clear-mins">
  <div class="over-underline" class:pr-2={shouldShowName}>
    <PersonPresenter
      {value}
      {tooltipLabels}
      onEdit={handlePersonEdit}
      {shouldShowAvatar}
      {shouldShowName}
      {shouldShowPlaceholder}
    />
  </div>
  {#if value?.$lookup?.statuses?.length}
    <div class="status content-color">
      <EmployeeStatusPresenter employee={value} />
    </div>
  {/if}
</div>

<style lang="scss">
  .status {
    font-weight: 400;
    font-size: 0.875rem;
  }
</style>
