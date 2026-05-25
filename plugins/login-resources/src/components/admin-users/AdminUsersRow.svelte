<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { CheckBox } from '@hcengineering/ui'
  import type { AccountListRow } from '@hcengineering/account-client'
  import { getAccountClient } from '../../utils'

  export let account: AccountListRow
  export let selected: boolean = false
  // True when this row's drawer is currently open. Adds .is-active so the
  // row is visually marked while the drawer is shown, removing the need
  // for a full-screen dimming scrim.
  export let active: boolean = false
  // Keyboard-focused row (ArrowUp/ArrowDown from the parent table).
  export let focused: boolean = false
  // aria-rowindex for accessibility (header row = 1, first body row = 2).
  export let ariaRowIndex: number | undefined = undefined

  const dispatch = createEventDispatcher<{
    'toggle-selection': { uuid: string, selected: boolean }
  }>()

  function onCheckboxToggle (e: CustomEvent<boolean>): void {
    dispatch('toggle-selection', { uuid: account.uuid as string, selected: e.detail })
  }

  function formatLastActivity (ts: number | null): string {
    if (ts == null) return 'Never'
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

  // Admin-badge hover: lazily fetch ADMIN_EMAILS from account-pod.
  let adminEmails: string[] = []
  let adminEmailsLoaded = false
  let adminBadgeTitle = 'Instance administrator — hover to load admin list'

  async function onAdminBadgeHover (): Promise<void> {
    if (adminEmailsLoaded) return
    try {
      const res = await getAccountClient().getAdminEmails()
      adminEmails = res.emails
      adminEmailsLoaded = true
      adminBadgeTitle = adminEmails.length > 0
        ? `Configured via ADMIN_EMAILS\nAdmins: ${adminEmails.join(', ')}`
        : 'Configured via ADMIN_EMAILS\n(no emails configured)'
    } catch {
      adminEmailsLoaded = true
      adminBadgeTitle = 'Instance administrator'
    }
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="row body" role="row" aria-rowindex={ariaRowIndex} class:is-active={active} class:is-focused={focused} on:click>
  <div class="cell cell-checkbox" on:click|stopPropagation>
    <CheckBox checked={selected} on:value={onCheckboxToggle} />
  </div>
  <div class="cell cell-name" title={`${account.firstName} ${account.lastName}`.trim()}>
    <span class="avatar">{initials(account.firstName, account.lastName)}</span>
    <span class="full-name">{account.firstName} {account.lastName}</span>
    {#if account.isAdmin}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <span
        class="badge admin-badge"
        title={adminBadgeTitle}
        on:mouseenter={() => { void onAdminBadgeHover() }}
      >Admin</span>
    {/if}
  </div>
  <div class="cell cell-email" title={account.primaryEmail ?? ''}>
    <span class="email-text">{account.primaryEmail ?? 'No email'}</span>
  </div>
  <div class="cell cell-auth">
    {#each account.authMethods as m}
      <span class="badge auth-badge">{m}</span>
    {/each}
    {#if account.authMethods.length === 0}
      <span class="muted">—</span>
    {/if}
  </div>
  <div class="cell cell-ws">
    {account.workspaceCount}
    {#if account.status === 'active' && account.workspaceCount === 0}
      <span class="orphan-badge" title="Active account with no workspaces">orphan</span>
    {/if}
  </div>
  <div class="cell cell-activity last-activity-cell"
       title={account.lastActivityAt != null ? new Date(account.lastActivityAt).toISOString() : 'Never'}>
    {formatLastActivity(account.lastActivityAt)}
  </div>
  <div class="cell cell-status">
    <span class="status status-{account.status}">
      <span class="status-dot" aria-label={account.status} aria-hidden="false" />
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
  /* Row uses display:contents so its cells participate in the parent
     .users-table grid → columns align across rows. Each cell gets the
     same fixed min-height so a row with badges next to a row without is
     not visually shorter or taller. */
  .row {
    display: contents;
    cursor: pointer;
  }

  .cell {
    /* min-height makes every row exactly 56px regardless of cell content
       (Material data-table standard). */
    min-height: 56px;
    padding: 0 1rem;
    color: var(--theme-content-color);
    font-size: 0.875rem;
    line-height: 1.3;
    border-bottom: 1px solid var(--theme-divider-color);
    min-width: 0;
    background: var(--theme-bg-color);
    transition: background 80ms ease;
    display: flex;
    align-items: center;
  }

  .row:hover .cell {
    background: var(--theme-list-row-color, rgba(96, 165, 250, 0.06));
  }

  /* Marker for the row whose drawer is currently open. Stronger than
     hover so it's obvious even when the cursor moves away to interact
     with the drawer. Left bar on the first cell anchors the eye. */
  .row.is-active .cell {
    background: rgba(96, 165, 250, 0.14);
  }
  .row.is-active .cell-checkbox {
    box-shadow: inset 3px 0 0 #2563eb;
  }

  /* Keyboard-focused row: 2px blue outline on all cells so keyboard
     users can see which row ArrowUp/ArrowDown has landed on. */
  .row.is-focused .cell {
    outline: 2px solid #2563eb;
    outline-offset: -2px;
  }

  .cell-checkbox {
    justify-content: center;
    padding: 0;
  }

  .cell-name {
    gap: 0.6rem;
  }

  .avatar {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
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

  .full-name {
    color: var(--theme-caption-color);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .cell-email {
    /* No mono-font here — email is part of the user-row visual hierarchy
       and the mono-font made it feel like a code dump. */
    font-size: 0.82rem;
    color: var(--theme-darker-color);
    /* flex+center already inherited from .cell */
    overflow: hidden;
  }

  .email-text {
    /* Truncation needs the text in its own block-ish span; the cell is
       a flex container so we can't put ellipsis on it directly. */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
  }

  .cell-auth {
    flex-wrap: nowrap;
    gap: 0.3rem;
    overflow: hidden;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    line-height: 1;
    height: 20px;
    flex-shrink: 0;
  }

  .admin-badge {
    background: rgba(245, 158, 11, 0.14);
    color: var(--theme-warning-color, #b45309);
    border: 1px solid rgba(245, 158, 11, 0.32);
    text-transform: uppercase;
    padding: 0 0.45rem;
    margin-left: 0.3rem;
  }

  .auth-badge {
    background: var(--theme-bg-accent-color);
    color: var(--theme-darker-color);
    border: 1px solid var(--theme-divider-color);
    text-transform: lowercase;
    padding: 0 0.5rem;
    letter-spacing: 0.02em;
  }

  .muted {
    color: var(--theme-darker-color);
  }

  .cell-ws {
    /* Left-aligned to match the header above and the visual rhythm of
       the other text columns. Number stays tabular-nums so it does
       not shift when sorted. */
    justify-content: flex-start;
    text-align: left;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    color: var(--theme-caption-color);
    gap: 0.4rem;
  }

  /* Issue 14: row-level orphan marker. Renders next to the "0" in the
     WORKSPACES column when an account is active but has no workspace
     associations, so admins can spot orphans by scanning the table
     even without the filter active. */
  .orphan-badge {
    display: inline-block;
    padding: 0.05rem 0.4rem;
    border-radius: 999px;
    background: rgba(245, 158, 11, 0.14);
    color: var(--theme-warning-color, #b45309);
    border: 1px solid rgba(245, 158, 11, 0.32);
    font-size: 0.65rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .cell-activity {
    font-size: 0.82rem;
    color: var(--theme-darker-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-variant-numeric: tabular-nums;
  }

  .last-activity-cell {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 12rem;
  }

  .cell-status {
    /* Left-aligned status pill so the column header (left-aligned)
       sits directly above the pill, matching the other columns. */
    justify-content: flex-start;
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.2rem 0.6rem 0.2rem 0.55rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 500;
    text-transform: capitalize;
    line-height: 1;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-active {
    background: rgba(16, 185, 129, 0.10);
    color: #059669;
    .status-dot { background: #10b981; }
  }

  /* Disabled is visually heavier than Active so a single disabled row
     in a sea of active ones pops out when scanning. */
  .status-disabled {
    background: rgba(239, 68, 68, 0.18);
    color: #b91c1c;
    font-weight: 600;
    border: 1px solid rgba(239, 68, 68, 0.4);
    padding: 0.2rem 0.55rem;
    .status-dot { background: #dc2626; box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.18); }
  }
</style>
