<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import { getAccountClient } from '../../utils'
  import type { AccountDetailsResponse, AuditEntry } from '@hcengineering/account-client'
  import { AccountRole, type AccountUuid } from '@hcengineering/core'
  import {
    Button,
    ButtonIcon,
    IconAdd,
    IconChevronLeft,
    IconChevronRight,
    IconClose,
    IconCopy,
    IconDelete,
    Label,
    Scroller,
    DropdownLabelsIntl,
    showPopup,
    type DropdownIntlItem
  } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { copyTextToClipboard } from '@hcengineering/presentation'
  import AddToWorkspacePopup from './AddToWorkspacePopup.svelte'
  import AuditEmptyState from '../admin-shell/AuditEmptyState.svelte'
  import { confirmAction, notify } from './util'

  export let accountUuid: AccountUuid
  // Optional: parent passes the ordered list of currently-visible uuids so
  // the drawer can offer Prev / Next navigation without closing first.
  // Defaults to empty → pager is hidden if not provided.
  export let visibleUuids: string[] = []

  const dispatch = createEventDispatcher<{
    close: void
    'account-changed': void
    navigate: { uuid: string }
  }>()

  // Pager position is purely derived from props.
  $: pagerIndex = visibleUuids.indexOf(accountUuid)
  $: pagerTotal = visibleUuids.length
  $: hasPrev = pagerIndex > 0
  $: hasNext = pagerIndex >= 0 && pagerIndex < pagerTotal - 1

  function goPrev (): void {
    if (hasPrev) dispatch('navigate', { uuid: visibleUuids[pagerIndex - 1] })
  }
  function goNext (): void {
    if (hasNext) dispatch('navigate', { uuid: visibleUuids[pagerIndex + 1] })
  }
  let details: AccountDetailsResponse | null = null
  let loading = true
  let errorMessage: string | null = null
  let busy = false

  const roleItems: DropdownIntlItem[] = [
    { id: AccountRole.User, label: getEmbeddedLabel('User') },
    { id: AccountRole.Maintainer, label: getEmbeddedLabel('Maintainer') },
    { id: AccountRole.Owner, label: getEmbeddedLabel('Owner') },
    { id: AccountRole.Guest, label: getEmbeddedLabel('Guest') }
  ]

  async function load (): Promise<void> {
    loading = true
    errorMessage = null
    try {
      details = await getAccountClient().getAccountDetails(accountUuid)
    } catch (err: any) {
      errorMessage = err?.message ?? 'Failed to load account'
    } finally {
      loading = false
    }
  }

  // Refetch whenever the parent switches to a different row without
  // re-mounting the drawer (clicking another user row).
  let loadedUuid: string | null = null
  $: if (accountUuid !== loadedUuid) {
    loadedUuid = accountUuid
    void load()
  }

  // Outside-click closes the drawer. But:
  //   • Clicks INSIDE the drawer must not close it.
  //   • Clicks on another user row should SWITCH the drawer's account,
  //     not close it (the row's own click handler dispatches row-click,
  //     parent then updates accountUuid).
  //   • Clicks inside any popup spawned BY the drawer (MessageBox,
  //     dropdowns) must not close it.
  let drawerEl: HTMLElement

  function onDocPointerDown (ev: MouseEvent): void {
    const target = ev.target as HTMLElement | null
    if (target == null) return
    if (drawerEl?.contains(target)) return
    // Any click within the users-table (row, header, checkbox cell)
    // stays — switching to another row must not close + reopen.
    if (target.closest('.users-table') != null) return
    // Popup layers rendered outside the drawer DOM declare themselves with
    // data-drawer-keep-open on their root element. One residual upstream
    // coupling: MessageBox (presentation pkg) cannot be modified from here,
    // so we keep .popup as a single-class fallback. Down from six to one
    // upstream selector.
    if (target.closest('[data-drawer-keep-open], .popup') != null) return
    tryClose()
  }

  function onKeyDown (ev: KeyboardEvent): void {
    if (ev.key === 'Escape') tryClose()
  }

  onMount(() => {
    // Initial load is handled by the reactive block above (loadedUuid null → run).
    document.addEventListener('mousedown', onDocPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
  })

  onDestroy(() => {
    document.removeEventListener('mousedown', onDocPointerDown, true)
    document.removeEventListener('keydown', onKeyDown)
  })

  // Truncate long IDs (HULY uuid, OIDC sub hash) to head…tail so a long
  // value stays on one line. The full value still sits on the title attr.
  function truncateMiddle (s: string, head: number, tail: number): string {
    if (s.length <= head + tail + 1) return s
    return `${s.slice(0, head)}…${s.slice(-tail)}`
  }

  async function onChangeRole (workspaceUuid: string, newRole: AccountRole): Promise<void> {
    busy = true
    try {
      await getAccountClient().setWorkspaceMemberRole(accountUuid, workspaceUuid as any, newRole)
      await load()
      dispatch('account-changed')
    } catch (err: any) {
      if (err?.status?.code === 'last_owner_in_workspace') {
        notify('Cannot demote last Owner', 'There must be at least one Owner per workspace.', true)
      } else {
        notify('Failed to change role', err?.message ?? String(err), true)
      }
    } finally {
      busy = false
    }
  }

  function onRemoveFromWorkspace (workspaceUuid: string, workspaceName: string): void {
    confirmAction(
      'Remove from workspace',
      `Remove this user from "${workspaceName}"?`,
      true,
      async () => {
        busy = true
        try {
          await getAccountClient().removeWorkspaceMember(accountUuid, workspaceUuid as any)
          await load()
          dispatch('account-changed')
        } catch (err: any) {
          if (err?.status?.code === 'last_owner_in_workspace') {
            notify('Cannot remove last Owner', 'There must be at least one Owner per workspace.', true)
          } else {
            notify('Failed to remove member', err?.message ?? String(err), true)
          }
        } finally {
          busy = false
        }
      }
    )
  }

  function openAddToWorkspace (): void {
    if (details == null) return
    const excluded = details.workspaceMemberships.map((m) => m.workspaceUuid as string)
    showPopup(
      AddToWorkspacePopup,
      { accountUuid: details.uuid, excludedWorkspaceUuids: excluded },
      'middle',
      (updated: AccountDetailsResponse | undefined) => {
        if (updated != null) {
          details = updated
          dispatch('account-changed')
        }
      }
    )
  }

  function onTriggerPasswordReset (): void {
    confirmAction(
      'Send password-reset email',
      'A password-reset email will be sent to the user\'s primary email address. Continue?',
      false,
      async () => {
        busy = true
        try {
          const res = await getAccountClient().triggerPasswordReset(accountUuid)
          notify('Email sent', `Password-reset email sent to ${res.emailSentTo}.`)
        } catch (err: any) {
          const code = err?.status?.code
          if (code === 'user_has_no_password' || code === 'user_has_no_email') {
            notify('Not applicable', 'This user signs in via OIDC only — password reset does not apply.', true)
          } else {
            notify('Failed to send password reset', err?.message ?? String(err), true)
          }
        } finally {
          busy = false
        }
      }
    )
  }

  function onDisable (): void {
    confirmAction(
      'Disable account',
      'Active sessions will be terminated and the user will be unable to log in until you re-enable the account. Continue?',
      true,
      async () => {
        busy = true
        try {
          await getAccountClient().disableAccount(accountUuid)
          await load()
          dispatch('account-changed')
        } catch (err: any) {
          const code = err?.status?.code
          if (code === 'cannot_self_disable') {
            notify('Cannot disable yourself', 'You cannot disable your own account.', true)
          } else if (code === 'last_admin') {
            notify('Last admin', 'Cannot disable the last admin. At least one active admin must remain.', true)
          } else {
            notify('Failed to disable account', err?.message ?? String(err), true)
          }
        } finally {
          busy = false
        }
      }
    )
  }

  function onEnable (): void {
    confirmAction('Re-enable account', 'Allow this user to log in again. Continue?', false, async () => {
      busy = true
      try {
        await getAccountClient().enableAccount(accountUuid)
        await load()
        dispatch('account-changed')
      } catch (err: any) {
        notify('Failed to enable account', err?.message ?? String(err), true)
      } finally {
        busy = false
      }
    })
  }

  function onCopyUuid (): void {
    void copyTextToClipboard(String(accountUuid))
    notify('Copied', 'Account UUID copied to clipboard.')
  }

  function onCopyEmail (): void {
    if (details?.primaryEmail == null || details.primaryEmail === '') {
      notify('No email', 'This user has no primary email.', true)
      return
    }
    void copyTextToClipboard(details.primaryEmail)
    notify('Copied', `Email ${details.primaryEmail} copied.`)
  }

  function tryClose (): void {
    if (busy) {
      confirmAction(
        'Close while busy?',
        'An operation is still in progress. Close anyway?',
        false,
        async () => { dispatch('close') }
      )
      return
    }
    dispatch('close')
  }

  function onClose (): void {
    tryClose()
  }

  function initials (first: string, last: string): string {
    return ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase() || '?'
  }

  // ── Audit tab ──────────────────────────────────────────────────────────────
  let auditTab = false
  let auditEntries: AuditEntry[] = []
  let auditLoading = false
  let actionFilter = ''
  $: visibleAuditEntries = actionFilter.trim() === ''
    ? auditEntries
    : auditEntries.filter((e) => e.action.toLowerCase().includes(actionFilter.trim().toLowerCase()))

  // Plan 1d Task 3 — Group consecutive same-batchId entries under a
  // non-interactive header. Same logic as AdminAudit.svelte.
  interface AuditEntryGroup {
    batchId: string | null
    entries: AuditEntry[]
  }
  $: visibleAuditGroups = ((): AuditEntryGroup[] => {
    const out: AuditEntryGroup[] = []
    let current: AuditEntryGroup | null = null
    for (const e of visibleAuditEntries) {
      const bid = e.batchId ?? null
      if (current != null && bid != null && current.batchId === bid) {
        current.entries.push(e)
      } else {
        current = { batchId: bid, entries: [e] }
        out.push(current)
      }
    }
    return out
  })()

  async function loadAudit (): Promise<void> {
    auditLoading = true
    try {
      const res = await getAccountClient().listAuditAdmin({
        filter: { targetAccountUuid: accountUuid },
        pagination: { limit: 50 }
      })
      auditEntries = res.entries
    } finally {
      auditLoading = false
    }
  }

  $: if (auditTab && accountUuid != null) {
    void loadAudit()
  }

</script>

<aside class="drawer hulyComponent" role="dialog" aria-modal="true" bind:this={drawerEl}>
  <div class="drawer-header">
    <div class="drawer-title">
      <Label label={getEmbeddedLabel('Account details')} />
    </div>
    {#if pagerTotal > 1 && pagerIndex >= 0}
      <div class="drawer-pager">
        <ButtonIcon
          icon={IconChevronLeft}
          kind={'tertiary'}
          size={'small'}
          disabled={!hasPrev}
          on:click={goPrev}
        />
        <span class="pager-pos">{pagerIndex + 1} / {pagerTotal}</span>
        <ButtonIcon
          icon={IconChevronRight}
          kind={'tertiary'}
          size={'small'}
          disabled={!hasNext}
          on:click={goNext}
        />
      </div>
    {/if}
    <!-- Plain <button> instead of ButtonIcon so we can attach an
         aria-label — ButtonIcon/ButtonBase don't forward aria-* props, and
         a11y rule for icon-only close buttons (WCAG 4.1.2) trumps visual
         consistency here. Visual size matches ButtonIcon size="small". -->
    <button class="drawer-close" on:click={onClose} aria-label="Close drawer">
      <IconClose size={'small'} />
    </button>
  </div>

  <div class="drawer-tabs">
    <button class:active={!auditTab} on:click={() => { auditTab = false }}>Details</button>
    <button class:active={auditTab} on:click={() => { auditTab = true }}>Audit ({auditEntries.length})</button>
  </div>

  <Scroller>
    <div class="drawer-body">
      {#if !auditTab}
      {#if loading}
        <div class="state">Loading…</div>
      {:else if errorMessage != null}
        <div class="state error">{errorMessage}</div>
      {:else if details != null}
        <div class="profile">
          <div class="avatar">{initials(details.firstName, details.lastName)}</div>
          <div class="profile-info">
            <h3>{details.firstName} {details.lastName}</h3>
            <span class="status status-{details.status}">
              <span class="status-dot" />
              {details.status}
            </span>
          </div>
          <div class="copy-actions">
            <ButtonIcon
              icon={IconCopy}
              kind={'tertiary'}
              size={'small'}
              on:click={onCopyUuid}
              showTooltip={{ label: getEmbeddedLabel('Copy UUID') }}
            />
            <ButtonIcon
              icon={IconCopy}
              kind={'tertiary'}
              size={'small'}
              on:click={onCopyEmail}
              showTooltip={{ label: getEmbeddedLabel('Copy email') }}
            />
          </div>
        </div>

        <section>
          <div class="section-title">Identities</div>
          {#if details.socialIds.length === 0}
            <p class="muted">No identities linked.</p>
          {:else}
            <ul class="identity-list">
              {#each details.socialIds as sid}
                <li class="flex-row-center p-2">
                  <span class="badge type">{sid.type}</span>
                  <!-- Email values stay full; long hash IDs (HULY uuid, OIDC sub
                       hash) are truncated middle so the row keeps one line. The
                       full value is on the title attribute for click-and-hold
                       inspection. -->
                  <span class="value" title={sid.value}>
                    {#if sid.type === 'email'}
                      {sid.value}
                    {:else}
                      {truncateMiddle(sid.value, 10, 6)}
                    {/if}
                  </span>
                  {#if sid.verified}
                    <span class="badge verified">verified</span>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </section>

        <section>
          <div class="section-title">
            Workspaces <span class="count">({details.workspaceMemberships.length})</span>
          </div>
          {#if details.workspaceMemberships.length === 0}
            <p class="muted">Not a member of any workspace.</p>
          {:else}
            <ul class="ws-list">
              {#each details.workspaceMemberships as m}
                <li class="flex-row-center p-2">
                  <div class="ws-name-block">
                    <strong>{m.workspaceName}</strong>
                    <span class="ws-url">{m.workspaceUrl}</span>
                  </div>
                  <DropdownLabelsIntl
                    items={roleItems}
                    selected={m.role}
                    kind={'regular'}
                    size={'small'}
                    disabled={busy}
                    on:selected={(e) => onChangeRole(m.workspaceUuid, parseRole(e.detail))}
                  />
                  <ButtonIcon
                    icon={IconDelete}
                    kind={'tertiary'}
                    size={'small'}
                    disabled={busy}
                    on:click={() => onRemoveFromWorkspace(m.workspaceUuid, m.workspaceName)}
                  />
                </li>
              {/each}
            </ul>
          {/if}
          <div class="add-row">
            <Button
              kind={'regular'}
              size={'small'}
              icon={IconAdd}
              label={getEmbeddedLabel('Add to workspace')}
              disabled={busy}
              on:click={openAddToWorkspace}
            />
          </div>
        </section>

        <section>
          <div class="section-title">Activity</div>
          <div class="info-grid">
            <span class="label">Last activity</span>
            <span class="value-plain">
              {details.lastActivityAt != null ? new Date(details.lastActivityAt).toLocaleString() : 'Never'}
            </span>
            {#if details.disabledAt != null}
              <span class="label">Disabled at</span>
              <span class="value-plain">{new Date(details.disabledAt).toLocaleString()}</span>
            {/if}
          </div>
        </section>

        <section>
          <div class="section-title">Actions</div>
          <div class="actions-stack">
            <!-- Password reset is the daily-routine action; full-width primary. -->
            <Button
              kind={'primary'}
              size={'medium'}
              label={getEmbeddedLabel('Send password-reset email')}
              disabled={busy}
              on:click={onTriggerPasswordReset}
            />
            <!-- Disable / re-enable are rarer + destructive; compact secondary row. -->
            <div class="actions-secondary">
              {#if details.status === 'active'}
                <Button
                  kind={'dangerous'}
                  size={'small'}
                  label={getEmbeddedLabel('Disable account')}
                  disabled={busy}
                  on:click={onDisable}
                />
              {:else}
                <Button
                  kind={'regular'}
                  size={'small'}
                  label={getEmbeddedLabel('Re-enable account')}
                  disabled={busy}
                  on:click={onEnable}
                />
              {/if}
            </div>
          </div>
        </section>
      {/if}
      {/if}<!-- end !auditTab -->

      {#if auditTab}
        <div class="audit-tab">
          <div class="drawer-audit-filter">
            <input type="text" bind:value={actionFilter}
                   placeholder="Filter by action (disable, archive_workspace, …)"
                   aria-label="Filter audit by action" />
          </div>
          {#if auditLoading}
            <p>Loading…</p>
          {:else if visibleAuditEntries.length === 0}
            <AuditEmptyState
              hasFilter={actionFilter.trim() !== ''}
              on:clearFilter={() => { actionFilter = '' }} />
          {:else}
            <ul class="audit-list">
              {#each visibleAuditGroups as g (g.batchId ?? g.entries[0].id)}
                {#if g.entries.length > 1}
                  <li class="audit-batch-header">
                    <strong>Bulk action by {g.entries[0].admin.firstName} {g.entries[0].admin.lastName}</strong>
                     — {g.entries.length} entries · <code>{g.entries[0].action}</code> ·
                     {new Date(g.entries[0].tsMs).toLocaleString()}
                  </li>
                {/if}
                {#each g.entries as e (e.id)}
                  <li>
                    <strong>{new Date(e.tsMs).toLocaleString()}</strong> — {e.admin.firstName} {e.admin.lastName} → <code>{e.action}</code>
                    {#if e.details != null}<pre>{JSON.stringify(e.details, null, 2)}</pre>{/if}
                  </li>
                {/each}
              {/each}
            </ul>
          {/if}
        </div>
      {/if}
    </div>
  </Scroller>
</aside>

<style lang="scss">
  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 480px;
    max-width: 100vw;
    background: var(--theme-bg-color);
    border-left: 1px solid var(--theme-divider-color);
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.18);
    z-index: 9001;
    display: flex;
    flex-direction: column;
  }

  .drawer-tabs {
    display: flex;
    gap: 0.25rem;
    padding: 0.4rem var(--spacing-3) 0;
    border-bottom: 1px solid var(--theme-divider-color);
    flex-shrink: 0;

    button {
      background: transparent;
      border: 0;
      padding: 0.4rem 0.75rem;
      border-radius: 0.35rem 0.35rem 0 0;
      cursor: pointer;
      color: var(--theme-darker-color);

      &.active {
        background: var(--theme-bg-accent-color);
        color: var(--theme-caption-color);
      }
    }
  }

  .audit-tab {
    padding: var(--spacing-2) 0;
  }

  .audit-list {
    list-style: none;
    padding: 0;
    margin: 0;

    li {
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--theme-divider-color);
      font-size: 0.85rem;

      code {
        font-family: var(--mono-font, monospace);
      }

      pre {
        margin: 0.25rem 0 0;
        font-family: var(--mono-font, monospace);
        font-size: 0.72rem;
        color: var(--theme-darker-color);
        white-space: pre-wrap;
      }

      // Plan 1d Task 3 — Non-interactive grouping header. No buttons here.
      &.audit-batch-header {
        background: var(--theme-bg-accent-color);
        padding: 0.4rem 0.5rem;
        font-size: 0.78rem;
        color: var(--theme-darker-color);
        border-top: 2px solid var(--theme-divider-color);
      }
    }
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    border-bottom: 1px solid var(--theme-divider-color);
    flex-shrink: 0;
  }

  .drawer-pager {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-left: auto;
  }

  .drawer-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    background: transparent;
    border: 0;
    border-radius: 0.35rem;
    cursor: pointer;
    color: var(--theme-content-color);

    &:hover {
      background: var(--theme-bg-accent-color);
      color: var(--theme-caption-color);
    }

    &:focus-visible {
      outline: 2px solid var(--theme-button-focused-border, var(--primary-button-color, #2563eb));
      outline-offset: -2px;
    }
  }

  .pager-pos {
    font-size: 0.78rem;
    color: var(--theme-darker-color);
    min-width: 3.5rem;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .drawer-title {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--theme-caption-color);
  }

  .drawer-body {
    padding: var(--spacing-3);
  }

  .state {
    padding: var(--spacing-4);
    text-align: center;
    color: var(--theme-darker-color);

    &.error {
      color: var(--theme-state-negative-color, #b91c1c);
    }
  }

  .profile {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: var(--spacing-3);
  }

  .copy-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-left: auto;
    flex-shrink: 0;
  }

  .avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-divider-color);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    font-weight: 600;
    color: var(--theme-caption-color);
  }

  .profile-info {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 500;
    color: var(--theme-caption-color);
  }

  section {
    margin-bottom: var(--spacing-3);
  }

  .section-title {
    font-size: 0.7rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--theme-darker-color);
    margin-bottom: 0.5rem;
  }

  .count {
    opacity: 0.7;
  }

  .muted {
    margin: 0;
    color: var(--theme-darker-color);
    font-style: italic;
    font-size: 0.85rem;
  }

  .identity-list,
  .ws-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .identity-list li {
    gap: 0.5rem;
    background: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-BorderRadius);
  }

  .ws-list li {
    gap: 0.6rem;
    background: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-BorderRadius);
  }

  .ws-name-block {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;

    strong {
      color: var(--theme-caption-color);
      font-weight: 500;
      font-size: 0.875rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .ws-url {
    font-size: 0.72rem;
    color: var(--theme-darker-color);
    font-family: var(--mono-font, 'SF Mono', 'Menlo', 'Consolas', monospace);
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
    height: 18px;
  }

  .badge.type {
    background: var(--theme-popup-color);
    color: var(--theme-content-color);
    border: 1px solid var(--theme-divider-color);
  }

  .badge.verified {
    background: var(--theme-state-positive-background-color, rgba(16, 185, 129, 0.12));
    color: var(--theme-state-positive-color, #047857);
    margin-left: auto;
  }

  .value {
    font-family: var(--mono-font, 'SF Mono', 'Menlo', 'Consolas', monospace);
    font-size: 0.82rem;
    color: var(--theme-content-color);
    overflow-wrap: anywhere;
  }

  .info-grid {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0.35rem 0.85rem;
    font-size: 0.85rem;
  }

  .info-grid .label {
    color: var(--theme-darker-color);
  }

  .value-plain {
    color: var(--theme-content-color);
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.1rem 0.55rem 0.1rem 0.5rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 500;
    text-transform: capitalize;
    width: fit-content;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
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

  .actions-stack {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    align-items: stretch;

    > :global(button) {
      /* Primary password-reset button takes the full row width. */
      width: 100%;
    }
  }

  .actions-secondary {
    /* Disable / re-enable: compact, right-aligned, no full-width.
       Pushes the destructive action out of the user's center of focus. */
    display: flex;
    justify-content: flex-end;
    margin-top: 0.25rem;
  }

  .add-row {
    display: flex;
    justify-content: flex-start;
    margin-top: var(--spacing-1-5, 0.5rem);
  }

  .drawer-audit-filter {
    padding: 0 0 0.75rem 0;
    input {
      width: 100%;
      padding: 0.4rem 0.6rem;
      border: 1px solid var(--theme-divider-color);
      border-radius: 0.35rem;
      background: var(--theme-bg-color);
      color: var(--theme-content-color);
      font-size: 0.85rem;
    }
  }
</style>
