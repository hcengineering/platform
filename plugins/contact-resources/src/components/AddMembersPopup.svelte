<script lang="ts">
  import { Person, getName } from '@hcengineering/contact'
  import { Ref, Space, notEmpty } from '@hcengineering/core'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { ActionIcon, Button, IconClose, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import contact from '../plugin'
  import UsersPopup from './UsersPopup.svelte'
  import { personRefByAccountUuidStore, personByIdStore, primarySocialIdByPersonRefStore } from '../utils'

  export let value: Space
  const dispatch = createEventDispatcher()
  const client = getClient()

  let membersToAdd: Ref<Person>[] = []
  const channelMembers: Ref<Person>[] = value.members
    .map((acc) => {
      const personRef = $personRefByAccountUuidStore.get(acc)

      if (personRef === undefined) {
        console.error(`Person with social id ${acc} not found`)
        return undefined
      }

      return personRef
    })
    .filter(notEmpty)

  async function changeMembersToAdd (employees: Ref<Person>[]): Promise<void> {
    membersToAdd = employees
  }

  function removeMember (_id: Ref<Person>): void {
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
        {@const employee = $personByIdStore.get(m)}
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
      dispatch(
        'close',
        membersToAdd.map((m) => $primarySocialIdByPersonRefStore.get(m))
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
