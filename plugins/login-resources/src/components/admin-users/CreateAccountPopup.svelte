<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { AccountRole } from '@hcengineering/core'
  import { Button, DropdownLabelsIntl, EditBox, type DropdownIntlItem } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import type { CreateAccountResponse } from '@hcengineering/account-client'
  import { getAccountClient } from '../../utils'

  const dispatch = createEventDispatcher()
  const client = getAccountClient()

  let firstName = ''
  let lastName = ''
  let email = ''
  let passwordMode: 'invite' | 'set' = 'invite'
  let password = ''
  let passwordConfirm = ''
  let workspaces: Array<{ uuid: string, name: string, url: string }> = []
  let selectedWs: string | undefined
  let role: AccountRole = AccountRole.User
  let busy = false
  let error: string | null = null

  void (async () => { workspaces = await client.listWorkspaces() })()

  const roleItems: DropdownIntlItem[] = [
    { id: AccountRole.Owner as any, label: getEmbeddedLabel('Owner') },
    { id: AccountRole.Maintainer as any, label: getEmbeddedLabel('Maintainer') },
    { id: AccountRole.User as any, label: getEmbeddedLabel('User') },
    { id: AccountRole.Guest as any, label: getEmbeddedLabel('Guest') }
  ]

  function validate (): string | null {
    if (firstName.trim() === '') return 'First name required'
    if (lastName.trim() === '') return 'Last name required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Valid email required'
    if (passwordMode === 'set') {
      if (password.length < 8) return 'Password must be at least 8 characters'
      if (password !== passwordConfirm) return 'Passwords do not match'
    }
    return null
  }

  async function confirm (): Promise<void> {
    const v = validate()
    if (v != null) { error = v; return }
    busy = true
    error = null
    try {
      const params = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        passwordMode,
        ...(passwordMode === 'set' ? { password } : {}),
        ...(selectedWs != null ? { initialWorkspace: { workspaceUuid: selectedWs as any, role } } : {})
      } as const
      const r: CreateAccountResponse = await client.createAccountAdmin(params as any)
      // Deliver the CreateAccountResponse through the close event so the
      // showPopup callback receives it; cancel uses dispatch('close')
      // with no payload (undefined) which PR-B treats as "user dismissed".
      dispatch('close', r)
    } catch (e: any) {
      error = e?.message ?? String(e)
    } finally {
      busy = false
    }
  }
</script>

<div class="popup">
  <h3>Create user</h3>
  <div class="grid">
    <label>First name<EditBox bind:value={firstName} placeholder={'Jane' as any} /></label>
    <label>Last name<EditBox bind:value={lastName} placeholder={'Doe' as any} /></label>
    <label class="full">Email<EditBox bind:value={email} placeholder={'jane@example.com' as any} /></label>
    <fieldset class="full">
      <legend>Password setup</legend>
      <label><input type="radio" bind:group={passwordMode} value="invite" /> Send invite email</label>
      <label><input type="radio" bind:group={passwordMode} value="set" /> Set password now</label>
      {#if passwordMode === 'set'}
        <label>Password<input type="password" bind:value={password} /></label>
        <label>Confirm<input type="password" bind:value={passwordConfirm} /></label>
      {/if}
    </fieldset>
    <fieldset class="full">
      <legend>Initial workspace (optional)</legend>
      <select bind:value={selectedWs}>
        <option value={undefined}>— None —</option>
        {#each workspaces as w}
          <option value={w.uuid}>{w.name} ({w.url})</option>
        {/each}
      </select>
      {#if selectedWs != null}
        <DropdownLabelsIntl items={roleItems} selected={role as any} on:selected={(e) => { role = e.detail }} />
      {/if}
    </fieldset>
  </div>
  {#if error}<div class="error">{error}</div>{/if}
  <div class="actions">
    <Button label={'login:string.Cancel' as any} on:click={() => dispatch('close')} />
    <Button label={'login:string.Create' as any} kind={'primary'} disabled={busy} on:click={confirm} />
  </div>
</div>

<style lang="scss">
  .popup { padding: 1rem; min-width: 28rem; max-width: 36rem; background: var(--theme-popup-color); border: 1px solid var(--theme-divider-color); border-radius: 0.5rem; display: flex; flex-direction: column; gap: 0.6rem; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem 1rem; }
  .full { grid-column: 1 / -1; }
  fieldset { border: 1px solid var(--theme-divider-color); border-radius: 0.25rem; padding: 0.6rem; display: flex; flex-direction: column; gap: 0.35rem; }
  legend { padding: 0 0.3rem; font-size: 0.8rem; color: var(--theme-darker-color); }
  .error { color: var(--theme-error-color, #ef4444); font-size: 0.85rem; }
  .actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
</style>
