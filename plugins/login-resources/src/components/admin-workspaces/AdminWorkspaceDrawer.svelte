<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import {
    Button,
    DropdownLabelsIntl,
    Loading,
    Scroller,
    showPopup,
    type DropdownIntlItem
  } from '@hcengineering/ui'
  import { MessageBox } from '@hcengineering/presentation'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { AccountRole } from '@hcengineering/core'
  import { getAccountClient } from '../../utils'
  import type { WorkspaceMembersAdminResponse, AuditEntry } from '@hcengineering/account-client'
  import type { WorkspaceUuid } from '@hcengineering/core'
  import AddMemberToWorkspacePopup from './AddMemberToWorkspacePopup.svelte'
  import AuditEmptyState from '../admin-shell/AuditEmptyState.svelte'

  export let workspaceUuid: string

  const dispatch = createEventDispatcher()
  const client = getAccountClient()

  let data: WorkspaceMembersAdminResponse | undefined
  let loading = true
  let err: string | null = null

  const roleItems: DropdownIntlItem[] = [
    { id: AccountRole.Owner as any, label: getEmbeddedLabel('Owner') },
    { id: AccountRole.Maintainer as any, label: getEmbeddedLabel('Maintainer') },
    { id: AccountRole.User as any, label: getEmbeddedLabel('User') },
    { id: AccountRole.Guest as any, label: getEmbeddedLabel('Guest') }
  ]

  async function load (): Promise<void> {
    loading = true
    err = null
    try {
      data = await client.getWorkspaceMembersAdmin(workspaceUuid as any)
    } catch (e: any) {
      err = e?.message ?? String(e)
    } finally {
      loading = false
    }
  }

  // Refetch when the parent swaps the workspace without re-mounting the drawer
  // (clicking another row in the table). Same pattern as AdminUsersDrawer.
  let loadedUuid: string | null = null
  $: if (workspaceUuid !== loadedUuid) {
    loadedUuid = workspaceUuid
    void load()
  }

  function close (): void {
    dispatch('close')
  }

  // Outside-click / Escape dismisses the drawer (mirrors AdminUsersDrawer).
  //   • Clicks INSIDE the drawer must not close it.
  //   • Clicks on another workspace row should SWITCH the drawer's
  //     workspace, not close it (the row's own click handler dispatches,
  //     parent then updates workspaceUuid → the reactive refetch fires).
  //   • Clicks inside any popup spawned BY the drawer (MessageBox,
  //     dropdowns) must not close it.
  let drawerEl: HTMLElement

  function onDocPointerDown (ev: MouseEvent): void {
    const target = ev.target as HTMLElement | null
    if (target == null) return
    if (drawerEl?.contains(target)) return
    if (target.closest('.ws-table') != null) return
    if (target.closest('[data-drawer-keep-open], .popup') != null) return
    close()
  }

  function onKeyDown (ev: KeyboardEvent): void {
    if (ev.key === 'Escape') close()
  }

  onMount(() => {
    document.addEventListener('mousedown', onDocPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
  })

  onDestroy(() => {
    document.removeEventListener('mousedown', onDocPointerDown, true)
    document.removeEventListener('keydown', onKeyDown)
  })

  async function onChangeRole (accountUuid: string, role: AccountRole): Promise<void> {
    try {
      await client.setWorkspaceMemberRole({
        accountUuid: accountUuid as any,
        workspaceUuid: workspaceUuid as any,
        newRole: role
      })
      await load()
    } catch (e: any) {
      err = e?.message ?? String(e)
    }
  }

  function onRemove (accountUuid: string, displayName: string): void {
    // PR-B's MessageBox pattern: pass an `action` callback that fires only
    // when the user clicks Confirm. dangerous: true gives the red button.
    showPopup(MessageBox, {
      label: getEmbeddedLabel('Remove member from workspace'),
      message: getEmbeddedLabel(
        `Remove ${displayName} from ${data?.workspaceName ?? 'this workspace'}? They lose access immediately.`
      ),
      okLabel: getEmbeddedLabel('Remove'),
      dangerous: true,
      action: async () => {
        await client.removeWorkspaceMember({
          accountUuid: accountUuid as any,
          workspaceUuid: workspaceUuid as any
        })
        await load()
      }
    })
  }

  function openAddMember (): void {
    // The popup dispatches `close` with `true` on success, `undefined` on
    // cancel — matches the close-with-payload convention used by
    // AddToWorkspacePopup / CreateAccountPopup.
    showPopup(AddMemberToWorkspacePopup, { workspaceUuid }, 'middle', async (added) => {
      if (added === true) await load()
    })
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
      const res = await client.listAuditAdmin({
        filter: { targetWorkspaceUuid: workspaceUuid as WorkspaceUuid },
        pagination: { limit: 50 }
      })
      auditEntries = res.entries
    } finally {
      auditLoading = false
    }
  }

  $: if (auditTab && workspaceUuid != null) {
    void loadAudit()
  }
