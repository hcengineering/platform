<!--
// Copyright © 2022 Anticrm Platform Contributors.
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

  import contact, { Employee } from '@anticrm/contact'
  import core, { getCurrentAccount, Ref } from '@anticrm/core'
  import { getClient, SpaceCreateCard, UserBoxList } from '@anticrm/presentation'
  import workbench from '@anticrm/workbench'
  import { getResource } from '@anticrm/platform'

  import chunter from '../plugin'

  const dispatch = createEventDispatcher()
  const client = getClient()
  const myAccId = getCurrentAccount()._id

  let employeeIds: Ref<Employee>[] = []

  async function createDirectMessage () {
    const employeeAccounts = await client.findAll(contact.class.EmployeeAccount, { employee: { $in: employeeIds } })

    const accIds = [myAccId, ...employeeAccounts.filter((ea) => ea._id !== myAccId).map((ea) => ea._id)].sort()
    const existingDms = await client.findAll(chunter.class.DirectMessage, {})

    for (const dm of existingDms) {
      if (deepEqual(dm.members.sort(), accIds)) {
        const navigate = await getResource(workbench.actionImpl.Navigate)

        await navigate([], undefined as any, {
          mode: 'space',
          space: dm._id
        })

        return
      }
    }

    client.createDoc(chunter.class.DirectMessage, core.space.Space, {
      name: '',
      description: '',
      private: true,
      archived: false,
      members: accIds
    })
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
  <UserBoxList
    _class={contact.class.Employee}
    label={chunter.string.Members}
    on:update={(evt) => (employeeIds = evt.detail)}
  />
</SpaceCreateCard>
