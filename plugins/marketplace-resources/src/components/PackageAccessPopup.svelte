<!--
// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import marketplace, { type CatalogPackage, type CatalogPackageReader } from '@hcengineering/marketplace'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import ui, { Button, CheckBox, Dialog, EditBox, Label, Notice, SettingsCard, Spinner } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { getMarketplaceClient } from '../catalog'

  export let entry: CatalogPackage

  const dispatch = createEventDispatcher<{ close: boolean }>()
  const client = getMarketplaceClient()
  let readers: CatalogPackageReader[] = []
  let email = ''
  let ownerEmail = ''
  let confirmed = false
  let loading = true
  let busy = false
  let changed = false
  let error = ''

  async function load (): Promise<void> {
    try {
      readers = await client.readers(entry)
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause)
    } finally {
      loading = false
    }
  }
  void load()

  async function updateAccess (change: () => Promise<void>): Promise<void> {
    if (busy || loading) return
    busy = true
    error = ''
    try {
      await change()
      changed = true
      readers = await client.readers(entry)
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause)
    } finally {
      busy = false
    }
  }

  async function share (): Promise<void> {
    await updateAccess(async () => {
      await client.grantRead(entry, email)
      email = ''
    })
  }

  async function revoke (reader: CatalogPackageReader): Promise<void> {
    await updateAccess(async () => {
      await client.revokeRead(entry, reader.account)
    })
  }

  async function transfer (): Promise<void> {
    if (busy || loading || !confirmed) return
    busy = true
    error = ''
    try {
      await client.transferOwnership(entry, ownerEmail)
      dispatch('close', true)
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause)
    } finally {
      busy = false
    }
  }

  function close (): void {
    if (!busy) dispatch('close', changed)
  }
</script>

<Dialog label={marketplace.string.ManagePackageAccess} width="40rem" padding="var(--spacing-3)" on:close={close}>
  <div class="flex-col flex-gap-4">
    <div class="font-medium">{entry.name}</div>
    {#if loading}<div class="flex-center p-4"><Spinner /></div>{/if}
    <SettingsCard label={marketplace.string.PackageReaders}>
      <div class="flex-col flex-gap-3">
        <div class="text-sm content-dark-color"><Label label={marketplace.string.PackageReadersDescription} /></div>
        <div data-id="package-reader-email">
          <EditBox label={marketplace.string.AccountEmail} bind:value={email} disabled={busy || loading} />
        </div>
        <div data-id="package-grant-read">
          <Button
            label={marketplace.string.GrantReadAccess}
            disabled={busy || loading || email.trim() === ''}
            on:click={share}
          />
        </div>
        {#each readers as reader (reader.account)}
          <div class="flex-between flex-gap-2" data-id="package-reader">
            <span class="text-sm">{reader.email}</span>
            <Button label={ui.string.Remove} kind="ghost" disabled={busy || loading} on:click={() => revoke(reader)} />
          </div>
        {/each}
      </div>
    </SettingsCard>
    <SettingsCard label={marketplace.string.TransferPackageOwnership}>
      <div class="flex-col flex-gap-3">
        <Notice label={marketplace.string.TransferPackageOwnershipDescription} />
        <div data-id="package-owner-email">
          <EditBox label={marketplace.string.AccountEmail} bind:value={ownerEmail} disabled={busy || loading} />
        </div>
        <div class="flex-row-center flex-gap-2" data-id="package-transfer-confirmation">
          <CheckBox bind:checked={confirmed} disabled={busy || loading} />
          <Label label={marketplace.string.ConfirmPackageOwnershipTransfer} />
        </div>
        <div data-id="package-transfer-ownership">
          <Button
            label={marketplace.string.TransferPackageOwnership}
            disabled={busy || loading || !confirmed || ownerEmail.trim() === ''}
            on:click={transfer}
          />
        </div>
      </div>
    </SettingsCard>
    {#if error}<div data-id="package-access-error"><Notice label={getEmbeddedLabel(error)} kind="error" /></div>{/if}
  </div>
  <svelte:fragment slot="footerRight"
    ><Button label={presentation.string.Close} disabled={busy} on:click={close} /></svelte:fragment
  >
</Dialog>
