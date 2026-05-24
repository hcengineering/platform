<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { AccountRole } from '@hcengineering/core'
  import { Button, DropdownLabelsIntl, type DropdownIntlItem, SearchEdit } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { getAccountClient } from '../../utils'
  import { parseRole } from '../admin-users/util'

  export let workspaceUuid: string

  const dispatch = createEventDispatcher()
  const client = getAccountClient()

  let search = ''
  let accounts: any[] = []
  let selectedAccountUuid: string | undefined
  let role: AccountRole = AccountRole.User
  let busy = false
  let error: string | null = null
  let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined

  async function reload (): Promise<void> {
    // listAccountsAdmin used so we get statusIn/pagination control; admin token is implied
    const { accounts: rows } = await client.listAccountsAdmin({
      search: search.trim() === '' ? undefined : search.trim(),
      statusIn: ['active'],
      pagination: { limit: 20, offset: 0 }
    })
    accounts = rows
  }
  void reload()

  function onSearchChange (): void {
    if (searchDebounceTimer != null) clearTimeout(searchDebounceTimer)
    searchDebounceTimer = setTimeout(() => {
      void reload()
    }, 300)
  }

  const roleItems: DropdownIntlItem[] = [
    { id: AccountRole.Owner as any, label: getEmbeddedLabel('Owner') },
    { id: AccountRole.Maintainer as any, label: getEmbeddedLabel('Maintainer') },
    { id: AccountRole.User as any, label: getEmbeddedLabel('User') },
    { id: AccountRole.Guest as any, label: getEmbeddedLabel('Guest') }
  ]

  async function confirm (): Promise<void> {
    if (selectedAccountUuid == null) return
    busy = true
    error = null
    try {
      await client.addWorkspaceMember({
        accountUuid: selectedAccountUuid as any,
        workspaceUuid: workspaceUuid as any,
        role
      })
      // Same close-with-payload convention as AddToWorkspacePopup.
      dispatch('close', true)
    } catch (e: any) {
      error = e?.message ?? String(e)
    } finally {
      busy = false
    }
  }
</script>

<div class="popup" data-drawer-keep-open>
  <h3>Add member to workspace</h3>
  <SearchEdit bind:value={search} on:change={onSearchChange} width={'100%'} />
  <div class="list">
    {#each accounts as a (a.uuid)}
      <label class="row">
        <input type="radio" bind:group={selectedAccountUuid} value={a.uuid} />
        <span class="name">{a.firstName} {a.lastName}</span>
        <span class="email muted">{a.primaryEmail ?? '—'}</span>
      </label>
    {/each}
    {#if accounts.length === 0}
      <p class="muted">No matching accounts.</p>
    {/if}
  </div>
  <DropdownLabelsIntl items={roleItems} selected={role} on:selected={(e) => { role = parseRole(e.detail) }} />
  {#if error}<div class="error">{error}</div>{/if}
  <div class="actions">
    <Button label={getEmbeddedLabel('Cancel')} on:click={() => dispatch('close')} />
    <Button
      label={getEmbeddedLabel('Confirm')}
      kind={'primary'}
      disabled={busy || selectedAccountUuid == null}
      on:click={confirm}
    />
  </div>
</div>

<style lang="scss">
  .popup {
    padding: 1rem;
    min-width: 24rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.5rem;
  }
  .list {
    max-height: 14rem;
    overflow-y: auto;
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.25rem;
    padding: 0.25rem;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.4rem;
  }
  .row:hover {
    background: var(--theme-popup-hover);
  }
  .name {
    font-weight: 500;
  }
  .email {
    font-size: 0.8rem;
  }
  .muted {
    color: var(--theme-darker-color);
  }
  .error {
    color: var(--theme-error-color, #ef4444);
    font-size: 0.85rem;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.4rem;
  }
</style>
