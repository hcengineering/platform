<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import AdminUsersRow from './AdminUsersRow.svelte'
  import type { AccountListRow } from '@hcengineering/account-client'

  export let accounts: AccountListRow[] = []
  export let sort: { field: string, direction: 'asc' | 'desc' } | undefined = undefined
  export let loading: boolean = false

  const dispatch = createEventDispatcher<{ sort: typeof sort, 'row-click': { uuid: string } }>()

  function setSort (field: string): void {
    let direction: 'asc' | 'desc' = 'asc'
    if (sort?.field === field) {
      direction = sort.direction === 'asc' ? 'desc' : 'asc'
    }
    dispatch('sort', { field, direction } as any)
  }

  function onRowClick (uuid: string): void {
    dispatch('row-click', { uuid })
  }

  function sortIndicator (field: string): string {
    if (sort?.field !== field) return ''
    return sort.direction === 'asc' ? ' ASC' : ' DESC'
  }
</script>

<table class="users-table">
  <thead>
    <tr>
      <th class="sortable" on:click={() => setSort('name')}>Name{sortIndicator('name')}</th>
      <th>Email</th>
      <th>Auth</th>
      <th class="sortable" on:click={() => setSort('workspace_count')}>Workspaces{sortIndicator('workspace_count')}</th>
      <th class="sortable" on:click={() => setSort('last_activity')}>Last activity{sortIndicator('last_activity')}</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    {#if loading}
      <tr><td colspan="6" class="loading">Loading...</td></tr>
    {:else if accounts.length === 0}
      <tr><td colspan="6" class="empty">No users match your filters.</td></tr>
    {:else}
      {#each accounts as account (account.uuid)}
        <AdminUsersRow {account} on:click={() => onRowClick(account.uuid)} />
      {/each}
    {/if}
  </tbody>
</table>

<style lang="scss">
  .users-table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    padding: 0.5rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--theme-divider-color);
  }
  th.sortable {
    cursor: pointer;
    user-select: none;
  }
  .loading,
  .empty {
    text-align: center;
    color: var(--theme-content-trans-color);
    padding: 2rem;
  }
</style>
