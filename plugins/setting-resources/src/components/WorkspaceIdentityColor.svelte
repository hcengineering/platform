<!-- Copyright © 2026 Huly Contributors. Licensed under the Eclipse Public License, Version 2.0. -->
<script lang="ts">
  import core, { AccountRole, getCurrentAccount } from '@hcengineering/core'
  import {
    defaultIdentityColor, getClient, getFileUrl, getDefaultWorkspaceFaviconUrl, normalizeIdentityColor,
    renderWorkspaceIdentity, type WorkspaceIdentityImage
  } from '@hcengineering/presentation'
  import setting, { type WorkspaceSetting } from '@hcengineering/setting'
  import { Button, Label, Toggle } from '@hcengineering/ui'
  import { onDestroy, tick } from 'svelte'

  export let workspaceSetting: WorkspaceSetting | undefined
  const client = getClient()
  const canEdit = getCurrentAccount().role === AccountRole.Owner
  let preview: WorkspaceIdentityImage = { color: defaultIdentityColor }
  let busy = false
  let error = false
  let imageError = false
  let colorInput: HTMLInputElement
  let revision = 0
  let saveRevision = 0
  let request: AbortController | undefined
  const defaultIconUrl = getDefaultWorkspaceFaviconUrl()
  $: syncLogo = workspaceSetting?.syncWorkspaceLogo === true
  $: showColor = workspaceSetting?.identificationColorEnabled === true
  $: manualColor = normalizeIdentityColor(workspaceSetting?.identificationColor)
  $: logoUrl = workspaceSetting?.icon != null ? getFileUrl(workspaceSetting.icon) : undefined
  $: void updatePreview(logoUrl, manualColor, syncLogo, showColor)

  async function updatePreview (url: string | undefined, color: string | undefined, syncLogo: boolean, showColor: boolean): Promise<void> {
    const current = ++revision
    request?.abort()
    request = new AbortController()
    imageError = false
    try {
      const next = await renderWorkspaceIdentity(url, color, request.signal, { syncLogo, showColor, defaultIconUrl })
      if (current === revision) preview = next
    } catch {
      if (current === revision) {
        imageError = true
        preview = { color: color ?? defaultIdentityColor }
      }
    }
  }

  async function saveColor (value: string | null): Promise<void> {
    const color = value === null ? null : normalizeIdentityColor(value)
    if (color !== undefined) await save({ identificationColor: color })
  }

  async function save (patch: Partial<Pick<WorkspaceSetting, 'identificationColor' | 'syncWorkspaceLogo' | 'identificationColorEnabled'>>): Promise<void> {
    if (!canEdit || busy) return
    const focused = document.activeElement as HTMLElement | null
    const focusLabel = focused?.closest('label')?.getAttribute('aria-labelledby')
    busy = true
    error = false
    try {
      const existing = await client.findOne(setting.class.WorkspaceSetting, { _id: setting.ids.WorkspaceSetting })
      if (existing === undefined) {
        await client.createDoc(setting.class.WorkspaceSetting, core.space.Workspace,
          patch, setting.ids.WorkspaceSetting)
      } else {
        await client.diffUpdate(existing, patch)
      }
    } catch {
      error = true
      if (colorInput !== undefined) colorInput.value = preview.color
      saveRevision++
    } finally {
      busy = false
      await tick()
      if (document.activeElement === document.body) {
        if (focused instanceof HTMLButtonElement && focused.disabled) colorInput?.focus()
        else if (focused?.isConnected === true) focused.focus()
        else if (focusLabel === 'workspace-sync-logo-label' || focusLabel === 'workspace-color-label') {
          document.querySelector<HTMLInputElement>(`label[aria-labelledby="${focusLabel}"] input`)?.focus()
        }
      }
    }
  }

  onDestroy(() => {
    revision++
    request?.abort()
  })
</script>

<div class="identity" aria-busy={busy}>
  <div class="setting-row">
    <span id="workspace-sync-logo-label"><Label label={setting.string.SyncWorkspaceLogo} /></span>
    <div class="controls">
      {#key saveRevision}
        <Toggle on={syncLogo} disabled={!canEdit || busy} aria-labelledby="workspace-sync-logo-label"
          on:change={(event) => save({ syncWorkspaceLogo: event.detail })} />
      {/key}
    </div>
  </div>
  <div class="setting-row">
    <span id="workspace-color-label"><Label label={setting.string.IdentificationColor} /></span>
    <div class="controls">
      {#key saveRevision}
        <Toggle on={showColor} disabled={!canEdit || busy} aria-labelledby="workspace-color-label"
          on:change={(event) => save({ identificationColorEnabled: event.detail })} />
      {/key}
      {#if showColor}
        <div class="color-control" role="group" aria-labelledby="workspace-color-label">
          <label class="color-value">
            <span class="color-swatch" style:background={preview.color} />
            <code>{preview.color.toUpperCase()}</code>
            <span class="sr-only"><Label label={setting.string.IdentificationColor} /></span>
            <input bind:this={colorInput} type="color" value={preview.color} disabled={!canEdit || busy}
              on:change={(event) => saveColor(event.currentTarget.value)} />
          </label>
          <span class="color-reset">
            <Button kind="ghost" size="small" label={setting.string.ColorDefault} padding="0 .5rem"
              disabled={!canEdit || busy || manualColor === undefined} on:click={() => saveColor(null)} />
          </span>
        </div>
      {/if}
    </div>
  </div>
  {#if imageError}<div class="error" role="status"><Label label={setting.string.ColorLogoUnavailable} /></div>{/if}
  {#if error}<div class="error" role="alert"><Label label={setting.string.ColorSaveFailed} /></div>{/if}
</div>

<style>
  .identity { display: flex; flex-direction: column; gap: 1rem; }
  .setting-row { display: grid; grid-template-columns: min(11rem, 45%) minmax(0, 1fr); align-items: center; gap: 0.75rem; min-height: 2rem; }
  .controls { display: flex; align-items: center; flex-wrap: wrap; gap: 0.75rem; min-width: 0; }
  .setting-row :global(.toggle:focus-within) { outline: 2px solid var(--primary-button-outline); outline-offset: 3px; border-radius: 1rem; }
  .color-control {
    display: inline-flex;
    align-items: center;
    padding: 0.125rem;
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.5rem;
    max-width: 100%;
  }
  .color-value {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.5rem 0.25rem 0.25rem;
    border-radius: 0.25rem;
    min-width: 0;
  }
  .color-value:focus-within { outline: 2px solid var(--theme-content-color); outline-offset: 2px; }
  .color-swatch {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 0.25rem;
    box-shadow: inset 0 0 0 1px var(--theme-divider-color);
  }
  .color-reset { border-left: 1px solid var(--theme-divider-color); padding-left: 0.125rem; }
  input[type='color'] { position: absolute; inset: 0; opacity: 0; width: 100%; height: 100%; cursor: pointer; }
  code { font-size: 0.8rem; }
  .error { color: var(--theme-error-color, #e05252); font-size: 0.8125rem; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>
