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

<div bind:this={container} class="flex-presenter inline-presenter">
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
{#if value?.active === false}
  (<Label label={contact.string.Inactive} />)
{/if}
