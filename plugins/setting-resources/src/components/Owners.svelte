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
  import contact, { PersonAccount } from '@hcengineering/contact'
  import { EmployeePresenter, personByIdStore } from '@hcengineering/contact-resources'
  import { AccountRole, SortingOrder, getCurrentAccount } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { DropdownIntlItem, DropdownLabelsIntl, EditBox, Icon, Label } from '@hcengineering/ui'
  import setting from '../plugin'

  const client = getClient()

  const query = createQuery()

  const currentRole = getCurrentAccount().role

  const items: DropdownIntlItem[] = [
    { id: AccountRole.User.toString(), label: setting.string.User },
    { id: AccountRole.Maintainer.toString(), label: setting.string.Maintainer },
    { id: AccountRole.Owner.toString(), label: setting.string.Owner }
  ]

  let accounts: PersonAccount[] = []
  $: owners = accounts.filter((p) => p.role === AccountRole.Owner)

  query.query(
    contact.class.PersonAccount,
    {},
    (res) => {
      accounts = res
    },
    {
      sort: { name: SortingOrder.Descending }
    }
  )

  async function change (account: PersonAccount, value: AccountRole): Promise<void> {
    await client.update(account, {
      role: value
    })
  }
  let search = ''
</script>

<div class="antiComponent">
  <div class="ac-header short divide">
    <div class="ac-header__icon"><Icon icon={setting.icon.Password} size={'medium'} /></div>
    <div class="ac-header__title"><Label label={setting.string.Owners} /></div>
    <EditBox kind={'search-style'} focusIndex={1} bind:value={search} />
  </div>
  <div class="ac-body columns">
    <div class="ac-column max">
      {#each accounts as account (account._id)}
        {@const employee = $personByIdStore.get(account.person)}
        {#if employee?.name?.includes(search)}
          <div class="flex-row-center p-2 flex-no-shrink">
            <div class="p-1 min-w-80">
              {#if employee}
                <EmployeePresenter value={employee} disabled={false} />
              {:else}
                {account.email}
              {/if}
            </div>
            <DropdownLabelsIntl
              label={setting.string.Role}
              disabled={account.role > currentRole || (account.role === AccountRole.Owner && owners.length === 1)}
              kind={'accented'}
              size={'medium'}
              {items}
              selected={account.role.toString()}
              on:selected={(e) => {
                change(account, Number(e.detail))
              }}
            />
          </div>
        {/if}
      {/each}
    </div>
  </div>
</div>
