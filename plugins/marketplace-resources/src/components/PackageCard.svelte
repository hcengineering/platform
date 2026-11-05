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
  import marketplace, { type CatalogPackageVisibility } from '@hcengineering/marketplace'
  import { IconArchive, Label, Notice, SettingsCard, ShowMore } from '@hcengineering/ui'

  export let name: string
  export let version: string
  export let description = ''
  export let kind: 'card' | 'process' | undefined = undefined
  export let authorName: string | undefined = undefined
  export let contactEmail: string | undefined = undefined
  export let publishedOn: number | undefined = undefined
  export let installedVersions: readonly string[] = []
  export let visibility: CatalogPackageVisibility | undefined = undefined
</script>

<SettingsCard label={marketplace.string.Marketplace} labelText={name}>
  <span slot="actions" class="version text-sm font-medium">v{version}</span>
  <div class="flex-col flex-gap-4">
    {#if visibility === 'private'}
      <span class="text-sm content-dark-color" data-id="package-private">
        <Label label={marketplace.string.PrivatePackage} />
      </span>
    {/if}
    {#if kind !== undefined || authorName || publishedOn !== undefined}
      <div class="metadata flex-row-center flex-wrap flex-gap-3 text-sm content-dark-color">
        {#if kind !== undefined}
          <span class="flex-row-center flex-gap-1">
            <span aria-hidden="true"><IconArchive size="small" /></span>
            <Label label={kind === 'card' ? marketplace.string.CardModule : marketplace.string.ProcessBundle} />
          </span>
        {/if}
        {#if authorName}<span>{authorName}</span>{/if}
        {#if publishedOn !== undefined}
          <time datetime={new Date(publishedOn).toISOString()}>{new Date(publishedOn).toLocaleDateString()}</time>
        {/if}
      </div>
    {/if}
    {#if installedVersions.length > 0}
      <div data-id="package-installed">
        <Notice
          label={marketplace.string.Installed}
          params={{ versions: installedVersions.map((version) => `v${version}`).join(', ') }}
          kind="positive"
        />
      </div>
    {/if}
    {#if description}
      <div class="description-wrap">
        <ShowMore limit={180}><p class="description" data-id="package-description">{description}</p></ShowMore>
      </div>
    {/if}
    {#if contactEmail}<a class="contact text-sm content-dark-color" href={`mailto:${contactEmail}`}>{contactEmail}</a
      >{/if}
    <slot />
    {#if $$slots.actions}
      <div class="package-actions flex-row-center flex-wrap flex-gap-2"><slot name="actions" /></div>
    {/if}
  </div>
</SettingsCard>

<style lang="scss">
  .version {
    padding: var(--spacing-0_5) var(--spacing-2);
    border-radius: var(--spacing-1);
    color: var(--theme-content-color);
    background-color: var(--theme-button-default);
    white-space: nowrap;
  }
  .metadata,
  .contact {
    overflow-wrap: anywhere;
  }
  .description {
    margin: 0;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .description-wrap {
    position: relative;
  }
  .package-actions {
    padding-top: var(--spacing-3);
    border-top: 1px solid var(--theme-divider-color);
  }
</style>
