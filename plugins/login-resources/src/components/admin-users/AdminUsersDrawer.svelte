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
    // For now, surface via window.alert; can be replaced with MessageBox once
    // the @hcengineering/ui popup utilities are available in this context.
    if (typeof window !== 'undefined') {
      window.alert(msg)
    }
  }

  async function onChangeRole (workspaceUuid: string, newRole: AccountRole): Promise<void> {
    try {
      await getAccountClient().setWorkspaceMemberRole(accountUuid as any, workspaceUuid as any, newRole)
      await load()
      dispatch('account-changed')
    } catch (err: any) {
      if (err?.status?.code === 'last_owner_in_workspace') {
        showError('Cannot demote last Owner of this workspace. There must be at least one Owner.')
      } else {
        showError(err?.message ?? 'Failed to change role')
      }
    }
  }

  async function onRemoveFromWorkspace (workspaceUuid: string): Promise<void> {
    try {
      await getAccountClient().removeWorkspaceMember(accountUuid as any, workspaceUuid as any)
      await load()
      dispatch('account-changed')
    } catch (err: any) {
      if (err?.status?.code === 'last_owner_in_workspace') {
        showError('Cannot remove last Owner. There must be at least one Owner.')
      } else {
        showError(err?.message ?? 'Failed to remove member')
      }
    }
  }

  async function onTriggerPasswordReset (): Promise<void> {
    try {
      const res = await getAccountClient().triggerPasswordReset(accountUuid as any)
      showError(`Password reset email sent to ${res.emailSentTo}`)
    } catch (err: any) {
      const code = err?.status?.code
      if (code === 'user_has_no_password' || code === 'user_has_no_email') {
        showError('This user signs in via OIDC only; password reset is not applicable.')
      } else {
        showError(err?.message ?? 'Failed to send password reset')
      }
    }
  }

  async function onDisable (): Promise<void> {
    try {
      await getAccountClient().disableAccount(accountUuid as any)
      await load()
      dispatch('account-changed')
    } catch (err: any) {
      const code = err?.status?.code
      if (code === 'cannot_self_disable') {
        showError('Cannot disable your own account.')
      } else if (code === 'last_admin') {
        showError('Cannot disable the last admin. At least one active admin must remain.')
      } else {
        showError(err?.message ?? 'Failed to disable account')
      }
    }
  }

  async function onEnable (): Promise<void> {
    try {
      await getAccountClient().enableAccount(accountUuid as any)
      await load()
      dispatch('account-changed')
    } catch (err: any) {
      showError(err?.message ?? 'Failed to enable account')
    }
  }

  function onClose (): void {
    dispatch('close')
  }

  function parseRole (v: string): AccountRole {
    return Number(v) as AccountRole
  }
</script>

<div class="drawer-overlay" on:click={onClose} role="presentation" />
<aside class="drawer" role="dialog" aria-modal="true">
  <header class="drawer-header">
    <button class="close" on:click={onClose} aria-label="Close">×</button>
  </header>

  {#if loading}
    <p>Loading...</p>
  {:else if errorMessage != null}
    <p class="error">{errorMessage}</p>
  {:else if details != null}
    <h2>{details.firstName} {details.lastName}</h2>
    <p class="status-badge status-{details.status}">{details.status}</p>

    <section>
      <h3>Identities</h3>
      <ul>
        {#each details.socialIds as sid}
          <li>
            <span class="badge">{sid.type}</span>
            {sid.value}
            {#if sid.verified}<span class="badge verified">verified</span>{/if}
          </li>
        {/each}
      </ul>
    </section>

    <section>
      <h3>Workspaces ({details.workspaceMemberships.length})</h3>
      {#if details.workspaceMemberships.length === 0}
        <p class="muted">Not a member of any workspace.</p>
      {:else}
        <ul class="memberships">
          {#each details.workspaceMemberships as m}
            <li>
              <strong>{m.workspaceName}</strong>
              <select
                value={m.role}
                on:change={(e) => onChangeRole(m.workspaceUuid, parseRole(e.currentTarget.value))}
              >
                <option value={AccountRole.User}>User</option>
                <option value={AccountRole.Maintainer}>Maintainer</option>
                <option value={AccountRole.Owner}>Owner</option>
                <option value={AccountRole.Guest}>Guest</option>
              </select>
              <button on:click={() => onRemoveFromWorkspace(m.workspaceUuid)} class="remove">Remove</button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section>
      <h3>Activity</h3>
      <p>
        Last activity:
        {details.lastActivityAt != null ? new Date(details.lastActivityAt).toLocaleString() : '—'}
      </p>
    </section>

    <section class="actions">
      <h3>Admin actions</h3>
      <button on:click={onTriggerPasswordReset}>Send password reset email</button>
      {#if details.status === 'active'}
        <button class="dangerous" on:click={onDisable}>Disable account</button>
      {:else}
        <button on:click={onEnable}>Enable account</button>
      {/if}
    </section>
  {/if}
</aside>

<style lang="scss">
  .drawer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
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
    padding: 1.5rem;
    overflow-y: auto;
    z-index: 9001;
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.15);
  }
  .drawer-header {
    display: flex;
    justify-content: flex-end;
  }
  .close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: inherit;
  }
  h2 {
    margin-top: 0;
  }
  section {
    margin-bottom: 1.5rem;
  }
  .badge {
    display: inline-block;
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    background: var(--theme-bg-accent-color);
    font-size: 0.7rem;
    margin-right: 0.25rem;
  }
  .verified {
    background: rgba(40, 167, 69, 0.15);
    color: rgb(40, 130, 50);
  }
  .status-badge {
    display: inline-block;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    font-size: 0.75rem;
  }
  .status-active {
    background: rgba(40, 167, 69, 0.15);
  }
  .status-disabled {
    background: rgba(220, 53, 69, 0.15);
  }
  .memberships li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }
  .memberships strong {
    flex: 1;
  }
  .remove {
    background: none;
    border: 1px solid var(--theme-button-border);
    cursor: pointer;
    color: var(--theme-error-color);
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
  }
  .muted {
    opacity: 0.6;
  }
  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }
  .actions button {
    padding: 0.4rem 0.75rem;
    border: 1px solid var(--theme-button-border);
    background: var(--theme-button-color);
    color: var(--theme-content-color);
    border-radius: 0.25rem;
    cursor: pointer;
  }
  .actions button.dangerous {
    background: rgba(220, 53, 69, 0.1);
    border-color: rgb(180, 40, 55);
    color: rgb(180, 40, 55);
  }
  .error {
    color: var(--theme-error-color);
  }
</style>
