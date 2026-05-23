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

<tr on:click>
  <td class="cell-name">
    <span class="avatar">{initials(account.firstName, account.lastName)}</span>
    <div class="name-block">
      <span class="full-name">{account.firstName} {account.lastName}</span>
      {#if account.isAdmin}
        <span class="badge admin">Admin</span>
      {/if}
    </div>
  </td>
  <td class="email">{account.primaryEmail ?? '—'}</td>
  <td class="auth">
    {#each account.authMethods as m}
      <span class="badge auth-badge">{m}</span>
    {/each}
    {#if account.authMethods.length === 0}
      <span class="muted">—</span>
    {/if}
  </td>
  <td class="col-num">{account.workspaceCount}</td>
  <td class="last-activity"
      title={account.lastActivityAt != null ? new Date(account.lastActivityAt).toLocaleString() : ''}>
    {formatLastActivity(account.lastActivityAt)}
  </td>
  <td class="col-status">
    <span class="status status-{account.status}">
      <span class="status-dot" />
      {account.status}
    </span>
  </td>
</tr>

<style lang="scss">
  tr {
    cursor: pointer;
    transition: background 80ms ease;

    &:hover {
      background: var(--theme-popup-hover);
    }
  }

  td {
    padding: 0.7rem 1rem;
    border-bottom: 1px solid var(--theme-divider-color);
    color: var(--theme-content-color);
    vertical-align: middle;
  }

  .cell-name {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .avatar {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--theme-bg-accent-color), var(--theme-popup-color));
    border: 1px solid var(--theme-divider-color);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--theme-caption-color);
    letter-spacing: 0.02em;
  }

  .name-block {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .full-name {
    color: var(--theme-caption-color);
    font-weight: 500;
  }

  .email {
    font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
    font-size: 0.85rem;
    opacity: 0.85;
  }

  .auth {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    line-height: 1.4;
  }

  .badge.admin {
    background: rgba(245, 158, 11, 0.12);
    color: #b45309;
    border: 1px solid rgba(245, 158, 11, 0.3);
    width: fit-content;
  }

  .auth-badge {
    background: var(--theme-bg-accent-color);
    color: var(--theme-content-color);
    border: 1px solid var(--theme-divider-color);
  }

  .muted {
    color: var(--theme-content-color);
    opacity: 0.4;
  }

  .col-num {
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: var(--theme-caption-color);
  }

  .last-activity {
    font-size: 0.85rem;
    color: var(--theme-content-color);
    opacity: 0.85;
    white-space: nowrap;
  }

  .col-status {
    text-align: right;
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.15rem 0.55rem 0.15rem 0.5rem;
    border-radius: 999px;
    font-size: 0.75rem;
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
    background: rgba(16, 185, 129, 0.1);
    color: #047857;

    .status-dot {
      background: #10b981;
    }
  }

  .status-disabled {
    background: rgba(239, 68, 68, 0.1);
    color: #b91c1c;

    .status-dot {
      background: #ef4444;
    }
  }
</style>
