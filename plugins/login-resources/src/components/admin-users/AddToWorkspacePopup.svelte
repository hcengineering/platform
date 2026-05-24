<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { AccountRole, type WorkspaceInfoWithStatus } from '@hcengineering/core'
  import { Button, DropdownLabelsIntl, type DropdownIntlItem } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { getAccountClient } from '../../utils'
  import { parseRole } from './util'

  export let accountUuid: string
  export let excludedWorkspaceUuids: string[] = [] // workspaces user is already in

  const dispatch = createEventDispatcher()
  const client = getAccountClient()

  let workspaces: WorkspaceInfoWithStatus[] = []
  let selectedWs: string | undefined
  let role: AccountRole = AccountRole.User
  let busy = false
  let error: string | null = null
  let loadError: string | null = null

  const roleItems: DropdownIntlItem[] = [
    { id: AccountRole.User, label: getEmbeddedLabel('User') },
    { id: AccountRole.Maintainer, label: getEmbeddedLabel('Maintainer') },
    { id: AccountRole.Owner, label: getEmbeddedLabel('Owner') },
    { id: AccountRole.Guest, label: getEmbeddedLabel('Guest') }
  ]

  async function load (): Promise<void> {
    try {
      const all = await client.listWorkspaces()
      workspaces = all.filter((w) => !excludedWorkspaceUuids.includes(w.uuid))
    } catch (e: any) {
      loadError = e?.message ?? String(e)
    }
  }
  void load()

  async function confirm (): Promise<void> {
    if (selectedWs == null) return
    busy = true
    error = null
    try {
      const updated = await client.addWorkspaceMember({
        accountUuid: accountUuid as any,
        workspaceUuid: selectedWs as any,
        role
      })
      // PopupInstance only forwards `update` and `close` events. Use
      // `close` with a payload to deliver the result to the showPopup
      // callback; PR-B's existing popups use the same convention.
      dispatch('close', updated)
    } catch (e: any) {
      error = e?.message ?? String(e)
    } finally {
      busy = false
    }
  }
</script>

<div class="popup" data-drawer-keep-open>
  <h3>Add to workspace</h3>
  {#if loadError != null}
    <div class="error">{loadError}</div>
  {:else if workspaces.length === 0}
    <p class="muted">User is already in every workspace.</p>
  {:else}
    <label class="field">
      <span class="label-text">Workspace</span>
      <select bind:value={selectedWs}>
        <option value={undefined}>—</option>
        {#each workspaces as w (w.uuid)}
          <option value={w.uuid}>{w.name} ({w.url})</option>
        {/each}
      </select>
    </label>
    <label class="field">
      <span class="label-text">Role</span>
      <DropdownLabelsIntl
        items={roleItems}
        selected={role}
        kind={'regular'}
        size={'small'}
        on:selected={(e) => { role = parseRole(e.detail) }}
      />
    </label>
  {/if}
  {#if error}<div class="error">{error}</div>{/if}
  <div class="actions">
    <Button label={getEmbeddedLabel('Cancel')} on:click={() => dispatch('close')} />
    <Button
      label={getEmbeddedLabel('Confirm')}
      kind={'primary'}
      disabled={busy || selectedWs == null}
      on:click={confirm}
    />
  </div>
</div>

<style lang="scss">
  .popup {
    padding: 1rem;
    min-width: 22rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.5rem;
  }
  h3 {
    margin: 0 0 0.2rem;
    font-size: 1rem;
    font-weight: 500;
    color: var(--theme-caption-color);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .label-text {
    font-size: 0.75rem;
    color: var(--theme-darker-color);
  }
  select {
    padding: 0.4rem 0.5rem;
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.25rem;
    background: var(--theme-bg-color);
    color: var(--theme-content-color);
    font-size: 0.875rem;
  }
  .error {
    color: var(--theme-state-negative-color, #ef4444);
    font-size: 0.85rem;
  }
  .muted {
    margin: 0;
    color: var(--theme-darker-color);
    font-style: italic;
    font-size: 0.85rem;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.4rem;
  }
</style>
