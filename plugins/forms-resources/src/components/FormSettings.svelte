<!--
//
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
  import type { MasterTag } from '@hcengineering/card'
  import core from '@hcengineering/core'
  import type { FormConfiguration } from '@hcengineering/forms'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Button, Icon, IconFolder, Label, Loading } from '@hcengineering/ui'
  import forms from '../plugin'
  import { isBaseTypeWithSubtypes } from '../utils'
  import FormSettingsItem from './FormSettingsItem.svelte'

  export let masterTag: MasterTag

  const client = getClient()
  const query = createQuery()
  let configurations: FormConfiguration[] = []
  let loaded = false
  let saving = false
  let failed = false

  $: query.query(
    forms.class.FormConfiguration,
    { masterTag: masterTag._id },
    (docs) => {
      configurations = docs
      loaded = true
    },
    { sort: { createdOn: 1, _id: 1 } }
  )
  $: baseType = isBaseTypeWithSubtypes(client.getHierarchy(), masterTag._id)

  async function addForm (): Promise<void> {
    if (saving || baseType) return
    saving = true
    failed = false
    try {
      await client.createDoc(forms.class.FormConfiguration, core.space.Workspace, {
        masterTag: masterTag._id,
        mode: 'public',
        enabled: false
      })
    } catch (error) {
      console.error('[FormSettings.addForm] Failed to create form', { error })
      failed = true
    } finally {
      saving = false
    }
  }
</script>

<div class="hulyTableAttr-header font-medium-12">
  <Icon icon={IconFolder} size="small" />
  <span><Label label={forms.string.Forms} /></span>
</div>
<div class="hulyTableAttr-content">
  <div class="settings-list">
    {#if !loaded}<Loading />
    {:else}
      {#each configurations as configuration (configuration._id)}
        <FormSettingsItem {configuration} {masterTag} {baseType} />
      {/each}
      <Button label={forms.string.AddForm} disabled={saving || baseType} on:click={addForm} />
    {/if}
    {#if failed}<p role="alert"><Label label={forms.string.Failed} /></p>{/if}
  </div>
</div>

<style lang="scss">
  .settings-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-2_5);
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
</style>
