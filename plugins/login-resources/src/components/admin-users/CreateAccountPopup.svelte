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
  let pw1Visible = false
  let pw2Visible = false

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

<div class="popup" data-drawer-keep-open>
  <h3>Create user</h3>
  <div class="grid">
    <label>First name<EditBox bind:value={firstName} placeholder={'Jane'} /></label>
    <label>Last name<EditBox bind:value={lastName} placeholder={'Doe'} /></label>
    <label class="full">Email<EditBox bind:value={email} placeholder={'jane@example.com'} /></label>
    <fieldset class="full">
      <legend>Password setup</legend>
      <label><input type="radio" bind:group={passwordMode} value="invite" /> Send invite email</label>
      <label><input type="radio" bind:group={passwordMode} value="set" /> Set password now</label>
      {#if passwordMode === 'set'}
        <label>Password
          <div class="pw-input-row">
            {#if pw1Visible}
              <input type="text" autocomplete="new-password"
                     aria-describedby="pw1-help" bind:value={password} />
            {:else}
              <input type="password" autocomplete="new-password"
                     aria-describedby="pw1-help" bind:value={password} />
            {/if}
            <button type="button" class="pw-toggle" on:click={() => { pw1Visible = !pw1Visible }}
                    aria-label={pw1Visible ? 'Hide password' : 'Show password'}>
              {pw1Visible ? '◯' : '●'}
            </button>
          </div>
          <span class="pw-help" id="pw1-help">Min 8 chars</span>
        </label>
        <label>Confirm
          <div class="pw-input-row">
            {#if pw2Visible}
              <input type="text" autocomplete="new-password"
                     aria-describedby="pw2-help" bind:value={passwordConfirm} />
            {:else}
              <input type="password" autocomplete="new-password"
                     aria-describedby="pw2-help" bind:value={passwordConfirm} />
            {/if}
            <button type="button" class="pw-toggle" on:click={() => { pw2Visible = !pw2Visible }}
                    aria-label={pw2Visible ? 'Hide password' : 'Show password'}>
              {pw2Visible ? '◯' : '●'}
            </button>
          </div>
          <span class="pw-help" id="pw2-help">Min 8 chars</span>
        </label>
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
        <DropdownLabelsIntl items={roleItems} selected={role} on:selected={(e) => { role = e.detail }} />
      {/if}
    </fieldset>
  </div>
  {#if error}<div class="error">{error}</div>{/if}
  <div class="actions">
    <Button label={getEmbeddedLabel('Cancel')} on:click={() => dispatch('close')} />
    <Button label={getEmbeddedLabel('Create')} kind={'primary'} disabled={busy} on:click={confirm} />
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
  .pw-input-row {
    display: flex;
    align-items: stretch;
    gap: 0.25rem;
  }
  .pw-toggle {
    flex-shrink: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    font-size: 0.9rem;
    color: var(--theme-darker-color);
    padding: 0 0.4rem;

    &:hover {
      color: var(--theme-caption-color);
    }
  }
  .pw-help {
    display: block;
    font-size: 0.72rem;
    color: var(--theme-darker-color);
    margin-top: 0.2rem;
  }
</style>
