<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte'
  import { CheckBox, Icon, IconFilter } from '@hcengineering/ui'
  import AdminUsersRow from './AdminUsersRow.svelte'
  import type { AccountListRow } from '@hcengineering/account-client'

  export let accounts: AccountListRow[] = []
  export let sort: { field: string, direction: 'asc' | 'desc' } | undefined = undefined
  export let loading: boolean = false
  export let columnFilters: Record<string, any> = {}
  export let selectedUuids: Set<string> = new Set()
  // Currently-open drawer uuid (single row marker, separate from bulk-
  // selection checkboxes). null → no drawer open.
  export let activeUuid: string | null = null

  type ColumnKey = 'name' | 'email' | 'auth' | 'workspace_count' | 'last_activity' | 'status'

  const dispatch = createEventDispatcher<{
    sort: typeof sort
    'row-click': { uuid: string }
    'open-filter': { column: ColumnKey, anchor: HTMLElement }
    'toggle-selection': { uuid: string, selected: boolean }
    'toggle-all': { selected: boolean }
  }>()

  let containerEl: HTMLElement
  let focusedIndex = -1

  function onKey (ev: KeyboardEvent): void {
    // Do not hijack keys when an input or textarea is focused.
    const tag = (document.activeElement as HTMLElement | null)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    if (containerEl == null || (!containerEl.contains(document.activeElement) && document.activeElement !== document.body)) return
    if (accounts.length === 0) return
    if (ev.key === 'ArrowDown') {
      ev.preventDefault()
      focusedIndex = Math.min(accounts.length - 1, focusedIndex + 1)
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault()
      focusedIndex = Math.max(0, focusedIndex - 1)
    } else if (ev.key === 'Enter' && focusedIndex >= 0) {
      ev.preventDefault()
      dispatch('row-click', { uuid: accounts[focusedIndex].uuid as string })
    } else if (ev.key === ' ' && focusedIndex >= 0) {
      ev.preventDefault()
      const uuid = String(accounts[focusedIndex].uuid)
      const wasSelected = selectedUuids.has(uuid)
      dispatch('toggle-selection', { uuid, selected: !wasSelected })
    }
  }

  onMount(() => {
    document.addEventListener('keydown', onKey)
  })
  onDestroy(() => {
    document.removeEventListener('keydown', onKey)
  })

  // Master-checkbox state: derived from current page contents
  $: visibleUuids = accounts.map((a) => a.uuid as string)
  $: selectedOnPage = visibleUuids.filter((u) => selectedUuids.has(u)).length
  $: allSelected = visibleUuids.length > 0 && selectedOnPage === visibleUuids.length

  function onToggleAll (e: CustomEvent<boolean>): void {
    dispatch('toggle-all', { selected: e.detail })
  }

  function onToggleRow (e: CustomEvent<{ uuid: string, selected: boolean }>): void {
    dispatch('toggle-selection', e.detail)
  }

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

  function openFilter (column: ColumnKey, anchor: HTMLElement): void {
    dispatch('open-filter', { column, anchor })
  }
</script>

