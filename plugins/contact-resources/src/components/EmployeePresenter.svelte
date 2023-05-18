<script lang="ts">
  import { Employee } from '@hcengineering/contact'
  import { Ref, WithLookup } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import ui, { IconSize } from '@hcengineering/ui'
  import { PersonLabelTooltip, employeeByIdStore } from '..'
  import PersonPresenter from '../components/PersonPresenter.svelte'
  import contact from '../plugin'

  export let value: Ref<Employee> | WithLookup<Employee> | null | undefined
  export let tooltipLabels: PersonLabelTooltip | undefined = undefined
  export let shouldShowAvatar: boolean = true
  export let shouldShowName: boolean = true
  export let shouldShowPlaceholder = false
  export let onEmployeeEdit: ((event: MouseEvent) => void) | undefined = undefined
  export let avatarSize: IconSize = 'x-small'
  export let disabled = false
  export let inline = false
  export let colorInherit: boolean = false
  export let accent: boolean = false
  export let defaultName: IntlString | undefined = ui.string.NotSelected
  export let element: HTMLElement | undefined = undefined

  $: employeeValue = typeof value === 'string' ? $employeeByIdStore.get(value) : value
</script>

<PersonPresenter
  bind:element
  value={employeeValue}
  {tooltipLabels}
  onEdit={onEmployeeEdit}
  {shouldShowAvatar}
  {shouldShowName}
  {avatarSize}
  {shouldShowPlaceholder}
  {disabled}
  {inline}
  {colorInherit}
  {accent}
  {defaultName}
  statusLabel={employeeValue?.active === false && shouldShowName ? contact.string.Inactive : undefined}
  on:accent-color
/>
