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
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import core, { getCurrentAccount, type Doc, type Ref } from '@hcengineering/core'
  import marketplace, {
    DefinitionPackageError,
    createDefinitionPackageExport,
    createDefinitionPackageMetadata,
    type DefinitionPackageOwner
  } from '@hcengineering/marketplace'
  import { getClient } from '@hcengineering/presentation'
  import { getEmbeddedLabel, type IntlString } from '@hcengineering/platform'
  import process from '@hcengineering/process'
  import { Button, CheckBox, Dialog, Label, Notice, SettingsCard, TextArea, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher, tick } from 'svelte'
  import { getMarketplaceClient, hasMarketplace } from '../catalog'
  import PublishPackagePopup from './PublishPackagePopup.svelte'

  export let source: string
  export let definition: DefinitionPackageOwner
  export let newVersion = false
  export let onDownload: (source: string, name: string, format: 'yaml') => void
  export let candidates: Array<{ definition: DefinitionPackageOwner, label: IntlString }> = []
  export let getSource: ((definitions: DefinitionPackageOwner[]) => string | Promise<string>) | undefined = undefined

  const dispatch = createEventDispatcher<{ close: void }>()
  const previous = definition.definitionPackage
  let description = previous?.description ?? definition.description ?? ''
  let busy = false
  let error = ''
  let selected = new Set(previous?.members ?? [definition._id])
  $: unavailable = (previous?.members ?? []).filter(
    (id) => !candidates.some((candidate) => candidate.definition._id === id)
  )

  function close (): void {
    if (!busy) dispatch('close')
  }

  function clearError (): void {
    error = ''
  }

  function select (id: Ref<Doc>, checked: boolean): void {
    selected = new Set(selected)
    if (checked) selected.add(id)
    else selected.delete(id)
    clearError()
  }

  async function exportPackage (publish = false): Promise<void> {
    if (busy || (newVersion && previous === undefined)) return
    busy = true
    error = ''
    try {
      const client = getClient()
      const current = client.getModel().findObject<DefinitionPackageOwner>(definition._id)
      if (current === undefined) throw new DefinitionPackageError('package', 'The package definition is unavailable')
      const info = current.definitionPackage
      if (newVersion ? info === undefined : info !== undefined) {
        throw new DefinitionPackageError('package', 'Package membership changed; reopen the export dialog')
      }
      if (info?.id !== previous?.id || info?.version !== previous?.version || info?.author !== previous?.author) {
        throw new DefinitionPackageError('package', 'Package version changed; reopen the export dialog')
      }
      const definitions: DefinitionPackageOwner[] = []
      if (getSource !== undefined) {
        for (const id of selected) {
          const member = client.getModel().findObject<DefinitionPackageOwner>(id)
          if (member === undefined)
            throw new DefinitionPackageError('package.members', 'A selected process is unavailable')
          const membership = member.definitionPackage
          if (
            membership !== undefined &&
            (membership.id !== info?.id ||
              membership.author !== info?.author ||
              membership.version !== info?.version ||
              JSON.stringify(membership.members) !== JSON.stringify(info?.members))
          ) {
            throw new DefinitionPackageError('package.members', 'A selected process belongs to another package version')
          }
          definitions.push(member)
        }
        if (definitions.length === 0) throw new DefinitionPackageError('package.members', 'Select at least one process')
      }
      const account = getCurrentAccount().uuid
      const author = info?.author ?? account
      if (author !== account) {
        const entry = await getMarketplaceClient().get({ id: info?.id ?? '', author })
        if (entry.owner !== account) {
          throw new DefinitionPackageError('package.author', 'Only the package owner can create a new version')
        }
      }
      const metadata = createDefinitionPackageMetadata(author, description, info)
      if (getSource !== undefined) metadata.members = definitions.map((member) => member._id)
      const content = await createDefinitionPackageExport(
        getSource === undefined ? source : await getSource(definitions),
        metadata,
        info
      )
      if (getSource === undefined) await client.update(current, { definitionPackage: metadata })
      else {
        const apply = client.apply('Export process package')
        for (const member of definitions) {
          apply.match(member._class, { _id: member._id, modifiedOn: member.modifiedOn })
          await apply.updateDoc(member._class, member.space, member._id, { definitionPackage: metadata })
        }
        for (const id of info?.members ?? []) {
          if (selected.has(id)) continue
          const member = client.getModel().findObject<DefinitionPackageOwner>(id)
          if (member === undefined) continue
          if (member.definitionPackage?.id !== info?.id) continue
          if (
            member.definitionPackage?.version !== info?.version ||
            member.definitionPackage?.author !== info?.author
          ) {
            throw new DefinitionPackageError('package.members', 'Package membership changed; reopen the export dialog')
          }
          apply.match(member._class, { _id: member._id, modifiedOn: member.modifiedOn })
          await apply.updateDoc(member._class, member.space, member._id, { $unset: { definitionPackage: true } })
        }
        if (!(await apply.commit(true)).result)
          throw new DefinitionPackageError('package', 'Saving package membership failed')
      }
      if (!publish) onDownload(content, `${metadata.id.replace('/', '-')}-${metadata.version}.package`, 'yaml')
      dispatch('close')
      if (publish) {
        await tick()
        showPopup(PublishPackagePopup, { source: content }, 'centered')
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause)
    } finally {
      busy = false
    }
  }
</script>

<Dialog
  label={newVersion ? marketplace.string.CreateNewPackageVersion : marketplace.string.MakePackage}
  width="40rem"
  padding="var(--spacing-3)"
  on:close={close}
>
  <div class="flex-col flex-gap-4">
    <TextArea
      label={core.string.Description}
      placeholder={core.string.Description}
      width="100%"
      height="9rem"
      bind:value={description}
      disabled={busy}
      on:change={clearError}
    />
    {#if candidates.length > 0}
      <SettingsCard label={process.string.Processes}>
        <div class="flex-col flex-gap-3">
          {#each candidates as candidate (candidate.definition._id)}
            <div class="flex-row-center flex-gap-2" data-id="package-process">
              <CheckBox
                checked={selected.has(candidate.definition._id)}
                disabled={busy || candidate.definition._id === definition._id}
                on:value={(event) => select(candidate.definition._id, event.detail)}
              />
              <Label label={candidate.label} />
            </div>
          {/each}
          {#each unavailable as id (id)}
            <div class="flex-row-center flex-gap-2">
              <CheckBox checked={selected.has(id)} disabled={busy} on:value={(event) => select(id, event.detail)} />
              <Label label={marketplace.string.UnavailablePackageMember} />
              <span>{String(id).slice(-6)}</span>
            </div>
          {/each}
        </div>
      </SettingsCard>
    {/if}
    {#if error}<div data-id="package-export-error"><Notice label={getEmbeddedLabel(error)} kind="error" /></div>{/if}
  </div>
  <svelte:fragment slot="footerRight">
    {#if hasMarketplace()}
      <Button
        label={marketplace.string.PublishPackage}
        disabled={busy || (newVersion && previous === undefined)}
        on:click={() => exportPackage(true)}
      />
    {/if}
    <Button
      label={marketplace.string.Export}
      kind="primary"
      disabled={busy || (newVersion && previous === undefined)}
      on:click={() => exportPackage()}
    />
  </svelte:fragment>
</Dialog>
