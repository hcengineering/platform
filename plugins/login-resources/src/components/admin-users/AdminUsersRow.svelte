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
    return new Date(ts).toLocaleDateString()
  }
</script>

<tr on:click>
  <td class="name">
    {account.firstName} {account.lastName}
    {#if account.isAdmin}
      <span class="badge admin" title="Instance admin">Admin</span>
    {/if}
  </td>
  <td>{account.primaryEmail ?? '—'}</td>
  <td>
    {#each account.authMethods as m}
      <span class="badge auth">{m}</span>
    {/each}
  </td>
  <td>{account.workspaceCount}</td>
  <td title={account.lastActivityAt != null ? new Date(account.lastActivityAt).toLocaleString() : ''}>
    {formatLastActivity(account.lastActivityAt)}
  </td>
  <td>
    <span class="status status-{account.status}">{account.status}</span>
  </td>
</tr>

<style lang="scss">
  tr {
    cursor: pointer;
  }
  tr:hover {
    background: var(--theme-bg-accent-color);
  }
  .badge {
    display: inline-block;
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    background: var(--theme-bg-accent-color);
    font-size: 0.7rem;
    margin-right: 0.25rem;
  }
  .badge.admin {
    background: rgba(218, 165, 32, 0.2);
    color: rgb(180, 130, 0);
  }
  .status {
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    font-size: 0.75rem;
  }
  .status-active {
    background: rgba(40, 167, 69, 0.15);
    color: rgb(40, 130, 50);
  }
  .status-disabled {
    background: rgba(220, 53, 69, 0.15);
    color: rgb(180, 40, 55);
  }
</style>
