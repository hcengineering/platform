<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { onMount } from 'svelte'
  import { getAccountClient } from '../utils'
  import AdminShell from './admin-shell/AdminShell.svelte'
  import AdminUsersFilterBar from './admin-users/AdminUsersFilterBar.svelte'
  import AdminUsersTable from './admin-users/AdminUsersTable.svelte'
  import AdminUsersPagination from './admin-users/AdminUsersPagination.svelte'
  import AdminUsersDrawer from './admin-users/AdminUsersDrawer.svelte'
  import type { AccountListRow, ListAccountsAdminParams } from '@hcengineering/account-client'

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
  let errorMessage: string | null = null

  $: counts = {
    active: accounts.filter((a) => a.status === 'active').length,
    disabled: accounts.filter((a) => a.status === 'disabled').length,
    admins: accounts.filter((a) => a.isAdmin).length
  }

  async function refresh (): Promise<void> {
    loading = true
    errorMessage = null
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
    } catch (err: any) {
      errorMessage = err?.message ?? 'Failed to load users'
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

<AdminShell
  section="users"
  title="Users"
  subtitle="Manage accounts, identities, workspace memberships and access."
>
  <div class="stats">
    <div class="stat">
      <span class="stat-label">Total</span>
      <span class="stat-value">{total}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Active</span>
      <span class="stat-value stat-active">{counts.active}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Disabled</span>
      <span class="stat-value stat-disabled">{counts.disabled}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Admins</span>
      <span class="stat-value">{counts.admins}</span>
    </div>
  </div>

  <div class="card">
    <AdminUsersFilterBar bind:filter on:change={onFilterChange} />

    {#if errorMessage}
      <div class="error-banner">{errorMessage}</div>
    {/if}

    <AdminUsersTable {accounts} {sort} {loading} on:sort={onSortChange} on:row-click={onRowClick} />

    <AdminUsersPagination {total} {offset} {limit} on:page={onPageChange} />
  </div>
</AdminShell>

{#if selectedUuid != null}
  <AdminUsersDrawer accountUuid={selectedUuid} on:close={onDrawerClose} on:account-changed={onAccountChanged} />
{/if}

<style lang="scss">
  .stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.9rem 1rem;
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.6rem;
  }

  .stat-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--theme-content-color);
    opacity: 0.55;
  }

  .stat-value {
    font-size: 1.45rem;
    font-weight: 600;
    color: var(--theme-caption-color);
    letter-spacing: -0.02em;
  }

  .stat-active {
    color: #10b981;
  }

  .stat-disabled {
    color: #ef4444;
  }

  .card {
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .error-banner {
    padding: 0.6rem 1rem;
    margin: 0.75rem;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: 0.5rem;
    color: #b91c1c;
    font-size: 0.85rem;
  }
</style>
