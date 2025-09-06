<script lang="ts">
  import { Employee, Person, getName } from '@hcengineering/contact'
  import { Ref, Space, notEmpty } from '@hcengineering/core'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { ActionIcon, Button, IconClose, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import contact from '../plugin'
  import UsersPopup from './UsersPopup.svelte'
  import { employeeByIdStore, employeeRefByAccountUuidStore } from '../utils'

  export let value: Space
  const dispatch = createEventDispatcher()
  const client = getClient()

  let membersToAdd: Ref<Employee>[] = []
  const channelMembers: Ref<Person>[] = value.members
    .map((acc) => {
      const employeeRef = $employeeRefByAccountUuidStore.get(acc)

      if (employeeRef === undefined) {
        console.error(`Employee with account ${acc} not found`)
        return undefined
      }

      return employeeRef
    })
    .filter(notEmpty)

  $: memberAccountsToAdd = membersToAdd.map((m) => $employeeByIdStore.get(m)?.personUuid).filter(notEmpty)

  async function changeMembersToAdd (employees: Ref<Employee>[]): Promise<void> {
    membersToAdd = employees
  }

  function removeMember (_id: Ref<Employee>): void {
    membersToAdd = membersToAdd.filter((m) => m !== _id)
  }
</script>

<div class="antiPopup antiPopup-withHeader">
  <div class="ap-header flex-between header">
    <div class="ap-caption">
      <Label label={contact.string.AddMembersHeader} params={{ value: value.name }} />
    </div>
    <div class="tool">
      <ActionIcon
        icon={IconClose}
        size={'small'}
        action={() => {
          dispatch('close')
        }}
      />
    </div>
  </div>
  {#if membersToAdd.length}
    <div class="flex-row-top flex-wrap ml-6 mr-6 mt-4">
      {#each membersToAdd as m}
        {@const employee = $employeeByIdStore.get(m)}
        <div class="mr-2 p-1 item">
          {employee !== undefined ? getName(client.getHierarchy(), employee) : ''}
          <div class="tool">
            <ActionIcon
              icon={IconClose}
              size={'small'}
              action={() => {
                removeMember(m)
              }}
            />
          </div>
        </div>
      {/each}
    </div>
  {/if}
  <div class="ml-8 mr-8 mb-6 mt-4">
    <UsersPopup
      selected={undefined}
      _class={contact.mixin.Employee}
      docQuery={{
        active: true
      }}
      multiSelect={true}
      allowDeselect={true}
      selectedUsers={membersToAdd}
      ignoreUsers={channelMembers}
      shadows={false}
      on:update={(ev) => changeMembersToAdd(ev.detail)}
    />
  </div>
  <Button
    on:click={() => {
      dispatch('close', memberAccountsToAdd)
    }}
    label={presentation.string.Add}
  />
</div>

<style lang="scss">
  .header {
    flex-direction: row;
  }

  .item {
    display: flex;
    flex-direction: row;
    width: fit-content;
    background-color: var(--popup-bg-hover);
  }
</style>
