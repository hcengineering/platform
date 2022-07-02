<script lang="ts">
  import { Employee } from '@anticrm/contact'
  import { WithLookup } from '@anticrm/core'
  import { IntlString } from '@anticrm/platform'
  import type { AnyComponent, AnySvelteComponent } from '@anticrm/ui'
  import { showPopup } from '@anticrm/ui'
  import PersonPresenter from '../components/PersonPresenter.svelte'
  import EmployeePreviewPopup from './EmployeePreviewPopup.svelte'
  import EmployeeStatusPresenter from './EmployeeStatusPresenter.svelte'

  export let value: WithLookup<Employee> | null | undefined
  export let tooltipLabels:
    | {
        personLabel?: IntlString
        placeholderLabel?: IntlString
        component?: AnySvelteComponent | AnyComponent
        props?: any
      }
    | undefined = undefined
  export let shouldShowAvatar: boolean = true
  export let shouldShowName: boolean = true
  export let shouldShowPlaceholder = false
  export let onEmployeeEdit: ((event: MouseEvent) => void) | undefined = undefined
  export let avatarSize: 'inline' | 'tiny' | 'x-small' | 'small' | 'medium' | 'large' | 'x-large' = 'x-small'
  export let isInteractive = true
  export let inline = false

  let container: HTMLElement

  const onEdit = (evt: MouseEvent) => {
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

<div bind:this={container} class="inline-flex clear-mins">
  <div class:over-underline={!inline}>
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
    />
  </div>
  {#if value?.$lookup?.statuses?.length}
    <div class="pl-2 status content-color">
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
