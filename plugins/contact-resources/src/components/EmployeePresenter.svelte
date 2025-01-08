<script lang="ts">
  import { Employee, Person } from '@hcengineering/contact'
  import { Ref, WithLookup } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import ui, { IconSize, LabelAndProps } from '@hcengineering/ui'
  import { PersonLabelTooltip, employeeByIdStore, personByIdStore } from '..'
  import PersonPresenter from '../components/PersonPresenter.svelte'
  import contact from '../plugin'
  import EmployeePreviewPopup from './EmployeePreviewPopup.svelte'

  export let value: Ref<Person> | WithLookup<Person> | null | undefined
  export let showPopup: boolean = true
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
  // export let element: HTMLElement | undefined = undefined
  export let noUnderline: boolean = false
  export let compact: boolean = false
  export let showStatus: boolean = false

  const client = getClient()
  const h = client.getHierarchy()

  $: person = typeof value === 'string' ? ($personByIdStore.get(value) as Person) : (value as Person)

  $: employeeValue = person !== undefined ? h.as(person, contact.mixin.Employee) : undefined

  $: active = employeeValue !== undefined ? $employeeByIdStore.get(employeeValue?._id)?.active ?? false : false

  function getPreviewPopup (active: boolean, value: Employee | undefined): LabelAndProps | undefined {
    if (!active || value === undefined || !showPopup) {
      return undefined
    }
    return {
      component: EmployeePreviewPopup,
      props: { employeeId: value._id },
      timeout: 300
    }
  }
</script>

<PersonPresenter
  value={employeeValue}
  {tooltipLabels}
  onEdit={onEmployeeEdit}
  customTooltip={getPreviewPopup(active, employeeValue)}
  {shouldShowAvatar}
  {shouldShowName}
  {avatarSize}
  {shouldShowPlaceholder}
  {disabled}
  {inline}
  {colorInherit}
  {accent}
  {defaultName}
  {noUnderline}
  {compact}
  showStatus={showStatus && active}
  statusLabel={!active && shouldShowName && showStatus ? contact.string.Inactive : undefined}
  on:accent-color
/>
