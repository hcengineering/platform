<script lang="ts">
  import { Person, PersonAccount, getName } from '@hcengineering/contact'
  import core, { IdMap, Ref, Space } from '@hcengineering/core'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { ActionIcon, Button, IconClose, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import contact from '../plugin'
  import UsersPopup from './UsersPopup.svelte'

  export let value: Space
  const dispatch = createEventDispatcher()
  const client = getClient()

  const employees: IdMap<Person> = new Map()

  let membersToAdd: PersonAccount[] = []
  let channelMembers: Ref<Person>[] = []
  client.findAll(core.class.Account, { _id: { $in: value.members } }).then((res) => {
    channelMembers = res.filter((e) => e._class === contact.class.PersonAccount).map((e) => (e as PersonAccount).person)
  })

  async function changeMembersToAdd (employees: Ref<Person>[]) {
    if (employees) {
      await client.findAll(contact.class.PersonAccount, { person: { $in: employees } }).then((res) => {
        if (res) {
          membersToAdd = res
        }
      })
    }
  }

  $: selectedEmployees = membersToAdd.map((e) => e.person)

  function removeMember (_id: Ref<PersonAccount>) {
    membersToAdd = membersToAdd.filter((m) => m._id !== _id)
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
        {@const employee = employees.get(m.person)}
        <div class="mr-2 p-1 item">
          {employee ? getName(client.getHierarchy(), employee) : ''}
          <div class="tool">
            <ActionIcon
              icon={IconClose}
              size={'small'}
              action={() => {
                removeMember(m._id)
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
      selectedUsers={selectedEmployees}
      ignoreUsers={channelMembers}
      shadows={false}
      on:update={(ev) => changeMembersToAdd(ev.detail)}
    />
  </div>
  <Button
    on:click={() => {
      dispatch(
        'close',
        membersToAdd.map((m) => m._id)
      )
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
