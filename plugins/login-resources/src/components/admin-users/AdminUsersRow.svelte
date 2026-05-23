<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import type { AccountListRow } from '@hcengineering/account-client'

  export let account: AccountListRow

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

<div class="users-table-row" on:click on:keydown role="button" tabindex="0">
  <div class="cell cell-name">
    <span class="avatar">{initials(account.firstName, account.lastName)}</span>
    <div class="name-block">
      <span class="full-name">{account.firstName} {account.lastName}</span>
      {#if account.isAdmin}
        <span class="badge admin-badge">Admin</span>
      {/if}
    </div>
  </div>
  <div class="cell cell-email">{account.primaryEmail ?? '—'}</div>
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
  .cell {
    padding: 0.65rem 0.85rem;
    color: var(--theme-content-color);
    font-size: 0.875rem;
    min-width: 0;
  }

  .cell-name {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .avatar {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-divider-color);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--theme-caption-color);
    letter-spacing: 0.02em;
  }

  .name-block {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
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
    flex-wrap: nowrap;
    gap: 0.25rem;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.05rem 0.4rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    line-height: 1.4;
    height: 18px;
  }

  .admin-badge {
    background: rgba(245, 158, 11, 0.12);
    color: var(--theme-warning-color, #b45309);
    border: 1px solid rgba(245, 158, 11, 0.3);
    width: fit-content;
  }

  .auth-badge {
    background: transparent;
    color: var(--theme-darker-color);
    border: 1px solid var(--theme-divider-color);
    font-family: var(--mono-font, 'SF Mono', 'Menlo', 'Consolas', monospace);
    letter-spacing: 0;
    text-transform: lowercase;
    padding: 0.05rem 0.35rem;
  }

  .auth-badge + .auth-badge {
    margin-left: 0.2rem;
  }

  .muted {
    color: var(--theme-darker-color);
  }

  .cell-ws {
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: var(--theme-caption-color);
  }

  .cell-activity {
    font-size: 0.82rem;
    color: var(--theme-darker-color);
    white-space: nowrap;
  }

  .cell-status {
    text-align: right;
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
    display: inline-block;
  }

  .status-active {
    background: var(--theme-state-positive-background-color, rgba(16, 185, 129, 0.12));
    color: var(--theme-state-positive-color, #047857);
    .status-dot { background: var(--theme-state-positive-color, #10b981); }
  }

  .status-disabled {
    background: var(--theme-state-negative-background-color, rgba(239, 68, 68, 0.1));
    color: var(--theme-state-negative-color, #b91c1c);
    .status-dot { background: var(--theme-state-negative-color, #ef4444); }
  }
</style>
