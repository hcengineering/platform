<script lang="ts">
  import { Employee, formatName, Status } from '@anticrm/contact'
  import { Ref, Space, WithLookup } from '@anticrm/core'
  import { Avatar, createQuery, getClient } from '@anticrm/presentation'
  import { Button, Label, showPopup } from '@anticrm/ui'
  import EmployeeSetStatusPopup from './EmployeeSetStatusPopup.svelte'
  import contact from '../plugin'
  import EmployeeStatusPresenter from './EmployeeStatusPresenter.svelte'
  import Edit from './icons/Edit.svelte'
  import { createEventDispatcher } from 'svelte'

  export let employeeId: Ref<Employee>
  export let space: Ref<Space>

  const client = getClient()

  const stattusQuery = createQuery()
  let status: WithLookup<Status>
  $: employee = status?.$lookup?.attachedTo
  stattusQuery.query(contact.class.Status, { attachedTo: employeeId }, (res) => (status = res[0]), {
    lookup: {
      attachedTo: contact.class.Employee
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
          client.createDoc(contact.class.Status, space, {
            attachedTo: employeeId,
            attachedToClass: contact.class.Employee,
            collection: 'statuses',
            name: newStatus.name,
            dueDate: newStatus.dueDate
          })
        }
      }
    )
    dispatch('close')
  }
</script>

<div class="antiPopup p-4 flex-col">
  <div class="flex-col-center pb-2">
    <Avatar size="x-large" avatar={employee?.avatar} />
  </div>
  <div class="pb-2">{formatName(employee?.name ?? '')}</div>
  <div class="pb-2">
    <Label label={contact.string.Status} />
    {#if status}
      <div class="flex-row-stretch statusContainer">
        <div class="pr-2">
          <EmployeeStatusPresenter {employeeId} withTooltip={false} />
        </div>
        <div class="setStatusButton">
          <Button icon={Edit} title={contact.string.SetStatus} on:click={onEdit} />
        </div>
      </div>
    {:else}
      <div class="flex-row-stretch over-underline" on:click={onEdit}>
        <Label label={contact.string.SetStatus} />
      </div>
    {/if}
  </div>
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
