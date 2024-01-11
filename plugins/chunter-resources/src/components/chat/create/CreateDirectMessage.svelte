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
  import { createEventDispatcher } from 'svelte'
  import { deepEqual } from 'fast-equals'

  import { DirectMessage } from '@hcengineering/chunter'
  import contact, { Employee } from '@hcengineering/contact'
  import core, { getCurrentAccount, Ref } from '@hcengineering/core'
  import { getClient, SpaceCreateCard } from '@hcengineering/presentation'
  import { getResource } from '@hcengineering/platform'
  import { UserBoxList } from '@hcengineering/contact-resources'
  import notification, { DocNotifyContext } from '@hcengineering/notification'

  import chunter from '../../../plugin'

  const dispatch = createEventDispatcher()
  const client = getClient()
  const myAccId = getCurrentAccount()._id

  let employeeIds: Ref<Employee>[] = []

  async function createDirectMessage () {
    const employeeAccounts = await client.findAll(contact.class.PersonAccount, { person: { $in: employeeIds } })
    const accIds = [myAccId, ...employeeAccounts.filter(({ _id }) => _id !== myAccId).map(({ _id }) => _id)].sort()

    const existingContexts = await client.findAll<DocNotifyContext>(
      notification.class.DocNotifyContext,
      {
        user: myAccId,
        attachedToClass: chunter.class.DirectMessage
      },
      { lookup: { attachedTo: chunter.class.DirectMessage } }
    )

    const navigate = await getResource(chunter.actionImpl.OpenChannel)

    for (const context of existingContexts) {
      if (deepEqual((context.$lookup?.attachedTo as DirectMessage)?.members.sort(), accIds)) {
        if (context.hidden) {
          await client.update(context, { hidden: false })
        }
        await navigate(context)

        return
      }
    }

    const dmId = await client.createDoc(chunter.class.DirectMessage, core.space.Space, {
      name: '',
      description: '',
      private: true,
      archived: false,
      members: accIds
    })

    const notifyContextId = await client.createDoc(notification.class.DocNotifyContext, core.space.Space, {
      user: myAccId,
      attachedTo: dmId,
      attachedToClass: chunter.class.DirectMessage,
      hidden: false
    })

    await navigate(undefined, undefined, { _id: notifyContextId })
  }
</script>

<SpaceCreateCard
  label={chunter.string.NewDirectMessage}
  okAction={createDirectMessage}
  canSave={employeeIds.length > 0}
  on:close={() => {
    dispatch('close')
  }}
>
  <UserBoxList label={chunter.string.Members} on:update={(evt) => (employeeIds = evt.detail)} />
</SpaceCreateCard>
