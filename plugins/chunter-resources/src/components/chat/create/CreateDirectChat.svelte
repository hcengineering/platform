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
  import contact, { Employee, PersonAccount } from '@hcengineering/contact'
  import core, { getCurrentAccount, Ref } from '@hcengineering/core'
  import { SelectUsersPopup } from '@hcengineering/contact-resources'
  import notification from '@hcengineering/notification'
  import presentation, { createQuery, getClient } from '@hcengineering/presentation'
  import { Modal, showPopup } from '@hcengineering/ui'

  import chunter from '../../../plugin'
  import { buildDmName } from '../../../utils'
  import ChannelMembers from '../../ChannelMembers.svelte'
  import { openChannel } from '../../../navigation'

  const dispatch = createEventDispatcher()
  const client = getClient()
  const myAccId = getCurrentAccount()._id
  const query = createQuery()

  let employeeIds: Ref<Employee>[] = []
  let dmName = ''
  let accounts: PersonAccount[] = []
  let hidden = true

  $: void loadDmName(accounts).then((r) => {
    dmName = r
  })
  $: query.query(contact.class.PersonAccount, { person: { $in: employeeIds } }, (res) => {
    accounts = res
  })

  async function loadDmName (employeeAccounts: PersonAccount[]): Promise<string> {
    return await buildDmName(client, employeeAccounts)
  }

  async function createDirectMessage (): Promise<void> {
    const employeeAccounts = await client.findAll(contact.class.PersonAccount, { person: { $in: employeeIds } })
    const accIds = [myAccId, ...employeeAccounts.filter(({ _id }) => _id !== myAccId).map(({ _id }) => _id)].sort()

    const existingDms = await client.findAll(chunter.class.DirectMessage, {})

    let direct: DirectMessage | undefined
    for (const dm of existingDms) {
      if (deepEqual(dm.members.sort(), accIds)) {
        direct = dm
        break
      }
    }

    const dmId =
      direct?._id ??
      (await client.createDoc(chunter.class.DirectMessage, core.space.Space, {
        name: '',
        description: '',
        private: true,
        archived: false,
        members: accIds
      }))

    const context = await client.findOne(notification.class.DocNotifyContext, {
      user: myAccId,
      attachedTo: dmId,
      attachedToClass: chunter.class.DirectMessage
    })

    if (context !== undefined) {
      await client.diffUpdate(context, { hidden: false })
      openChannel(dmId, chunter.class.DirectMessage)

      return
    }

    await client.createDoc(notification.class.DocNotifyContext, core.space.Space, {
      user: myAccId,
      attachedTo: dmId,
      attachedToClass: chunter.class.DirectMessage,
      hidden: false
    })

    openChannel(dmId, chunter.class.DirectMessage)
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
      SelectUsersPopup,
      {
        okLabel: presentation.string.Next,
        skipCurrentAccount: true,
        selected: employeeIds
      },
      'top',
      (result?: Ref<Employee>[]) => {
        if (result != null) {
          employeeIds = result
          hidden = false
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
  canSave={employeeIds.length > 0}
  onCancel={handleCancel}
  on:close
>
  <div class="hulyModal-content__titleGroup" style="padding: 0">
    <div class="title overflow-label mb-4" title={dmName}>
      {dmName}
    </div>

    <ChannelMembers
      ids={employeeIds}
      on:add={addMembersClicked}
      on:remove={(ev) => {
        employeeIds = employeeIds.filter((id) => id !== ev.detail)
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
