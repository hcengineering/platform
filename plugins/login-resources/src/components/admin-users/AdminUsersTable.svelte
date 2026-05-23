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

<div class="users-table">
  <div class="users-table__head">
    <div class="head-cell cell-name sortable" on:click={() => setSort('name')}>
      Name <span class="arrow">{sortArrow('name')}</span>
    </div>
    <div class="head-cell cell-email">Email</div>
    <div class="head-cell cell-auth">Auth</div>
    <div class="head-cell cell-ws sortable" on:click={() => setSort('workspace_count')}>
      Workspaces <span class="arrow">{sortArrow('workspace_count')}</span>
    </div>
    <div class="head-cell cell-activity sortable" on:click={() => setSort('last_activity')}>
      Last activity <span class="arrow">{sortArrow('last_activity')}</span>
    </div>
    <div class="head-cell cell-status">Status</div>
  </div>
  <div class="users-table__body">
    {#if loading}
      <div class="empty">Loading…</div>
    {:else if accounts.length === 0}
      <div class="empty">No users match the current filters.</div>
    {:else}
      {#each accounts as account (account.uuid)}
        <AdminUsersRow {account} on:click={() => onRowClick(account.uuid)} />
      {/each}
    {/if}
  </div>
</div>

<style lang="scss">
  .users-table {
    background: var(--theme-bg-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-BorderRadius);
    overflow: hidden;
  }

  .users-table__head {
    display: grid;
    grid-template-columns: minmax(180px, 2fr) minmax(180px, 2fr) auto minmax(100px, 1fr) minmax(120px, 1fr) auto;
    align-items: center;
    background: var(--theme-bg-accent-color);
    border-bottom: 1px solid var(--theme-divider-color);
  }

  .head-cell {
    padding: 0.5rem 0.85rem;
    font-size: 0.72rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--theme-darker-color);
    white-space: nowrap;
  }

  .head-cell.cell-ws,
  .head-cell.cell-status {
    text-align: right;
  }

  .sortable {
    cursor: pointer;
    user-select: none;
    transition: color 80ms ease;

    &:hover {
      color: var(--theme-caption-color);
    }
  }

  .arrow {
    display: inline-block;
    width: 0.75rem;
    color: var(--theme-caption-color);
  }

  .empty {
    padding: var(--spacing-4);
    text-align: center;
    color: var(--theme-darker-color);
    font-size: 0.9rem;
  }

  :global(.users-table__body .users-table-row) {
    display: grid;
    grid-template-columns: minmax(180px, 2fr) minmax(180px, 2fr) auto minmax(100px, 1fr) minmax(120px, 1fr) auto;
    align-items: center;
    border-bottom: 1px solid var(--theme-divider-color);
    cursor: pointer;
    transition: background 80ms ease;
  }

  :global(.users-table__body .users-table-row:hover) {
    background: var(--theme-popup-hover);
  }

  :global(.users-table__body .users-table-row:last-child) {
    border-bottom: none;
  }
</style>
