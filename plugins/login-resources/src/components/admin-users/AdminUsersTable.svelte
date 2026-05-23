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
  <div class="row head">
    <div class="cell cell-name sortable" on:click={() => setSort('name')}>
      Name <span class="arrow">{sortArrow('name')}</span>
    </div>
    <div class="cell cell-email">Email</div>
    <div class="cell cell-auth">Auth</div>
    <div class="cell cell-ws sortable" on:click={() => setSort('workspace_count')}>
      Workspaces <span class="arrow">{sortArrow('workspace_count')}</span>
    </div>
    <div class="cell cell-activity sortable" on:click={() => setSort('last_activity')}>
      Last activity <span class="arrow">{sortArrow('last_activity')}</span>
    </div>
    <div class="cell cell-status">Status</div>
  </div>
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

<style lang="scss">
  /*
   * Single grid for the whole table: head + every row inherit the same
   * grid-template-columns via `display: contents` on the .row wrapper.
   * This guarantees the columns line up across rows, which a per-row grid
   * does not. All numeric / status columns get fixed widths so they never
   * shrink or shift per content.
   */
  .users-table {
    display: grid;
    grid-template-columns:
      minmax(220px, 2fr)   /* Name + avatar     */
      minmax(220px, 3fr)   /* Email             */
      140px                /* Auth              */
      110px                /* Workspaces (num)  */
      minmax(140px, 1fr)   /* Last activity     */
      120px;               /* Status            */
    align-items: center;
    background: var(--theme-bg-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-BorderRadius);
    overflow: hidden;
  }

  .row {
    display: contents;
  }

  .head .cell {
    padding: 0.55rem 0.85rem;
    font-size: 0.72rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--theme-darker-color);
    background: var(--theme-bg-accent-color);
    border-bottom: 1px solid var(--theme-divider-color);
    white-space: nowrap;
  }

  .cell-ws,
  .cell-status {
    justify-self: end;
    text-align: right;
  }

  .head .sortable {
    cursor: pointer;
    user-select: none;

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
    grid-column: 1 / -1;
    padding: var(--spacing-4);
    text-align: center;
    color: var(--theme-darker-color);
    font-size: 0.9rem;
  }
</style>