<div aria-live="polite" class="sr-only">
  {#if !loading}Showing {accounts.length} user{accounts.length !== 1 ? 's' : ''}{/if}
</div>
<div class="users-table" bind:this={containerEl} tabindex="0" role="grid" aria-rowcount={accounts.length + 1} aria-busy={loading}>
  <div class="row head">
    <div class="cell cell-checkbox" on:click|stopPropagation>
      <CheckBox checked={allSelected} on:value={onToggleAll} />
    </div>
    <div class="cell cell-name sortable" class:is-sorted={sort?.field === 'name'}>
      <span class="hdr-label" on:click={() => setSort('name')}>{#if sort?.field === 'name'}<span class="arrow">{sort.direction === 'asc' ? '↑' : '↓'}</span>{/if}Name</span>
      <button
        class="filter-btn"
        class:active={columnFilters?.name != null}
        title="Filter by name"
        on:click|stopPropagation={(e) => openFilter('name', e.currentTarget)}
      >
        <Icon icon={IconFilter} size={'x-small'} />
      </button>
    </div>
    <div class="cell cell-email sortable" class:is-sorted={sort?.field === 'email'}>
      <span class="hdr-label" on:click={() => setSort('email')}>{#if sort?.field === 'email'}<span class="arrow">{sort.direction === 'asc' ? '↑' : '↓'}</span>{/if}Email</span>
      <button
        class="filter-btn"
        class:active={columnFilters?.email != null}
        title="Filter by email"
        on:click|stopPropagation={(e) => openFilter('email', e.currentTarget)}
      >
        <Icon icon={IconFilter} size={'x-small'} />
      </button>
    </div>
    <div class="cell cell-auth sortable" class:is-sorted={sort?.field === 'auth'}>
      <span class="hdr-label" on:click={() => setSort('auth')}>{#if sort?.field === 'auth'}<span class="arrow">{sort.direction === 'asc' ? '↑' : '↓'}</span>{/if}Auth</span>
      <button
        class="filter-btn"
        class:active={columnFilters?.auth != null}
        title="Filter by auth method"
        on:click|stopPropagation={(e) => openFilter('auth', e.currentTarget)}
      >
        <Icon icon={IconFilter} size={'x-small'} />
      </button>
    </div>
    <div class="cell cell-ws sortable" class:is-sorted={sort?.field === 'workspace_count'}>
      <span class="hdr-label" on:click={() => setSort('workspace_count')}>{#if sort?.field === 'workspace_count'}<span class="arrow">{sort.direction === 'asc' ? '↑' : '↓'}</span>{/if}Workspaces</span>
      <button
        class="filter-btn"
        class:active={columnFilters?.workspace_count != null}
        title="Filter by workspace count"
        on:click|stopPropagation={(e) => openFilter('workspace_count', e.currentTarget)}
      >
        <Icon icon={IconFilter} size={'x-small'} />
      </button>
    </div>
    <div class="cell cell-activity sortable" class:is-sorted={sort?.field === 'last_activity'}>
      <span class="hdr-label" on:click={() => setSort('last_activity')}>{#if sort?.field === 'last_activity'}<span class="arrow">{sort.direction === 'asc' ? '↑' : '↓'}</span>{/if}Last activity</span>
      <button
        class="filter-btn"
        class:active={columnFilters?.last_activity != null}
        title="Filter by last activity"
        on:click|stopPropagation={(e) => openFilter('last_activity', e.currentTarget)}
      >
        <Icon icon={IconFilter} size={'x-small'} />
      </button>
    </div>
    <div class="cell cell-status sortable" class:is-sorted={sort?.field === 'status'}>
      <span class="hdr-label" on:click={() => setSort('status')}>{#if sort?.field === 'status'}<span class="arrow">{sort.direction === 'asc' ? '↑' : '↓'}</span>{/if}Status</span>
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
    {#each accounts as account, idx (account.uuid)}
      <AdminUsersRow
        {account}
        selected={selectedUuids.has(String(account.uuid))}
        active={activeUuid === String(account.uuid)}
        focused={idx === focusedIndex}
        ariaRowIndex={idx + 2}
        on:click={() => onRowClick(account.uuid)}
        on:toggle-selection={onToggleRow}
      />
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
    /* Full-width table that fills whatever container it's in. Email
       and Last-activity stretch to claim the slack; Workspaces+Status
       stay narrow + fixed. */
    grid-template-columns:
      44px                 /* Selection checkbox */
      minmax(240px, 1.5fr) /* Name + avatar + admin badge */
      minmax(240px, 2fr)   /* Email             */
      minmax(140px, 0.7fr) /* Auth              */
      100px                /* Workspaces (num)  */
      minmax(140px, 1fr)   /* Last activity     */
      120px;               /* Status            */
    align-items: stretch;
    width: 100%;
    background: var(--theme-bg-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--medium-BorderRadius, 0.5rem);
    overflow: hidden;
  }

  .row {
    display: contents;
  }

  .head .cell {
    min-height: 44px;
    padding: 0 1rem;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--theme-darker-color);
    background: var(--theme-bg-accent-color);
    border-bottom: 1px solid var(--theme-divider-color);
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  /* All header labels left-aligned (default justify-content of .cell
     is flex-start). cell-ws + cell-status used to be right-aligned;
     they are now left so headers match the (now also left-aligned)
     row content underneath. */

  .head .cell-checkbox {
    justify-content: center;
    padding: 0;
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
    margin-right: 0.15rem;
    color: var(--theme-caption-color);
    font-weight: 700;
  }

  /* Header cell currently sorted by: tinted bg + caption-colored label
     so the active sort is obvious without needing to read the arrow. */
  .head .cell.is-sorted {
    background: var(--theme-bg-color);
    color: var(--theme-caption-color);
    font-weight: 600;
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
    /* Stay quiet until used. Hovered or active states call attention. */
    opacity: 0.35;
    transition: opacity 80ms ease, color 80ms ease, background 80ms ease;

    &:hover {
      opacity: 1;
      color: var(--theme-caption-color);
      background: var(--theme-divider-color);
    }

    &.active {
      /* Filter currently applied to this column — show it. */
      opacity: 1;
      color: #2563eb;
      background: rgba(96, 165, 250, 0.18);
    }
  }

  .empty {
    grid-column: 1 / -1;
    padding: var(--spacing-4);
    text-align: center;
    color: var(--theme-darker-color);
    font-size: 0.9rem;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
