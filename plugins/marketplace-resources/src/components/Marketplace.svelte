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
  import marketplace, { type CatalogPackage, type DefinitionPackageInstallation } from '@hcengineering/marketplace'
  import { createQuery } from '@hcengineering/presentation'
  import ui, {
    Breadcrumb,
    Button,
    Header,
    IconAdd,
    IconHistory,
    Label,
    Notice,
    SearchInput,
    Scroller,
    SectionEmpty,
    SettingsCardsLayout,
    Spinner,
    TabsControl,
    showPopup
  } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { onDestroy } from 'svelte'
  import { downloadCatalogRelease, getInstalledPackageVersions, getMarketplaceClient, hasMarketplace } from '../catalog'
  import DefinitionPackageInstallPopup from './DefinitionPackageInstallPopup.svelte'
  import InstalledPackages from './InstalledPackages.svelte'
  import PackageVersionsPopup from './PackageVersionsPopup.svelte'
  import PublishPackagePopup from './PublishPackagePopup.svelte'
  import PackageCard from './PackageCard.svelte'

  const configured = hasMarketplace()
  const tabs = [
    { label: marketplace.string.Catalog },
    { label: marketplace.string.InstalledPackages },
    { label: marketplace.string.MyPublications }
  ]
  let selected = configured ? 0 : 1
  let search: string | undefined = ''
  let entries: CatalogPackage[] = []
  let installations: DefinitionPackageInstallation[] = []
  const installationsQuery = createQuery()
  installationsQuery.query(marketplace.class.DefinitionPackageInstallation, {}, (result) => {
    installations = result
  })
  let nextOffset: number | undefined
  let loading = false
  let busy = false
  let error = ''
  let generation = 0
  onDestroy(() => {
    generation++
  })
  $: void reload(selected, search)

  async function reload (tab: number, query: string | undefined): Promise<void> {
    const request = ++generation
    error = ''
    entries = []
    nextOffset = undefined
    loading = false
    if (!configured || tab === 1) return
    loading = true
    try {
      const page = await getMarketplaceClient().list({ search: query, mine: tab === 2 })
      if (request !== generation) return
      entries = page.items
      nextOffset = page.nextOffset
    } catch (cause) {
      if (request === generation) error = cause instanceof Error ? cause.message : String(cause)
    } finally {
      if (request === generation) loading = false
    }
  }

  async function loadMore (): Promise<void> {
    if (loading || nextOffset === undefined) return
    const request = generation
    loading = true
    error = ''
    try {
      const page = await getMarketplaceClient().list({ search, mine: selected === 2, offset: nextOffset })
      if (request !== generation) return
      const keys = new Set(entries.map((entry) => `${entry.author}/${entry.id}`))
      entries = [...entries, ...page.items.filter((entry) => !keys.has(`${entry.author}/${entry.id}`))]
      nextOffset = page.nextOffset
    } catch (cause) {
      if (request === generation) error = cause instanceof Error ? cause.message : String(cause)
    } finally {
      if (request === generation) loading = false
    }
  }

  async function install (entry: CatalogPackage): Promise<void> {
    if (busy) return
    busy = true
    error = ''
    try {
      const source = await downloadCatalogRelease(entry, entry.version)
      showPopup(DefinitionPackageInstallPopup, { source }, 'centered')
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause)
    } finally {
      busy = false
    }
  }

  function publishFile (): void {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.yaml,.yml,.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (file === undefined) return
      try {
        const source = await file.text()
        showPopup(PublishPackagePopup, { source }, 'centered', () => {
          void reload(selected, search)
        })
      } catch (cause) {
        error = cause instanceof Error ? cause.message : String(cause)
      }
    }
    input.click()
  }

  async function toggleVisibility (entry: CatalogPackage): Promise<void> {
    if (busy) return
    busy = true
    error = ''
    try {
      await getMarketplaceClient().setVisibility(entry, entry.visibility === 'private' ? 'public' : 'private')
      await reload(selected, search)
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause)
    } finally {
      busy = false
    }
  }
</script>

<div class="hulyComponent">
  <Header adaptive="disabled">
    <Breadcrumb icon={marketplace.icon.Marketplace} label={marketplace.string.Marketplace} size="large" isCurrent />
    <svelte:fragment slot="actions">
      {#if configured && selected === 2}
        <Button label={marketplace.string.PublishPackage} icon={IconAdd} kind="primary" on:click={publishFile} />
      {/if}
    </svelte:fragment>
  </Header>
  <TabsControl model={tabs} bind:selected padding="0 var(--spacing-3)" size="small" />
  <div class="hulyComponent-content__column content">
    <Scroller align="center" padding="var(--spacing-3)" bottomPadding="var(--spacing-3)">
      <div class="hulyComponent-content flex-gap-4">
        {#if selected === 1}
          <InstalledPackages />
        {:else if !configured}
          <Notice label={marketplace.string.MarketplaceNotConfigured} />
        {:else}
          <div class="flex-col flex-gap-4">
            <div class="text-sm content-dark-color"><Label label={marketplace.string.CatalogDescription} /></div>
            <div class="catalog-search w-full"><SearchInput bind:value={search} width="100%" /></div>
          </div>
          {#if entries.length > 0}
            <SettingsCardsLayout columns={2}>
              {#each entries as entry (`${entry.author}/${entry.id}`)}
                <div data-id="catalog-package">
                  <PackageCard
                    name={entry.name}
                    version={entry.version}
                    description={entry.description}
                    kind={entry.kind}
                    authorName={entry.authorName}
                    contactEmail={entry.contactEmail}
                    publishedOn={entry.publishedOn}
                    visibility={entry.visibility}
                    installedVersions={getInstalledPackageVersions(entry, installations)}
                  >
                    <svelte:fragment slot="actions">
                      <Button
                        label={marketplace.string.InstallPackage}
                        icon={IconAdd}
                        kind="primary"
                        disabled={busy}
                        on:click={() => install(entry)}
                      />
                      <Button
                        label={marketplace.string.VersionHistory}
                        icon={IconHistory}
                        kind="ghost"
                        disabled={busy}
                        on:click={() => showPopup(PackageVersionsPopup, { entry }, 'centered')}
                      />
                      {#if selected === 2}
                        <div data-id="package-toggle-visibility">
                          <Button
                            label={entry.visibility === 'private'
                              ? marketplace.string.MakePublic
                              : marketplace.string.MakePrivate}
                            kind="ghost"
                            disabled={busy}
                            on:click={() => toggleVisibility(entry)}
                          />
                        </div>
                      {/if}
                    </svelte:fragment>
                  </PackageCard>
                </div>
              {/each}
            </SettingsCardsLayout>
          {:else if !loading && !error}
            <SectionEmpty
              icon={marketplace.icon.Marketplace}
              label={selected === 2 && !search ? marketplace.string.NoPublishedPackages : ui.string.NoResults}
            />
          {/if}
          {#if loading}<div class="flex-center p-4"><Spinner /></div>{/if}
          {#if nextOffset !== undefined && !loading}
            <div class="flex-center"><Button label={marketplace.string.LoadMore} on:click={loadMore} /></div>
          {/if}
          {#if error}<div data-id="marketplace-error"><Notice label={getEmbeddedLabel(error)} kind="error" /></div>{/if}
        {/if}
      </div>
    </Scroller>
  </div>
</div>

<style lang="scss">
  .catalog-search {
    max-width: 24rem;
  }
</style>
