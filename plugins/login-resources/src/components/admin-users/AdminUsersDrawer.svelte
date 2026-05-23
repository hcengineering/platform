<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { getAccountClient } from '../../utils'
  import type { AccountDetailsResponse } from '@hcengineering/account-client'
  import { AccountRole } from '@hcengineering/core'

  export let accountUuid: string

  const dispatch = createEventDispatcher<{ close: void, 'account-changed': void }>()
  let details: AccountDetailsResponse | null = null
  let loading = true
  let errorMessage: string | null = null
  let busy = false

  async function load (): Promise<void> {
    loading = true
    errorMessage = null
    try {
      details = await getAccountClient().getAccountDetails(accountUuid as any)
    } catch (err: any) {
      errorMessage = err?.message ?? 'Failed to load account'
    } finally {
      loading = false
    }
  }

  onMount(load)

  function showError (msg: string): void {
    if (typeof window !== 'undefined') {
      window.alert(msg)
    }
  }

  function parseRole (v: string): AccountRole {
    return Number(v) as AccountRole
  }

  async function onChangeRole (workspaceUuid: string, newRole: AccountRole): Promise<void> {
    busy = true
    try {
      await getAccountClient().setWorkspaceMemberRole(accountUuid as any, workspaceUuid as any, newRole)
      await load()
      dispatch('account-changed')
    } catch (err: any) {
      if (err?.status?.code === 'last_owner_in_workspace') {
        showError('Cannot demote the last Owner of this workspace. There must be at least one Owner.')
      } else {
        showError(err?.message ?? 'Failed to change role.')
      }
    } finally {
      busy = false
    }
  }

  async function onRemoveFromWorkspace (workspaceUuid: string, workspaceName: string): Promise<void> {
    if (typeof window !== 'undefined' && !window.confirm(`Remove from "${workspaceName}"?`)) return
    busy = true
    try {
      await getAccountClient().removeWorkspaceMember(accountUuid as any, workspaceUuid as any)
      await load()
      dispatch('account-changed')
    } catch (err: any) {
      if (err?.status?.code === 'last_owner_in_workspace') {
        showError('Cannot remove the last Owner. There must be at least one Owner.')
      } else {
        showError(err?.message ?? 'Failed to remove member.')
      }
    } finally {
      busy = false
    }
  }

  async function onTriggerPasswordReset (): Promise<void> {
    busy = true
    try {
      const res = await getAccountClient().triggerPasswordReset(accountUuid as any)
      showError(`Password-reset email sent to ${res.emailSentTo}`)
    } catch (err: any) {
      const code = err?.status?.code
      if (code === 'user_has_no_password' || code === 'user_has_no_email') {
        showError('This user signs in via OIDC only — password reset does not apply.')
      } else {
        showError(err?.message ?? 'Failed to send password reset.')
      }
    } finally {
      busy = false
    }
  }

  async function onDisable (): Promise<void> {
    if (typeof window !== 'undefined' && !window.confirm('Disable this account? Active sessions will be terminated.')) return
    busy = true
    try {
      await getAccountClient().disableAccount(accountUuid as any)
      await load()
      dispatch('account-changed')
    } catch (err: any) {
      const code = err?.status?.code
      if (code === 'cannot_self_disable') {
        showError('You cannot disable your own account.')
      } else if (code === 'last_admin') {
        showError('Cannot disable the last admin. At least one active admin must remain.')
      } else {
        showError(err?.message ?? 'Failed to disable account.')
      }
    } finally {
      busy = false
    }
  }

  async function onEnable (): Promise<void> {
    busy = true
    try {
      await getAccountClient().enableAccount(accountUuid as any)
      await load()
      dispatch('account-changed')
    } catch (err: any) {
      showError(err?.message ?? 'Failed to enable account.')
    } finally {
      busy = false
    }
  }

  function onClose (): void {
    dispatch('close')
  }

  function initials (first: string, last: string): string {
    return ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase() || '?'
  }
</script>

