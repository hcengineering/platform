<script lang="ts">
  import { Employee, EmployeeAccount, getName, Status } from '@hcengineering/contact'
  import { getCurrentAccount, Ref, WithLookup } from '@hcengineering/core'
  import { Avatar, createQuery, getClient } from '@hcengineering/presentation'
  import { Button, Label, resizeObserver, showPopup } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import contact from '../plugin'
  import EmployeeSetStatusPopup from './EmployeeSetStatusPopup.svelte'
  import EmployeeStatusPresenter from './EmployeeStatusPresenter.svelte'
  import Edit from './icons/Edit.svelte'

  export let employeeId: Ref<Employee>

  const client = getClient()
  const me = (getCurrentAccount() as EmployeeAccount).employee
  $: editable = employeeId === me

  const employeeQuery = createQuery()
  $: status = employee?.$lookup?.statuses?.[0]
  let employee: WithLookup<Employee> | undefined
  employeeQuery.query(contact.class.Employee, { _id: employeeId }, (res) => (employee = res[0]), {
    lookup: {
      _id: { statuses: contact.class.Status }
    }
  })

  const dispatch = createEventDispatcher()

  function onEdit () {
    showPopup(
      EmployeeSetStatusPopup,
      {
        currentStatus: status
      },
      undefined,
      () => {},
      (newStatus: Status) => {
        if (status && newStatus) {
          client.updateDoc(contact.class.Status, status.space, status._id, { ...newStatus })
        } else if (status && !newStatus) {
          client.removeDoc(contact.class.Status, status.space, status._id)
        } else {
          client.addCollection(contact.class.Status, employee!.space, employeeId, contact.class.Employee, 'statuses', {
            name: newStatus.name,
            dueDate: newStatus.dueDate
          })
        }
      }
    )
    dispatch('close')
  }
</script>

<div
  class="antiPopup p-4 flex-col"
  use:resizeObserver={() => {
    dispatch('changeContent')
  }}
>
  {#if employee}
    <div class="flex-col-center pb-2">
      <Avatar size="x-large" avatar={employee.avatar} />
    </div>
    <div class="pb-2">{getName(employee)}</div>
    <DocNavLink object={employee}>
      <Label label={contact.string.ViewFullProfile} />
    </DocNavLink>
    {#if status}
      <div class="pb-2">
        <Label label={contact.string.Status} />
        <div class="flex-row-stretch statusContainer">
          <div class="pr-2">
            <EmployeeStatusPresenter {employee} withTooltip={false} />
          </div>
          {#if editable}
            <div class="setStatusButton">
              <Button icon={Edit} title={contact.string.SetStatus} on:click={onEdit} />
            </div>
          {/if}
        </div>
      </div>
    {:else if editable}
      <div class="flex-row-stretch over-underline pb-2" on:click={onEdit}>
        <Label label={contact.string.SetStatus} />
      </div>
    {/if}
  {/if}
</div>

<style lang="scss">
  .statusContainer {
    .setStatusButton {
      opacity: 0;
    }

    &:hover .setStatusButton {
      opacity: 1;
    }
  }
</style>
