<!--
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { type Timestamp, type WorkspaceUuid } from '@hcengineering/core'
  import presentation, { copyTextToClipboard } from '@hcengineering/presentation'
  import { type IntlString } from '@hcengineering/platform'
  import view from '@hcengineering/view'
  import {
    DropdownLabelsIntl,
    type DropdownIntlItem,
    Label,
    ListItem,
    Modal,
    ModernEditbox,
    Dropdown,
    ticker
  } from '@hcengineering/ui'
  import setting from '@hcengineering/setting'
  import { createEventDispatcher, onMount } from 'svelte'
  import { getAccountClient } from '../utils'

  let name = ''
  let loading = false
  let error: IntlString | undefined
  let wsItems: ListItem[] = []
  let selectedWs: ListItem | undefined
  let createdToken: string | undefined
  let copiedTime: Timestamp | undefined
  let copied = false

  const scopePresetItems: DropdownIntlItem[] = [
    { id: 'read-only', label: setting.string.ApiTokenScopeReadOnly },
    { id: 'read-write', label: setting.string.ApiTokenScopeReadWrite },
    { id: 'full-access', label: setting.string.ApiTokenScopeFullAccess }
  ]
  const scopeScopes: Record<string, string[]> = {
    'read-only': ['read:*'],
    'read-write': ['read:*', 'write:*'],
    'full-access': ['read:*', 'write:*', 'delete:*']
  }
  let selectedScopePreset: string = 'read-only'

  function getSelectedScopes (): string[] {
    return scopeScopes[selectedScopePreset] ?? ['read:*']
  }

  const expiryItems: DropdownIntlItem[] = [
    { id: '7', label: setting.string.ApiTokenExpiry7Days },
    { id: '30', label: setting.string.ApiTokenExpiry30Days },
    { id: '90', label: setting.string.ApiTokenExpiry90Days },
    { id: '180', label: setting.string.ApiTokenExpiry180Days },
    { id: '365', label: setting.string.ApiTokenExpiry365Days }
  ]
  let selectedExpiry: string = '30'

  const dispatch = createEventDispatcher()

  $: canSave = !loading && name.trim().length > 0 && selectedWs !== undefined && createdToken === undefined

  $: if (copiedTime !== undefined && copied && $ticker - copiedTime > 1500) {
    copied = false
  }

  async function loadWorkspaces (): Promise<void> {
    const workspaces = await getAccountClient().getUserWorkspaces()
    wsItems = workspaces.map((w) => ({ _id: w.uuid, label: w.name ?? w.url }))
    if (wsItems.length > 0) {
      selectedWs = wsItems[0]
    }
  }

  async function create (): Promise<void> {
    if (selectedWs === undefined) return
    loading = true
    error = undefined
    try {
      const scopes = getSelectedScopes()
      const result = await getAccountClient().createApiToken(
        name.trim(),
        selectedWs._id as WorkspaceUuid,
        parseInt(selectedExpiry, 10),
        scopes
      )
      createdToken = result.token
    } catch (err: any) {
      console.error('Failed to create API token', err)
      error = setting.string.ApiTokenCreateError
    } finally {
      loading = false
    }
  }

  async function copyToken (): Promise<void> {
    if (createdToken === undefined || !window.isSecureContext) return
    await copyTextToClipboard(createdToken)
    copied = true
    copiedTime = Date.now()
  }

  onMount(() => {
    void loadWorkspaces()
  })
</script>

<Modal
  type="type-popup"
  label={createdToken !== undefined ? setting.string.ApiTokenCreated : setting.string.CreateApiToken}
  {canSave}
  okLabel={createdToken !== undefined
    ? copied
      ? view.string.Copied
      : view.string.CopyToClipboard
    : presentation.string.Create}
  okAction={createdToken !== undefined ? copyToken : create}
  onCancel={() => {
    dispatch('close', createdToken !== undefined)
  }}
>
  {#if createdToken !== undefined}
    <div class="antiPopup-msg token-reveal">
      <span class="label"><Label label={setting.string.ApiTokenCopyWarning} /></span>
      <div
        class="token-value"
        role="button"
        tabindex="0"
        on:click={copyToken}
        on:keydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') copyToken()
        }}
      >
        {createdToken}
      </div>
    </div>
  {:else}
    <div class="antiPopup-msg">
      <ModernEditbox label={setting.string.ApiTokenName} bind:value={name} size="large" kind="ghost" autoFocus />
    </div>
    <div class="antiPopup-msg">
      <span class="label"><Label label={setting.string.ApiTokenWorkspace} /></span>
      <Dropdown placeholder={setting.string.ApiTokenWorkspace} items={wsItems} bind:selected={selectedWs} />
    </div>
    <div class="antiPopup-msg">
      <span class="label"><Label label={setting.string.ApiTokenScopePreset} /></span>
      <DropdownLabelsIntl
        kind="regular"
        size="medium"
        items={scopePresetItems}
        selected={selectedScopePreset}
        on:selected={(e) => {
          selectedScopePreset = e.detail
        }}
      />
    </div>
    <div class="antiPopup-msg">
      <span class="label"><Label label={setting.string.ApiTokenExpiry} /></span>
      <DropdownLabelsIntl
        kind="regular"
        size="medium"
        items={expiryItems}
        selected={selectedExpiry}
        on:selected={(e) => {
          selectedExpiry = e.detail
        }}
      />
    </div>
    {#if error !== undefined}
      <div class="antiPopup-msg error"><Label label={error} /></div>
    {/if}
  {/if}
</Modal>

<style lang="scss">
  .token-reveal {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .token-value {
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-popup-divider);
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    font-family: var(--mono-font);
    font-size: 0.6875rem;
    line-height: 1.6;
    word-break: break-all;
    cursor: pointer;
    user-select: all;
    color: var(--theme-content-color);
  }
  .label {
    font-size: 0.75rem;
    color: var(--theme-dark-color);
  }
  .error {
    color: var(--theme-error-color);
    font-size: 0.75rem;
  }
</style>
