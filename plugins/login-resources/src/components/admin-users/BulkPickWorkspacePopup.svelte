<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { AccountRole, type WorkspaceInfoWithStatus } from '@hcengineering/core'
  import { Button, DropdownLabelsIntl, type DropdownIntlItem } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { getAccountClient } from '../../utils'
  import { parseRole } from './util'

  // 'add' → workspace + role payload; 'remove' → workspace only.
  // A dedicated popup (rather than reusing AddToWorkspacePopup) avoids
  // mixing per-user excludedWorkspaceUuids with the bulk-no-excludes logic.
  export let mode: 'add' | 'remove' = 'add'

  const dispatch = createEventDispatcher<{
    close: { workspaceUuid: string, role?: AccountRole } | undefined
  }>()

  let workspaces: WorkspaceInfoWithStatus[] = []
  let selectedWs: string | undefined
  let role: AccountRole = AccountRole.User
  let loading = true
  let errorMessage: string | null = null

  const roleItems: DropdownIntlItem[] = [
    { id: AccountRole.Owner as any, label: getEmbeddedLabel('Owner') },
    { id: AccountRole.Maintainer as any, label: getEmbeddedLabel('Maintainer') },
    { id: AccountRole.User as any, label: getEmbeddedLabel('User') },
    { id: AccountRole.Guest as any, label: getEmbeddedLabel('Guest') }
  ]

  onMount(async () => {
    try {
      workspaces = await getAccountClient().listWorkspaces()
    } catch (err: any) {
      errorMessage = err?.message ?? 'Failed to load workspaces'
    } finally {
      loading = false
    }
  })

  function setRole (detail: unknown): void {
    role = parseRole(detail)
  }

  function confirm (): void {
    if (selectedWs == null) return
    // PopupInstance forwards the close-event payload to the showPopup
    // callback. `undefined` is the cancel sentinel; an object means
    // "user confirmed with this selection".
    dispatch(
      'close',
      mode === 'add'
        ? { workspaceUuid: selectedWs, role }
        : { workspaceUuid: selectedWs }
    )
  }

  function cancel (): void {
    dispatch('close', undefined)
  }
</script>

<div class="popup" data-drawer-keep-open>
  <h3 class="title">
    {mode === 'add' ? 'Add selection to workspace' : 'Remove selection from workspace'}
  </h3>

  {#if loading}
    <div class="muted">Loading workspaces…</div>
  {:else if errorMessage}
    <div class="error">{errorMessage}</div>
  {:else}
    <label class="field">
      <span class="field-label">Workspace</span>
      <select bind:value={selectedWs}>
        <option value={undefined}>— Select a workspace —</option>
        {#each workspaces as w}
          <option value={w.uuid}>{w.name} ({w.url})</option>
        {/each}
      </select>
    </label>

    {#if mode === 'add'}
      <label class="field">
        <span class="field-label">Role</span>
        <DropdownLabelsIntl
          items={roleItems}
          selected={role}
          on:selected={(e) => setRole(e.detail)}
        />
      </label>
    {/if}
  {/if}

  <div class="actions">
    <Button label={getEmbeddedLabel('Cancel')} on:click={cancel} />
    <Button
      label={getEmbeddedLabel('Confirm')}
      kind={'primary'}
      disabled={loading || selectedWs == null}
      on:click={confirm}
    />
  </div>
</div>

<style lang="scss">
  .popup {
    padding: 1rem;
    min-width: 26rem;
    max-width: 34rem;
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-BorderRadius);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .title {
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
    color: var(--theme-caption-color);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .field-label {
    font-size: 0.75rem;
    color: var(--theme-darker-color);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .field select {
    padding: 0.4rem 0.5rem;
    background: var(--theme-bg-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-BorderRadius);
    color: var(--theme-caption-color);
    font-size: 0.85rem;
  }

  .muted {
    color: var(--theme-darker-color);
    font-size: 0.85rem;
  }

  .error {
    color: var(--theme-error-color, #ef4444);
    font-size: 0.85rem;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }
</style>
