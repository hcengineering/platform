<script lang="ts">
  import { Employee } from '@hcengineering/contact'
  import { WithLookup } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { Label, showPopup } from '@hcengineering/ui'
  import { PersonLabelTooltip } from '..'
  import PersonPresenter from '../components/PersonPresenter.svelte'
  import contact from '../plugin'
  import EmployeePreviewPopup from './EmployeePreviewPopup.svelte'

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
  export let element: HTMLElement | undefined = undefined

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
        element
      )
    }
  }

  $: handlePersonEdit = onEmployeeEdit ?? onEdit
</script>

<PersonPresenter
  bind:element
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
{#if value?.active === false}
  <div class="status ml-1">
    (<Label label={contact.string.Inactive} />)
  </div>
{/if}

<style lang="scss">
  .status {
    font-weight: 400;
    font-size: 0.875rem;
  }
</style>