</script>

<div class="drawer" bind:this={drawerEl}>
  <div class="header">
    <button class="back" on:click={close} aria-label="Close drawer">←</button>
    {#if data}
      <div class="title">{data.workspaceName}</div>
      <div class="sub">{data.workspaceUrl} · {data.workspaceMode}</div>
    {/if}
    <button class="close" on:click={close} aria-label="Close drawer">×</button>
  </div>

  <div class="drawer-tabs">
    <button class:active={!auditTab} on:click={() => { auditTab = false }}>Details</button>
    <button class:active={auditTab} on:click={() => { auditTab = true }}>Audit ({auditEntries.length})</button>
  </div>

  <Scroller>
    {#if !auditTab}
    {#if loading}
      <Loading />
    {:else if err}
      <div class="error">{err}</div>
    {:else if data}
      <div class="section">
        <div class="section-h">Members ({data.members.length})</div>
        {#each data.members as m (m.accountUuid)}
          <div class="row">
            <div class="name">
              {m.firstName} {m.lastName}
              {#if m.isAdmin}<span class="badge">Admin</span>{/if}
              {#if m.status === 'disabled'}<span class="badge red">Disabled</span>{/if}
            </div>
            <div class="email muted">{m.primaryEmail ?? '—'}</div>
            <div class="role">
              <DropdownLabelsIntl
                items={roleItems}
                selected={m.role}
                on:selected={(e) => onChangeRole(m.accountUuid, e.detail)}
              />
            </div>
            <!-- pass a human-readable label so the confirmation can name the member -->
            <button
              class="rm"
              on:click={() =>
                onRemove(
                  m.accountUuid,
                  `${m.firstName} ${m.lastName}`.trim() || m.primaryEmail || m.accountUuid
                )}
            >
              ✕
            </button>
          </div>
        {/each}
        <div class="add-row">
          <Button label={getEmbeddedLabel('Add member')} on:click={openAddMember} />
        </div>
      </div>
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
  </Scroller>
</div>

<style lang="scss">
  .drawer {
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    width: 28rem;
    background: var(--theme-bg-color);
    border-left: 1px solid var(--theme-divider-color);
    box-shadow: -2px 0 16px rgba(0, 0, 0, 0.08);
    z-index: 30;
    display: flex;
    flex-direction: column;
  }

  .drawer-tabs {
    display: flex;
    gap: 0.25rem;
    padding: 0.4rem 1rem 0;
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
    padding: 0.75rem 1rem;
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

  .header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--theme-divider-color);
  }
  .back,
  .close {
    background: transparent;
    border: 0;
    cursor: pointer;
    font-size: 1.2rem;
    color: var(--theme-content-color);
  }
  .title {
    font-weight: 600;
    flex: 1;
  }
  .sub {
    font-size: 0.75rem;
    color: var(--theme-darker-color);
  }
  .section {
    padding: 0.5rem 1rem;
  }
  .section-h {
    font-weight: 600;
    margin: 0.75rem 0 0.4rem;
    color: var(--theme-darker-color);
  }
  .row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 0.25rem 0.75rem;
    padding: 0.4rem 0;
    border-bottom: 1px solid var(--theme-divider-color);
    align-items: center;
  }
  .email {
    grid-column: 1;
    font-size: 0.8rem;
  }
  .role {
    grid-column: 2;
    grid-row: 1 / span 2;
  }
  .rm {
    grid-column: 3;
    grid-row: 1 / span 2;
    background: transparent;
    border: 0;
    cursor: pointer;
    color: var(--theme-darker-color);
    font-size: 1rem;
    padding: 0.25rem 0.4rem;
    border-radius: 0.25rem;
  }
  .rm:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #dc2626;
  }
  .add-row {
    display: flex;
    justify-content: flex-end;
    padding: 0.75rem 0;
  }
  .badge {
    padding: 0.05rem 0.4rem;
    border-radius: 999px;
    font-size: 0.7rem;
    margin-left: 0.25rem;
    background: rgba(245, 158, 11, 0.12);
    color: #b45309;
  }
  .badge.red {
    background: rgba(239, 68, 68, 0.12);
    color: #dc2626;
  }
  .muted {
    color: var(--theme-darker-color);
  }
  .error {
    padding: 1rem;
    color: var(--theme-error-color, #ef4444);
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
