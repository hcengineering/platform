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
  import { getCurrentAccount } from '@hcengineering/core'
  import marketplace, {
    MarketplaceError,
    parseDefinitionPackageRelease,
    type DefinitionPackageRelease
  } from '@hcengineering/marketplace'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import ui, { Button, Dialog, EditBox, Label, Notice, ToggleWithLabel } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { getMarketplaceClient } from '../catalog'
  import { getPackageName } from '../package-presentation'
  import PackageCard from './PackageCard.svelte'

  export let source: string

  const dispatch = createEventDispatcher<{ close: boolean }>()
  let release: DefinitionPackageRelease | undefined
  let contactEmail = ''
  let privatePackage = false
  let busy = false
  let error = ''
  let valid = false

  async function validate (): Promise<void> {
    try {
      const value = await parseDefinitionPackageRelease(source)
      const account = getCurrentAccount().uuid
      const author = value.package.author
      if (author === undefined) throw new Error('The package must have an author')
      release = value
      try {
        const entry = await getMarketplaceClient().get({ id: value.package.id, author })
        if (entry.owner !== account) throw new Error('Only the package owner can publish releases')
        privatePackage = entry.visibility === 'private'
        contactEmail = entry.contactEmail ?? ''
      } catch (cause) {
        if (!(cause instanceof MarketplaceError) || cause.status !== 404) throw cause
        if (author !== account) throw new Error('Only the package owner can publish releases')
      }
      valid = true
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause)
    }
  }
  void validate()

  async function publish (): Promise<void> {
    if (busy || !valid) return
    busy = true
    error = ''
    try {
      await getMarketplaceClient().publish(source, contactEmail, privatePackage ? 'private' : 'public')
      dispatch('close', true)
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause)
    } finally {
      busy = false
    }
  }
</script>

<Dialog
  label={marketplace.string.PublishPackage}
  width="40rem"
  padding="var(--spacing-3)"
  on:close={() => {
    if (!busy) dispatch('close', false)
  }}
>
  <div class="flex-col flex-gap-4">
    <div class="text-sm content-dark-color"><Label label={marketplace.string.PublishPackageDescription} /></div>
    <div data-id="package-private-visibility">
      <ToggleWithLabel
        label={marketplace.string.PrivatePackage}
        description={marketplace.string.PrivatePackageDescription}
        bind:on={privatePackage}
        disabled={busy || !valid}
      />
    </div>
    {#if release}
      <PackageCard
        name={getPackageName(release)}
        version={release.package.version}
        description={release.package.description}
        kind={release.definition.kind}
      />
    {/if}
    <div class="flex-col flex-gap-2">
      <EditBox
        label={marketplace.string.ContactEmailOptional}
        placeholder={marketplace.string.ContactEmailOptional}
        bind:value={contactEmail}
        disabled={busy || !valid}
      />
      <div class="text-sm content-dark-color"><Label label={marketplace.string.ContactEmailVisible} /></div>
    </div>
    {#if error}<div data-id="package-publication-error">
        <Notice label={getEmbeddedLabel(error)} kind="error" />
      </div>{/if}
  </div>
  <svelte:fragment slot="footerRight">
    <Button label={ui.string.Publish} kind="primary" loading={busy} disabled={busy || !valid} on:click={publish} />
  </svelte:fragment>
</Dialog>
