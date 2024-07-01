<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { createEventDispatcher, onMount } from 'svelte'
  import { deepEqual } from 'fast-equals'

  import { DirectMessage } from '@hcengineering/chunter'
  import contactPlugin, { Contact, Person, PersonAccount } from '@hcengineering/contact'
  import core, { AccountRole, getCurrentAccount, IdMap, Ref } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { Modal, showPopup } from '@hcengineering/ui'
  import { personByIdStore } from '@hcengineering/contact-resources'

  import chunter from '../../../plugin'
  import { getDmNameByContacts } from '../../../utils'
  import ChannelMembers from '../../ChannelMembers.svelte'
  import { openChannel } from '../../../navigation'
  import SelectDirectUsersPopup from './SelectDirectUsersPopup.svelte'
  import { SelectDirectUsersResult } from '../types'

  const dispatch = createEventDispatcher()
  const client = getClient()
  const myAccId = getCurrentAccount()._id

  let contactIds: Ref<Contact>[] = []
  let persons: Contact[] = []
  let dmName = ''
  let hidden = true
  let isExternal = false

  $: void loadContacts(contactIds, $personByIdStore, isExternal)

  async function loadContacts (ids: Ref<Contact>[], personById: IdMap<Person>, isExternal: boolean): Promise<void> {
    const result = []

    for (const _id of ids) {
      const person = personById.get(_id)

      if (person !== undefined) {
        result.push(person)
      } else if (isExternal) {
        const contact = await client.findOne(contactPlugin.class.Contact, { _id })
        if (contact !== undefined) {
          result.push(contact)
        }
      }
    }

    persons = result
    dmName = getDmNameByContacts(persons)
  }

  async function getAccounts (): Promise<PersonAccount[]> {
    const employeeAccounts = await client.findAll(contactPlugin.class.PersonAccount, { person: { $in: contactIds } })

    if (!isExternal) {
      return employeeAccounts
    }

    const accountsPersons = new Set(employeeAccounts.map(({ person }) => person))

    for (const _id of contactIds) {
      if (accountsPersons.has(_id)) {
        continue
      }

      const id = await client.createDoc(contactPlugin.class.PersonAccount, core.space.Model, {
        email: `contact:${_id}`,
        person: _id,
        role: AccountRole.User
      })
      const acc = await client.findOne(contactPlugin.class.PersonAccount, { _id: id })
      if (acc !== undefined) {
        employeeAccounts.push(acc)
      }
    }

    return employeeAccounts
  }

  async function createDirectMessage (): Promise<void> {
    const accounts = await getAccounts()
    const accIds = [myAccId, ...accounts.filter(({ _id }) => _id !== myAccId).map(({ _id }) => _id)].sort()

    const existingDms = await client.findAll(chunter.class.DirectMessage, {})

    let direct: DirectMessage | undefined

    for (const dm of existingDms) {
      if (deepEqual(dm.members.sort(), accIds)) {
        direct = dm
        break
      }
    }

    if (direct !== undefined) {
      const context = await client.findOne(notification.class.DocNotifyContext, {
        user: myAccId,
        attachedTo: direct._id,
        attachedToClass: chunter.class.DirectMessage
      })

      if (context !== undefined) {
        await client.diffUpdate(context, { hidden: false })
      }
      openChannel(direct._id, chunter.class.DirectMessage)
      dispatch('close')
      return
    }

    const dmId = await client.createDoc(chunter.class.DirectMessage, core.space.Space, {
      name: '',
      description: '',
      private: true,
      archived: false,
      members: accIds
    })

    openChannel(dmId, chunter.class.DirectMessage)
    dispatch('close')
  }

  function handleCancel (): void {
    dispatch('close')
  }

  onMount(() => {
    openSelectUsersPopup(true)
  })

  function addMembersClicked (): void {
    openSelectUsersPopup(false)
  }

  function openSelectUsersPopup (closeOnClose: boolean): void {
    showPopup(
      SelectDirectUsersPopup,
      {
        okLabel: presentation.string.Next,
        skipCurrentAccount: false,
        skipInactive: true,
        selected: contactIds,
        showStatus: true
      },
      'top',
      (result?: SelectDirectUsersResult) => {
        const selected = result?.selected ?? []
        if (selected.length > 0) {
          contactIds = selected
          hidden = false
          isExternal = result?.isExternal ?? false
        } else if (closeOnClose) {
          dispatch('close')
        }
      }
    )
    hidden = true
  }
</script>

<Modal
  label={chunter.string.NewDirectChat}
  type="type-popup"
  {hidden}
  okLabel={presentation.string.Create}
  okAction={createDirectMessage}
  canSave={contactIds.length > 0}
  onCancel={handleCancel}
  on:close
>
  <div class="hulyModal-content__titleGroup" style="padding: 0">
    <div class="title overflow-label mb-4" title={dmName}>
      {dmName}
    </div>

    <ChannelMembers
      ids={contactIds}
      contacts={persons}
      on:add={addMembersClicked}
      on:remove={(ev) => {
        contactIds = contactIds.filter((id) => id !== ev.detail)
      }}
    />
  </div>
</Modal>

<style lang="scss">
  .title {
    font-size: 1.25rem;
    font-weight: 500;
    padding: var(--spacing-1);
    max-width: 40rem;
    color: var(--global-primary-TextColor);
  }
</style>
