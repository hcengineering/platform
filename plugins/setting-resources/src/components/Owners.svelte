<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import contact, { Employee, EmployeeAccount } from '@anticrm/contact'
  import { PersonPresenter } from '@anticrm/contact-resources'
  import { Ref, SortingOrder } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { Icon, Label } from '@anticrm/ui'
  import { BooleanEditor } from '@anticrm/view-resources'
  import setting from '../plugin'

  const client = getClient()

  const query = createQuery()
  const employeeQuery = createQuery()

  let accounts: EmployeeAccount[] = []
  $: owners = accounts.filter((p) => p.owner)
  let employees: Map<Ref<Employee>, Employee> = new Map<Ref<Employee>, Employee>()

  query.query(
    contact.class.EmployeeAccount,
    {},
    (res) => {
      accounts = res
    },
    {
      sort: { name: SortingOrder.Descending }
    }
  )

  employeeQuery.query(contact.class.Employee, {}, (res) => {
    employees = new Map(
      res.map((p) => {
        return [p._id, p]
      })
    )
  })

  async function change (account: EmployeeAccount, value: boolean): Promise<void> {
    await client.update(account, {
      owner: value
    })
  }
</script>

<div class="antiComponent">
  <div class="ac-header short divide">
    <div class="ac-header__icon"><Icon icon={setting.icon.Password} size={'medium'} /></div>
    <div class="ac-header__title"><Label label={setting.string.Owners} /></div>
  </div>
  <div class="ac-body columns">
    <div class="ac-column max">
      {#each accounts as account (account._id)}
        <div class="flex-between">
          <PersonPresenter value={employees.get(account.employee)} isInteractive={false} />
          <BooleanEditor
            kind={'transparent'}
            size={'medium'}
            disabled={account.owner && owners.length === 1}
            withoutUndefined
            value={account.owner}
            onChange={(value) => {
              change(account, value)
            }}
          />
        </div>
      {/each}
    </div>
  </div>
</div>
