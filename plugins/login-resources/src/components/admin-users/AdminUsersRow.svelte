<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { CheckBox } from '@hcengineering/ui'
  import type { AccountListRow } from '@hcengineering/account-client'

  export let account: AccountListRow
  export let selected: boolean = false

  const dispatch = createEventDispatcher<{
    'toggle-selection': { uuid: string, selected: boolean }
  }>()

  function onCheckboxToggle (e: CustomEvent<boolean>): void {
    dispatch('toggle-selection', { uuid: account.uuid as string, selected: e.detail })
  }

  function formatLastActivity (ts: number | null): string {
    if (ts == null) return '—'
    const delta = Date.now() - ts
    if (delta < 60_000) return 'just now'
    if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`
    if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`
    if (delta < 7 * 86_400_000) return `${Math.floor(delta / 86_400_000)}d ago`
    return new Date(ts).toLocaleDateString()
  }

  function initials (first: string, last: string): string {
    return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase() || '?'
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="row body" on:click>
  <div class="cell cell-checkbox" on:click|stopPropagation>
    <CheckBox checked={selected} on:value={onCheckboxToggle} />
  </div>
  <div class="cell cell-name">
    <span class="avatar">{initials(account.firstName, account.lastName)}</span>
    <div class="name-block">
      <span class="full-name">{account.firstName} {account.lastName}</span>
      {#if account.isAdmin}
        <span class="badge admin-badge">Admin</span>
      {/if}
    </div>
  </div>
  <div class="cell cell-email" title={account.primaryEmail ?? ''}>
    {account.primaryEmail ?? '—'}
  </div>
  <div class="cell cell-auth">
    {#each account.authMethods as m}
      <span class="badge auth-badge">{m}</span>
    {/each}
    {#if account.authMethods.length === 0}
      <span class="muted">—</span>
    {/if}
  </div>
  <div class="cell cell-ws">{account.workspaceCount}</div>
  <div class="cell cell-activity"
       title={account.lastActivityAt != null ? new Date(account.lastActivityAt).toLocaleString() : ''}>
    {formatLastActivity(account.lastActivityAt)}
  </div>
  <div class="cell cell-status">
    <span class="status status-{account.status}">
      <span class="status-dot" />
      {account.status}
    </span>
  </div>
</div>

<style lang="scss">
  /*
   * .row uses display:contents so its 6 cells participate in the parent
   * .users-table grid → columns align across all rows.
   * Cells get padding + border-bottom directly so visual rows still feel
   * coherent without a wrapper element.
   */
  .row {
    display: contents;
    cursor: pointer;
  }

  .cell {
    padding: 0.65rem 0.85rem;
    color: var(--theme-content-color);
    font-size: 0.875rem;
    border-bottom: 1px solid var(--theme-divider-color);
    min-width: 0;
    background: var(--theme-bg-color);
    transition: background 80ms ease;
  }

  .row:hover .cell {
    background: var(--theme-popup-hover);
  }

  .cell-checkbox {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.4rem 0;
  }

  .cell-name {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .avatar {
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-divider-color);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--theme-caption-color);
    letter-spacing: 0.02em;
  }

  .name-block {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }

  .full-name {
    color: var(--theme-caption-color);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cell-email {
    font-family: var(--mono-font, 'SF Mono', 'Menlo', 'Consolas', monospace);
    font-size: 0.82rem;
    color: var(--theme-darker-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cell-auth {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 0.25rem;
    overflow: hidden;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    line-height: 1.4;
    height: 18px;
  }

  .admin-badge {
    background: rgba(245, 158, 11, 0.12);
    color: var(--theme-warning-color, #b45309);
    border: 1px solid rgba(245, 158, 11, 0.3);
    text-transform: uppercase;
    padding: 0.05rem 0.4rem;
    width: fit-content;
  }

  .auth-badge {
    background: transparent;
    color: var(--theme-darker-color);
    border: 1px solid var(--theme-divider-color);
    font-family: var(--mono-font, 'SF Mono', 'Menlo', 'Consolas', monospace);
    text-transform: lowercase;
    padding: 0.05rem 0.4rem;
  }

  .muted {
    color: var(--theme-darker-color);
  }

  .cell-ws {
    justify-self: end;
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: var(--theme-caption-color);
  }

  .cell-activity {
    font-size: 0.82rem;
    color: var(--theme-darker-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cell-status {
    justify-self: end;
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.1rem 0.55rem 0.1rem 0.5rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 500;
    text-transform: capitalize;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .status-active {
    background: rgba(16, 185, 129, 0.12);
    color: #059669;
    .status-dot { background: #10b981; }
  }

  .status-disabled {
    background: rgba(239, 68, 68, 0.1);
    color: #dc2626;
    .status-dot { background: #ef4444; }
  }
</style>
