<script lang="ts">
  import { Employee } from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'
  import { ButtonKind } from '@hcengineering/ui'
  import { PersonLabelTooltip } from '..'
  import contact from '../plugin'
  import { employeeByIdStore } from '../utils'
  import AssigneeBox from './AssigneeBox.svelte'
  import EmployeePresenter from './EmployeePresenter.svelte'

  export let value: Ref<Employee> | null | undefined
  export let kind: ButtonKind = 'link'
  export let tooltipLabels: PersonLabelTooltip | undefined = undefined
  export let onChange: ((value: Ref<Employee>) => void) | undefined = undefined

  $: employee = value ? $employeeByIdStore.get(value) : undefined

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

{#if onChange !== undefined}
  <AssigneeBox
    label={contact.string.Employee}
    {value}
    size={'medium'}
    kind={'link'}
    showNavigate={false}
    justify={'left'}
    on:change={({ detail }) => onChange?.(detail)}
  />
{:else}
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
{/if}
