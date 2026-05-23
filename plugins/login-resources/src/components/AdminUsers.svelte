<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { onMount } from 'svelte'
  import { isAdminUser } from '@hcengineering/presentation'
  import { getAccountClient } from '../utils'
  import AdminUsersFilterBar from './admin-users/AdminUsersFilterBar.svelte'
  import AdminUsersTable from './admin-users/AdminUsersTable.svelte'
  import AdminUsersPagination from './admin-users/AdminUsersPagination.svelte'
  import AdminUsersDrawer from './admin-users/AdminUsersDrawer.svelte'
  import type { AccountListRow, ListAccountsAdminParams } from '@hcengineering/account-client'

  if (typeof window !== 'undefined' && !isAdminUser()) {
    window.location.href = '/login'
  }

  interface AdminFilter {
    search?: string
    authMethod?: 'all' | 'email_only' | 'oidc' | 'mixed'
    status?: 'all' | 'active' | 'disabled'
    workspaceUuids?: string[]
  }

  let filter: AdminFilter = { status: 'active' }
  let sort: ListAccountsAdminParams['sort'] = { field: 'name', direction: 'asc' }
  let offset = 0
  const limit = 50

  let accounts: AccountListRow[] = []
  let total = 0
  let loading = false
  let selectedUuid: string | null = null

  async function refresh (): Promise<void> {
    loading = true
    try {
      const params: ListAccountsAdminParams = {
        search: filter.search,
        authMethod: filter.authMethod,
        status: filter.status,
        workspaceUuids: filter.workspaceUuids as any,
        sort,
        pagination: { limit, offset }
      }
      const res = await getAccountClient().listAccountsAdmin(params)
      accounts = res.accounts
      total = res.total
    } finally {
      loading = false
    }
  }

  onMount(refresh)

  function onFilterChange (e: CustomEvent<typeof filter>): void {
    filter = e.detail
    offset = 0
    void refresh()
  }

  function onSortChange (e: CustomEvent<typeof sort>): void {
    sort = e.detail
    void refresh()
  }

  function onPageChange (e: CustomEvent<{ offset: number }>): void {
    offset = e.detail.offset
    void refresh()
  }

  function onRowClick (e: CustomEvent<{ uuid: string }>): void {
    selectedUuid = e.detail.uuid
  }

  function onDrawerClose (): void {
    selectedUuid = null
  }

  function onAccountChanged (): void {
    void refresh()
  }
</script>

<div class="admin-users-page">
  <header>
    <h1>Users</h1>
  </header>

  <AdminUsersFilterBar bind:filter on:change={onFilterChange} />

  <AdminUsersTable {accounts} {sort} {loading} on:sort={onSortChange} on:row-click={onRowClick} />

  <AdminUsersPagination {total} {offset} {limit} on:page={onPageChange} />

  {#if selectedUuid != null}
    <AdminUsersDrawer accountUuid={selectedUuid} on:close={onDrawerClose} on:account-changed={onAccountChanged} />
  {/if}
</div>

<style lang="scss">
  .admin-users-page {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }
  header {
    margin-bottom: 1rem;
  }
</style>
