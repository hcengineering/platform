<script lang="ts">
  import { Employee } from '@hcengineering/contact'
  import { WithLookup } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { showPopup } from '@hcengineering/ui'
  import { PersonLabelTooltip } from '..'
  import PersonPresenter from '../components/PersonPresenter.svelte'
  import EmployeePreviewPopup from './EmployeePreviewPopup.svelte'
  import EmployeeStatusPresenter from './EmployeeStatusPresenter.svelte'

  export let value: WithLookup<Employee> | null | undefined
  export let tooltipLabels: PersonLabelTooltip | undefined = undefined
  export let shouldShowAvatar: boolean = true
  export let shouldShowName: boolean = true
  export let shouldShowPlaceholder = false
  export let onEmployeeEdit: ((event: MouseEvent) => void) | undefined = undefined
  export let avatarSize: 'inline' | 'tiny' | 'x-small' | 'small' | 'medium' | 'large' | 'x-large' = 'x-small'
  export let isInteractive = true
  export let inline = false
  export let disableClick = false
  export let defaultName: IntlString | undefined = undefined

  let container: HTMLElement

  const onEdit = (evt: MouseEvent) => {
    if (disableClick) {
      return
    }
    evt?.preventDefault()
    evt?.stopPropagation()
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

<div bind:this={container}>
  <PersonPresenter
    {value}
    {tooltipLabels}
    onEdit={isInteractive ? handlePersonEdit : () => {}}
    {shouldShowAvatar}
    {shouldShowName}
    {avatarSize}
    {shouldShowPlaceholder}
    {isInteractive}
    {inline}
    {defaultName}
  />
</div>
{#if value?.$lookup?.statuses?.length}
  <div class="pl-2 status content-color">
    <EmployeeStatusPresenter employee={value} />
  </div>
{/if}

<style lang="scss">
  .status {
    font-weight: 400;
    font-size: 0.875rem;
  }
</style>
