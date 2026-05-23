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

  function sortArrow (field: string): string {
    if (sort?.field !== field) return ''
    return sort.direction === 'asc' ? '↑' : '↓'
  }
</script>

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th class="sortable" on:click={() => setSort('name')}>
          Name <span class="arrow">{sortArrow('name')}</span>
        </th>
        <th>Email</th>
        <th class="col-auth">Auth</th>
        <th class="col-num sortable" on:click={() => setSort('workspace_count')}>
          Workspaces <span class="arrow">{sortArrow('workspace_count')}</span>
        </th>
        <th class="sortable" on:click={() => setSort('last_activity')}>
          Last activity <span class="arrow">{sortArrow('last_activity')}</span>
        </th>
        <th class="col-status">Status</th>
      </tr>
    </thead>
    <tbody>
      {#if loading}
        <tr><td colspan="6" class="state">Loading…</td></tr>
      {:else if accounts.length === 0}
        <tr><td colspan="6" class="state">No users match the current filters.</td></tr>
      {:else}
        {#each accounts as account (account.uuid)}
          <AdminUsersRow {account} on:click={() => onRowClick(account.uuid)} />
        {/each}
      {/if}
    </tbody>
  </table>
</div>

<style lang="scss">
  .table-wrap {
    width: 100%;
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  thead {
    background: var(--theme-bg-color);
  }

  th {
    text-align: left;
    padding: 0.65rem 1rem;
    font-weight: 500;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--theme-content-color);
    opacity: 0.65;
    border-bottom: 1px solid var(--theme-divider-color);
    white-space: nowrap;
  }

  th.sortable {
    cursor: pointer;
    user-select: none;

    &:hover {
      opacity: 1;
      color: var(--theme-caption-color);
    }
  }

  .arrow {
    display: inline-block;
    width: 0.75rem;
    color: var(--theme-caption-color);
    opacity: 0.8;
  }

  .col-num {
    text-align: right;
  }

  .col-status,
  .col-auth {
    width: 1%;
    white-space: nowrap;
  }

  .state {
    text-align: center;
    padding: 3rem;
    color: var(--theme-content-color);
    opacity: 0.55;
  }
</style>
