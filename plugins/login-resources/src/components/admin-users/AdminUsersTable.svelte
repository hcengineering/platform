<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Icon, IconFilter } from '@hcengineering/ui'
  import AdminUsersRow from './AdminUsersRow.svelte'
  import type { AccountListRow } from '@hcengineering/account-client'

  export let accounts: AccountListRow[] = []
  export let sort: { field: string, direction: 'asc' | 'desc' } | undefined = undefined
  export let loading: boolean = false
  export let columnFilters: Record<string, any> = {}

  type ColumnKey = 'name' | 'email' | 'auth' | 'workspaces' | 'last_activity' | 'status'

  const dispatch = createEventDispatcher<{
    sort: typeof sort
    'row-click': { uuid: string }
    'open-filter': { column: ColumnKey, anchor: HTMLElement }
  }>()

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

  function openFilter (column: ColumnKey, anchor: HTMLElement): void {
    dispatch('open-filter', { column, anchor })
  }
</script>

<div class="users-table">
  <div class="row head">
    <div class="cell cell-name sortable">
      <span class="hdr-label" on:click={() => setSort('name')}>Name <span class="arrow">{sortArrow('name')}</span></span>
      <button
        class="filter-btn"
        class:active={columnFilters?.name != null}
        title="Filter by name"
        on:click|stopPropagation={(e) => openFilter('name', e.currentTarget)}
      >
        <Icon icon={IconFilter} size={'x-small'} />
      </button>
    </div>
    <div class="cell cell-email sortable">
      <span class="hdr-label" on:click={() => setSort('email')}>Email <span class="arrow">{sortArrow('email')}</span></span>
      <button
        class="filter-btn"
        class:active={columnFilters?.email != null}
        title="Filter by email"
        on:click|stopPropagation={(e) => openFilter('email', e.currentTarget)}
      >
        <Icon icon={IconFilter} size={'x-small'} />
      </button>
    </div>
    <div class="cell cell-auth sortable">
      <span class="hdr-label" on:click={() => setSort('auth')}>Auth <span class="arrow">{sortArrow('auth')}</span></span>
      <button
        class="filter-btn"
        class:active={columnFilters?.auth != null}
        title="Filter by auth method"
        on:click|stopPropagation={(e) => openFilter('auth', e.currentTarget)}
      >
        <Icon icon={IconFilter} size={'x-small'} />
      </button>
    </div>
    <div class="cell cell-ws sortable">
      <span class="hdr-label" on:click={() => setSort('workspace_count')}>Workspaces <span class="arrow">{sortArrow('workspace_count')}</span></span>
      <button
        class="filter-btn"
        class:active={columnFilters?.workspaces != null}
        title="Filter by workspace count"
        on:click|stopPropagation={(e) => openFilter('workspaces', e.currentTarget)}
      >
        <Icon icon={IconFilter} size={'x-small'} />
      </button>
    </div>
    <div class="cell cell-activity sortable">
      <span class="hdr-label" on:click={() => setSort('last_activity')}>Last activity <span class="arrow">{sortArrow('last_activity')}</span></span>
      <button
        class="filter-btn"
        class:active={columnFilters?.last_activity != null}
        title="Filter by last activity"
        on:click|stopPropagation={(e) => openFilter('last_activity', e.currentTarget)}
      >
        <Icon icon={IconFilter} size={'x-small'} />
      </button>
    </div>
    <div class="cell cell-status sortable">
      <span class="hdr-label" on:click={() => setSort('status')}>Status <span class="arrow">{sortArrow('status')}</span></span>
      <button
        class="filter-btn"
        class:active={columnFilters?.status != null}
        title="Filter by status"
        on:click|stopPropagation={(e) => openFilter('status', e.currentTarget)}
      >
        <Icon icon={IconFilter} size={'x-small'} />
      </button>
    </div>
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
    width: 100%;
    max-width: 72rem;
    margin: 0;
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
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .cell-ws,
  .cell-status {
    justify-self: end;
    text-align: right;
    justify-content: flex-end;
  }

  .head .sortable .hdr-label {
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

  .filter-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 0;
    padding: 0.1rem 0.25rem;
    cursor: pointer;
    color: var(--theme-darker-color);
    border-radius: 0.25rem;

    &:hover {
      color: var(--theme-caption-color);
      background: var(--theme-divider-color);
    }

    &.active {
      color: var(--theme-caption-color);
      background: var(--theme-list-button-color, rgba(96, 165, 250, 0.18));
    }
  }

  .empty {
    grid-column: 1 / -1;
    padding: var(--spacing-4);
    text-align: center;
    color: var(--theme-darker-color);
    font-size: 0.9rem;
  }
</style>