<div class="overlay" on:click={onClose} role="presentation" />
<aside class="drawer" role="dialog" aria-modal="true">
  <header>
    <button class="close" on:click={onClose} aria-label="Close">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  </header>

  {#if loading}
    <div class="state">Loading…</div>
  {:else if errorMessage != null}
    <div class="state error">{errorMessage}</div>
  {:else if details != null}
    <div class="profile">
      <div class="avatar">{initials(details.firstName, details.lastName)}</div>
      <div class="profile-name">
        <h3>{details.firstName} {details.lastName}</h3>
        <span class="status status-{details.status}">
          <span class="status-dot" />
          {details.status}
        </span>
      </div>
    </div>

    <section>
      <h4>Identities</h4>
      {#if details.socialIds.length === 0}
        <p class="muted">No identities linked.</p>
      {:else}
        <ul class="identity-list">
          {#each details.socialIds as sid}
            <li>
              <span class="badge type">{sid.type}</span>
              <span class="value">{sid.value}</span>
              {#if sid.verified}
                <span class="badge verified">verified</span>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section>
      <h4>Workspaces <span class="count">({details.workspaceMemberships.length})</span></h4>
      {#if details.workspaceMemberships.length === 0}
        <p class="muted">Not a member of any workspace.</p>
      {:else}
        <ul class="ws-list">
          {#each details.workspaceMemberships as m}
            <li>
              <div class="ws-name-block">
                <strong>{m.workspaceName}</strong>
                <span class="ws-url">{m.workspaceUrl}</span>
              </div>
              <select
                disabled={busy}
                value={m.role}
                on:change={(e) => onChangeRole(m.workspaceUuid, parseRole(e.currentTarget.value))}
              >
                <option value={AccountRole.User}>User</option>
                <option value={AccountRole.Maintainer}>Maintainer</option>
                <option value={AccountRole.Owner}>Owner</option>
                <option value={AccountRole.Guest}>Guest</option>
              </select>
              <button
                class="icon-btn danger"
                disabled={busy}
                on:click={() => onRemoveFromWorkspace(m.workspaceUuid, m.workspaceName)}
                title="Remove from workspace"
                aria-label="Remove"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
                </svg>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section>
      <h4>Activity</h4>
      <div class="info-grid">
        <span class="label">Last activity</span>
        <span class="value">
          {details.lastActivityAt != null ? new Date(details.lastActivityAt).toLocaleString() : '—'}
        </span>
        {#if details.disabledAt != null}
          <span class="label">Disabled at</span>
          <span class="value">{new Date(details.disabledAt).toLocaleString()}</span>
        {/if}
      </div>
    </section>

    <section class="actions-section">
      <h4>Actions</h4>
      <button class="action-btn" disabled={busy} on:click={onTriggerPasswordReset}>
        Send password-reset email
      </button>
      {#if details.status === 'active'}
        <button class="action-btn danger" disabled={busy} on:click={onDisable}>
          Disable account
        </button>
      {:else}
        <button class="action-btn primary" disabled={busy} on:click={onEnable}>
          Re-enable account
        </button>
      {/if}
    </section>
  {/if}
</aside>

<style lang="scss">
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    z-index: 9000;
  }

  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 480px;
    max-width: 100vw;
    background: var(--theme-bg-color);
    border-left: 1px solid var(--theme-divider-color);
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.15);
    z-index: 9001;
    padding: 1.25rem 1.5rem 2rem;
    overflow-y: auto;
    color: var(--theme-content-color);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  header {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 0.75rem;
  }

  .close {
    background: transparent;
    border: 1px solid transparent;
    color: var(--theme-content-color);
    opacity: 0.6;
    padding: 0.25rem;
    border-radius: 0.35rem;
    cursor: pointer;
    transition: opacity 120ms ease, background 120ms ease;

    &:hover {
      opacity: 1;
      background: var(--theme-popup-hover);
    }
  }

  .state {
    padding: 2rem;
    text-align: center;
    color: var(--theme-content-color);
    opacity: 0.7;

    &.error {
      color: #b91c1c;
    }
  }

  .profile {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--theme-bg-accent-color), var(--theme-popup-color));
    border: 1px solid var(--theme-divider-color);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--theme-caption-color);
  }

  .profile-name {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--theme-caption-color);
    letter-spacing: -0.01em;
  }

  section {
    margin-bottom: 1.75rem;
  }

  h4 {
    margin: 0 0 0.6rem;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--theme-content-color);
    opacity: 0.55;
  }

  .count {
    opacity: 0.5;
    margin-left: 0.15rem;
  }

  .muted {
    margin: 0;
    color: var(--theme-content-color);
    opacity: 0.45;
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
    gap: 0.5rem;
  }

  .identity-list li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 0.65rem;
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.4rem;
  }

  .ws-list li {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 0.75rem;
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.4rem;
  }

  .ws-name-block {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;

    strong {
      color: var(--theme-caption-color);
      font-weight: 500;
      font-size: 0.9rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .ws-url {
    font-size: 0.72rem;
    opacity: 0.55;
    font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  }

  select {
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--theme-divider-color);
    background: var(--theme-bg-color);
    color: var(--theme-content-color);
    border-radius: 0.3rem;
    font-size: 0.8rem;
    cursor: pointer;
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
  }

  .badge.type {
    background: var(--theme-bg-accent-color);
    color: var(--theme-content-color);
    border: 1px solid var(--theme-divider-color);
  }

  .badge.verified {
    background: rgba(16, 185, 129, 0.1);
    color: #047857;
    margin-left: auto;
  }

  .value {
    font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
    font-size: 0.85rem;
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
    color: var(--theme-content-color);
    opacity: 0.6;
  }

  .info-grid .value {
    font-family: inherit;
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
    width: fit-content;
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
    .status-dot { background: #10b981; }
  }

  .status-disabled {
    background: rgba(239, 68, 68, 0.1);
    color: #b91c1c;
    .status-dot { background: #ef4444; }
  }

  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.3rem;
    background: transparent;
    border: 1px solid var(--theme-divider-color);
    color: var(--theme-content-color);
    border-radius: 0.3rem;
    cursor: pointer;
    transition: background 80ms ease, color 80ms ease;

    &:hover:not(:disabled) {
      background: var(--theme-popup-hover);
    }

    &.danger:hover:not(:disabled) {
      color: #b91c1c;
      border-color: rgba(239, 68, 68, 0.3);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .actions-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .action-btn {
    padding: 0.55rem 0.9rem;
    background: var(--theme-bg-color);
    border: 1px solid var(--theme-divider-color);
    color: var(--theme-content-color);
    border-radius: 0.4rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    transition: background 80ms ease, border-color 80ms ease;

    &:hover:not(:disabled) {
      background: var(--theme-popup-hover);
    }

    &.danger {
      color: #b91c1c;
      border-color: rgba(239, 68, 68, 0.3);

      &:hover:not(:disabled) {
        background: rgba(239, 68, 68, 0.08);
      }
    }

    &.primary {
      background: var(--theme-caption-color);
      color: var(--theme-bg-color);
      border-color: var(--theme-caption-color);

      &:hover:not(:disabled) {
        opacity: 0.9;
      }
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
</style>
