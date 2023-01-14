<script lang="ts">
  import { Employee } from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { ButtonKind } from '@hcengineering/ui'
  import { PersonLabelTooltip } from '..'
  import contact from '../plugin'
  import EmployeePresenter from './EmployeePresenter.svelte'

  export let value: Ref<Employee> | null | undefined
  export let kind: ButtonKind = 'link'
  export let tooltipLabels: PersonLabelTooltip | undefined = undefined

  let employee: Employee | undefined
  const query = createQuery()
  $: value && query.query(contact.class.Employee, { _id: value }, (res) => ([employee] = res), { limit: 1 })

  function getValue (
    employee: Employee | undefined,
    value: Ref<Employee> | null | undefined
  ): Employee | null | undefined {
    if (value === undefined || value === null) {
      return value
    }
    return employee
  }
</script>

<EmployeePresenter
  value={getValue(employee, value)}
  {tooltipLabels}
  isInteractive={false}
  shouldShowAvatar
  shouldShowPlaceholder
  defaultName={contact.string.NotSpecified}
  shouldShowName={kind !== 'list'}
  avatarSize={kind === 'list-header' ? 'small' : 'x-small'}
  disableClick
/>
