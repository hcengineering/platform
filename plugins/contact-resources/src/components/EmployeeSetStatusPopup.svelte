<script lang="ts">
  import { Status } from '@anticrm/contact'
  import { Timestamp } from '@anticrm/core'
  import { Button, EditBox, Label } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import contact from '../plugin'
  import EmployeeStatusDueDatePresenter from './EmployeeStatusDueDatePresenter.svelte'

  export let currentStatus: Status | undefined

  let statusName: string = currentStatus?.name ?? ''
  let statusDueDate: Timestamp | undefined = currentStatus?.dueDate
  const dispatch = createEventDispatcher()

  const handleDueDateChanged = async (event: CustomEvent<Timestamp>) => {
    statusDueDate = event.detail
  }
</script>

<div class="antiPopup antiPopup-withHeader popup">
  <div class="ap-header">
    <div class="ap-caption">
      <Label label={contact.string.SetStatus} />
    </div>
  </div>
  <div class="p-4 flex-col flex-gap-1">
    <EditBox bind:value={statusName} maxWidth={'8rem'} />
    <Label label={contact.string.StatusDueDate} />

    <EmployeeStatusDueDatePresenter bind:statusDueDate on:change={handleDueDateChanged} />
  </div>
  <div class="ap-footer">
    {#if statusName.length > 0 && (statusName !== currentStatus?.name || statusDueDate !== currentStatus?.dueDate)}
      <Button
        on:click={() => {
          dispatch('close')
        }}
        label={contact.string.Cancel}
      />
      <Button
        on:click={() => {
          dispatch('update', {
            name: statusName,
            dueDate: statusDueDate
          })
          dispatch('close')
        }}
        label={contact.string.SaveStatus}
      />
    {:else}
      <Button
        on:click={() => {
          dispatch('update', undefined)
          dispatch('close')
        }}
        label={contact.string.ClearStatus}
      />
    {/if}
  </div>
</div>

<style lang="scss">
  .popup {
    width: 10rem;
  }
</style>
