<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Button, CheckBox } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'

  export let column: 'name' | 'email' | 'auth' | 'workspace_count' | 'last_activity' | 'status'
  export let current: any = undefined

  const dispatch = createEventDispatcher()

  // local working copy seeded from the currently-applied filter (if any)
  let textValue: string =
    column === 'name' ? (current?.nameContains ?? '') : column === 'email' ? (current?.emailContains ?? '') : ''
  let statusSel = {
    active: Array.isArray(current?.statusIn) ? current.statusIn.includes('active') : false,
    disabled: Array.isArray(current?.statusIn) ? current.statusIn.includes('disabled') : false
  }
  let authSel: Record<'email_only' | 'oidc' | 'mixed' | 'none', boolean> = {
    email_only: false,
    oidc: false,
    mixed: false,
    none: false
  }
  if (Array.isArray(current?.authMethodIn)) {
    for (const k of current.authMethodIn as Array<'email_only' | 'oidc' | 'mixed' | 'none'>) {
      authSel[k] = true
    }
  }
  let wsMin: number | null = current?.workspaceCountRange?.min ?? null
  let wsMax: number | null = current?.workspaceCountRange?.max ?? null
  let activityKind: 'range' | 'never' = current?.lastActivityFilter?.kind ?? 'range'
  let activityFrom: string =
    current?.lastActivityFilter?.kind === 'range' && current.lastActivityFilter.fromMs != null
      ? new Date(current.lastActivityFilter.fromMs).toISOString().slice(0, 10)
      : ''
  let activityTo: string =
    current?.lastActivityFilter?.kind === 'range' && current.lastActivityFilter.toMs != null
      ? new Date(current.lastActivityFilter.toMs).toISOString().slice(0, 10)
      : ''

  function apply (): void {
    let payload: any
    switch (column) {
      case 'name':
        payload = { nameContains: textValue.trim() !== '' ? textValue.trim() : undefined }
        break
      case 'email':
        payload = { emailContains: textValue.trim() !== '' ? textValue.trim() : undefined }
        break
      case 'status': {
        const sel: Array<'active' | 'disabled'> = []
        if (statusSel.active) sel.push('active')
        if (statusSel.disabled) sel.push('disabled')
        payload = { statusIn: sel.length > 0 ? sel : undefined }
        break
      }
      case 'auth': {
        const sel: Array<'email_only' | 'oidc' | 'mixed' | 'none'> = []
        if (authSel.email_only) sel.push('email_only')
        if (authSel.oidc) sel.push('oidc')
        if (authSel.mixed) sel.push('mixed')
        if (authSel.none) sel.push('none')
        payload = { authMethodIn: sel.length > 0 ? sel : undefined }
        break
      }
      case 'workspace_count':
        payload = {
          workspaceCountRange:
            wsMin != null || wsMax != null ? { min: wsMin ?? undefined, max: wsMax ?? undefined } : undefined
        }
        break
      case 'last_activity': {
        if (activityKind === 'never') {
          payload = { lastActivityFilter: { kind: 'never' } }
        } else {
          const fromMs = activityFrom !== '' ? new Date(activityFrom).getTime() : undefined
          const toMs = activityTo !== '' ? new Date(activityTo).getTime() : undefined
          payload =
            fromMs != null || toMs != null
              ? { lastActivityFilter: { kind: 'range', fromMs, toMs } }
              : { lastActivityFilter: undefined }
        }
        break
      }
    }
    // PopupInstance only forwards `update` and `close` upward. Use
    // `close` with a payload so the parent's showPopup `onClose`
    // callback receives the apply result and the popup closes
    // (matches the AddToWorkspacePopup / PR-B convention).
    dispatch('close', { column, payload })
  }

  function clear (): void {
    dispatch('close', { column, payload: 'clear' })
  }
</script>

<div class="popup" data-drawer-keep-open>
  {#if column === 'name' || column === 'email'}
    <input type="text" bind:value={textValue} placeholder="contains…" />
  {:else if column === 'status'}
    <label><CheckBox bind:checked={statusSel.active} /> Active</label>
    <label><CheckBox bind:checked={statusSel.disabled} /> Disabled</label>
  {:else if column === 'auth'}
    <label><CheckBox bind:checked={authSel.email_only} /> Email only</label>
    <label><CheckBox bind:checked={authSel.oidc} /> OIDC only</label>
    <label><CheckBox bind:checked={authSel.mixed} /> Mixed</label>
    <label><CheckBox bind:checked={authSel.none} /> None</label>
  {:else if column === 'workspace_count'}
    <div>min: <input type="number" min="0" value={wsMin ?? ''}
                     on:input={(e) => { wsMin = e.currentTarget.value === '' ? null : Math.max(0, Number(e.currentTarget.value)) }} /></div>
    <div>max: <input type="number" min="0" value={wsMax ?? ''}
                     on:input={(e) => { wsMax = e.currentTarget.value === '' ? null : Math.max(0, Number(e.currentTarget.value)) }} /></div>
  {:else if column === 'last_activity'}
    <label><input type="radio" bind:group={activityKind} value="range" /> Range</label>
    <label><input type="radio" bind:group={activityKind} value="never" /> Never active</label>
    {#if activityKind === 'range'}
      <div>from: <input type="date" bind:value={activityFrom} /></div>
      <div>to:   <input type="date" bind:value={activityTo} /></div>
    {/if}
  {/if}
  <div class="actions">
    <Button label={getEmbeddedLabel('Clear')} on:click={clear} />
    <Button label={getEmbeddedLabel('Apply')} kind={'primary'} on:click={apply} />
  </div>
</div>

<style lang="scss">
  .popup {
    padding: 0.75rem;
    min-width: 14rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.5rem;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.4rem;
  }
  label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    color: var(--theme-content-color);
  }
  input[type='text'],
  input[type='number'],
  input[type='date'] {
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.25rem;
    background: var(--theme-bg-color);
    color: var(--theme-content-color);
    font-size: 0.85rem;
  }
</style>
