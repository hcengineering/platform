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
  import contact, { Employee, formatName } from '@hcengineering/contact'
  import { EmployeePresenter } from '@hcengineering/contact-resources'
  import { AccountRole, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Breadcrumb, DropdownIntlItem, DropdownLabelsIntl, SearchInput, Header, Scroller } from '@hcengineering/ui'
  import { onMount } from 'svelte'

  import { getAccountClient } from '../utils'
  import setting from '../plugin'

  const query = createQuery()
  const currentAccount = getCurrentAccount()

  const items: DropdownIntlItem[] = [
    { id: AccountRole.User, label: setting.string.User },
    { id: AccountRole.Maintainer, label: setting.string.Maintainer },
    { id: AccountRole.Owner, label: setting.string.Owner }
  ]

  const accountClient = getAccountClient()
  let workspaceMembers: Record<string, AccountRole> = {}
  let employees: Employee[] = []

  onMount(async () => {
    const members = await accountClient.getWorkspaceMembers()
    workspaceMembers = members.reduce<Record<string, AccountRole>>((wm, m) => {
      wm[m.person] = m.role

      return wm
    }, {})
  })

  query.query(contact.mixin.Employee, { active: true }, (res) => {
    employees = res
      .filter((e) => e.personUuid != null)
      .sort((a, b) => formatName(a.name).localeCompare(formatName(b.name)))
  })

  async function change (personUuid: string, value: AccountRole): Promise<void> {
    if (accountClient == null) {
      return
    }

    try {
      await accountClient.updateWorkspaceRole(personUuid, value)
      workspaceMembers[personUuid] = value
    } catch (e) {
      console.error(e)
    }
  }
  let search = ''

  $: ownersCount = employees.filter(
    (e) => e.personUuid != null && workspaceMembers[e.personUuid] === AccountRole.Owner
  ).length
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={setting.icon.Owners} label={setting.string.Owners} size={'large'} isCurrent />
    <svelte:fragment slot="search">
      <SearchInput bind:value={search} collapsed />
    </svelte:fragment>
  </Header>
  <div class="hulyComponent-content__column content">
    <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
      <div class="hulyComponent-content">
        {#each employees as employee (employee._id)}
          {@const personUuid = employee.personUuid ?? undefined}
          {@const role = personUuid !== undefined ? workspaceMembers[personUuid] : undefined}
          {#if personUuid !== undefined && role !== undefined && employee.name?.includes(search)}
            <div class="flex-row-center p-2 flex-no-shrink">
              <div class="p-1 min-w-80">
                <EmployeePresenter value={employee} disabled={false} />
              </div>
              <DropdownLabelsIntl
                label={setting.string.Role}
                disabled={!hasAccountRole(currentAccount, role) || (role === AccountRole.Owner && ownersCount === 1)}
                kind={'primary'}
                size={'medium'}
                {items}
                selected={role}
                on:selected={(e) => {
                  void change(personUuid, e.detail)
                }}
              />
            </div>
          {/if}
        {/each}
      </div>
    </Scroller>
  </div>
</div>
