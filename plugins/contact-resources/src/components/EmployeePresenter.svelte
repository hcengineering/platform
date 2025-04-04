<script lang="ts">
  import { Person } from '@hcengineering/contact'
  import { Ref, WithLookup } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import ui, { IconSize } from '@hcengineering/ui'
  import { PersonLabelTooltip, personByIdStore } from '..'
  import PersonPresenter from '../components/PersonPresenter.svelte'
  import contact from '../plugin'
  import { getPreviewPopup } from './person/utils'

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

  $: employeeValue = person != null ? h.as(person, contact.mixin.Employee) : undefined

  $: active = employeeValue?.active ?? false

  console.log('shouldShowAvatar', shouldShowAvatar)
</script>

<PersonPresenter
  value={employeeValue}
  {tooltipLabels}
  onEdit={onEmployeeEdit}
  customTooltip={getPreviewPopup(employeeValue, showPopup)}
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
