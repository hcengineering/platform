<!--
// Copyright © 2026 TraceX SAS.
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
  import { type Employee, formatName } from '@hcengineering/contact'
  import { EmployeePresenter } from '@hcengineering/contact-resources'
  import { type AccountUuid, type WorkspaceMemberInfo, AccountRole, getCurrentAccount } from '@hcengineering/core'
  import presentation from '@hcengineering/presentation'
  import {
    type ActiveFilter,
    FilterButton,
    type FilterCategory,
    type FilterOption,
    Label,
    Loading,
    Scroller,
    SearchInput
  } from '@hcengineering/ui'

  import {
    WORKSPACE_ROLES,
    canChangeWorkspaceRole,
    getAssignableWorkspaceRoles,
    getWorkspaceMemberRole
  } from '../../accessPermissions'
  import setting from '../../plugin'
  import UserRoleSelect from '../UserRoleSelect.svelte'

  const currentAccount = getCurrentAccount()
  const ROLE_FILTER_LABELS: Partial<Record<AccountRole, FilterOption['label']>> = {
    [AccountRole.ReadOnlyGuest]: setting.string.ReadonlyGuest,
    [AccountRole.Guest]: setting.string.Guest,
    [AccountRole.User]: setting.string.User,
    [AccountRole.Maintainer]: setting.string.Maintainer,
    [AccountRole.Owner]: setting.string.Owner
  }
  const MEMBER_FILTER_CATEGORIES: FilterCategory[] = [
    {
      id: 'role',
      label: setting.string.Role,
      options: WORKSPACE_ROLES.map((role) => ({
        id: role,
        label: ROLE_FILTER_LABELS[role] ?? setting.string.User
      }))
    }
  ]

  export let employees: Employee[]
  export let workspaceMembers: WorkspaceMemberInfo[]
  export let employeesLoading: boolean
  export let membersLoading: boolean
  export let pendingRoleUpdates: Set<AccountUuid>
  export let changeRole: (personUuid: AccountUuid, role: AccountRole) => Promise<void>
  export let handleError: (error: unknown) => void

  let search = ''
  let memberFilters: ActiveFilter[] = []

  function getActiveFilter (filters: ActiveFilter[], categoryId: string): string | undefined {
    return filters.find((filter) => filter.categoryId === categoryId)?.optionId
  }

  function updateMemberFilters (event: CustomEvent<ActiveFilter[]>): void {
    memberFilters = event.detail
  }

  $: visibleEmployees = employees.filter(
    (employee) =>
      employee.active &&
      employee.personUuid !== undefined &&
      getWorkspaceMemberRole(workspaceMembers, employee.personUuid) !== undefined &&
      formatName(employee.name).toLowerCase().includes(search.toLowerCase()) &&
      (getActiveFilter(memberFilters, 'role') === undefined ||
        getWorkspaceMemberRole(workspaceMembers, employee.personUuid) === getActiveFilter(memberFilters, 'role'))
  )
  $: activeEmployeesCount = employees.filter(
    (employee) =>
      employee.active &&
      employee.personUuid !== undefined &&
      getWorkspaceMemberRole(workspaceMembers, employee.personUuid) !== undefined
  ).length
</script>

<Scroller align={'center'} padding={'var(--spacing-4)'}>
  <div class="membersContent">
    <h2><Label label={setting.string.Members} /></h2>
    <div class="memberToolbar">
      <SearchInput bind:value={search} width={'22rem'} placeholder={setting.string.SearchMembers} />
      <FilterButton
        categories={MEMBER_FILTER_CATEGORIES}
        activeFilters={memberFilters}
        size={'small'}
        kind={'regular'}
        on:change={updateMemberFilters}
      />
      {#if search.trim() !== '' || memberFilters.length > 0}
        <span class="memberCount">{visibleEmployees.length} / {activeEmployeesCount}</span>
      {/if}
    </div>
    {#if membersLoading || employeesLoading}
      <Loading />
    {:else if visibleEmployees.length === 0}
      <div class="emptyState"><Label label={presentation.string.NoResults} /></div>
    {:else}
      <div class="membersTable">
        <table>
          <thead>
            <tr>
              <th scope="col"><Label label={setting.string.Member} /></th>
              <th scope="col" class="roleColumn"><Label label={setting.string.Role} /></th>
            </tr>
          </thead>
          <tbody>
            {#each visibleEmployees as employee (employee._id)}
              {@const personUuid = employee.personUuid}
              {@const role =
                personUuid !== undefined ? getWorkspaceMemberRole(workspaceMembers, personUuid) : undefined}
              {#if personUuid !== undefined && role !== undefined}
                <tr>
                  <td>
                    <div class="memberCell">
                      <EmployeePresenter value={employee} avatarSize={'x-small'} />
                    </div>
                  </td>
                  <td>
                    <UserRoleSelect
                      disabled={!canChangeWorkspaceRole(currentAccount, personUuid, role, workspaceMembers) ||
                        pendingRoleUpdates.has(personUuid)}
                      kind={'no-border'}
                      size={'small'}
                      minWidth={'7rem'}
                      roles={getAssignableWorkspaceRoles(currentAccount, role)}
                      securityFilter={false}
                      selected={role}
                      on:selected={(event) => {
                        changeRole(personUuid, event.detail).catch(handleError)
                      }}
                    />
                  </td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</Scroller>

<style lang="scss">
  .membersContent {
    width: min(100%, 76rem);
  }
  h2 {
    margin: 0 0 var(--spacing-4);
  }
  .memberToolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-4);
    color: var(--theme-caption-color);
  }
  .memberCount {
    white-space: nowrap;
    font-size: 0.75rem;
  }
  .membersTable {
    min-width: 24rem;
    overflow: hidden;
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--medium-BorderRadius);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  th {
    height: 2.5rem;
    padding: var(--spacing-1) var(--spacing-3);
    color: var(--theme-caption-color);
    font-size: 0.6875rem;
    font-weight: 400;
    letter-spacing: 0.03em;
    text-align: left;
    text-transform: uppercase;
    background: var(--theme-comp-header-color);
    border-bottom: 1px solid var(--theme-divider-color);
  }
  .roleColumn {
    width: 14rem;
  }
  td {
    height: 3.5rem;
    padding: var(--spacing-2) var(--spacing-3);
    vertical-align: middle;
  }
  tbody tr + tr {
    border-top: 1px solid var(--theme-divider-color);
  }
  tbody tr:hover {
    background: var(--theme-button-hovered);
  }
  .memberCell {
    display: flex;
    align-items: center;
    min-width: 0;
  }
  .emptyState {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 8rem;
    color: var(--theme-caption-color);
  }
</style>
