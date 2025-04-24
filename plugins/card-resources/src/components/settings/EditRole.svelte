<!--
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import card, { Role } from '@hcengineering/card'
  import contact, { Employee, UserRole } from '@hcengineering/contact'
  import { SelectUsersPopup, UserDetails } from '@hcengineering/contact-resources'
  import core, { Ref, WithLookup } from '@hcengineering/core'
  import presentation, { createQuery, getClient } from '@hcengineering/presentation'
  import { clearSettingsStore } from '@hcengineering/setting-resources'
  import { ButtonIcon, Icon, IconAdd, IconDelete, Modal, ModernButton, Scroller, showPopup } from '@hcengineering/ui'

  export let _id: Ref<Role>

  const client = getClient()

  const query = createQuery()
  let role: Role | undefined
  query.query(card.class.Role, { _id }, (res) => {
    role = res[0]
  })
  $: name = role?.name

  const usersQ = createQuery()

  let roles: WithLookup<UserRole>[] = []

  usersQ.query(
    contact.class.UserRole,
    { role: _id },
    (res) => {
      roles = res
    },
    {
      lookup: {
        user: contact.class.Person
      }
    }
  )

  let users: Employee[] = []
  $: users = roles.map((role) => role.$lookup?.user).filter((p) => p !== undefined)

  async function remove (): Promise<void> {
    if (role === undefined) {
      return
    }
    await client.remove(role)
    clearSettingsStore()
  }

  async function removeAssignment (val: Ref<Employee>): Promise<void> {
    const toRemove = roles.filter((role) => role.user === val)
    for (const obj of toRemove) {
      await client.remove(obj)
    }
  }

  function openSelectUsersPopup (): void {
    const selected = users.map((user) => user._id)
    showPopup(
      SelectUsersPopup,
      {
        okLabel: presentation.string.Add,
        disableDeselectFor: selected,
        skipInactive: true,
        selected,
        showStatus: true
      },
      'top',
      (result?: Ref<Employee>[]) => {
        if (result != null) {
          void changeUsers(result)
        }
      }
    )
  }

  async function changeUsers (persons: Ref<Employee>[]): Promise<void> {
    const current = new Set(users.map((user) => user._id))
    const newPersons = persons.filter((person) => !current.has(person))
    if (newPersons.length === 0) {
      return
    }
    const apply = client.apply()
    for (const person of newPersons) {
      await apply.createDoc(contact.class.UserRole, contact.space.Contacts, { role: _id, user: person })
    }
    await apply.commit()
  }
</script>

<Modal
  label={core.string.Role}
  type={'type-aside'}
  showCancelButton={false}
  canSave={true}
  okLabel={presentation.string.Close}
  okAction={clearSettingsStore}
>
  <svelte:fragment slot="actions">
    <ButtonIcon icon={IconDelete} size={'small'} kind={'tertiary'} on:click={remove} />
  </svelte:fragment>
  <div class="hulyModal-content__titleGroup">
    <div class="flex fs-title items-center flex-gap-2">
      <Icon icon={contact.icon.Person} size={'medium'} />
      <div>
        {name}
      </div>
    </div>
  </div>
  <div class="hulyModal-content__settingsSet">
    <div class="item" style:padding="var(--spacing-1_5)" class:withoutBorder={users.length === 0}>
      <ModernButton
        label={presentation.string.Add}
        icon={IconAdd}
        iconSize="small"
        kind="secondary"
        size="small"
        on:click={openSelectUsersPopup}
      />
    </div>
    {#each users as user, index (user._id)}
      <div class="item" class:withoutBorder={index === users.length - 1}>
        <div class="item__content">
          <UserDetails person={user} showStatus />
          <div class="item__action">
            <ButtonIcon
              icon={IconDelete}
              size="small"
              on:click={async () => {
                await removeAssignment(user._id)
              }}
            />
          </div>
        </div>
      </div>
    {/each}
  </div>
</Modal>

<style lang="scss">
  .item {
    padding: var(--spacing-0_75);

    &.withoutBorder {
      border: 0;
    }

    .item__content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-0_75);
      border-radius: var(--small-BorderRadius);
      cursor: pointer;

      &:hover {
        background: var(--global-ui-highlight-BackgroundColor);

        .item__action {
          visibility: visible;
        }
      }
    }

    .item__action {
      visibility: hidden;

      &:hover {
        visibility: visible;
      }
    }
  }
</style>
