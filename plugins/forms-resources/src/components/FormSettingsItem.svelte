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
  import card, { type CardSpace, type MasterTag } from '@hcengineering/card'
  import { concatLink, type Ref, type Space } from '@hcengineering/core'
  import { formsId, type FormConfiguration, type FormMode } from '@hcengineering/forms'
  import { getMetadata } from '@hcengineering/platform'
  import presentation, { createQuery, getClient, getCurrentWorkspaceUrl, SpaceSelector } from '@hcengineering/presentation'
  import { Button, DropdownLabelsIntl, Label, Toggle } from '@hcengineering/ui'
  import forms from '../plugin'

  export let configuration: FormConfiguration
  export let masterTag: MasterTag
  export let baseType: boolean

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const spacesQuery = createQuery()
  let spaces: CardSpace[] = []
  let saving = false
  let failed = false

  const modes = [
    { id: 'public', label: forms.string.PublicForm },
    { id: 'private-fixed', label: forms.string.PrivateFixedForm },
    { id: 'private-auto', label: forms.string.PrivateAutoForm }
  ]
  spacesQuery.query(card.class.CardSpace, { archived: false }, (docs) => { spaces = docs })
  $: ancestors = hierarchy.getAncestors(masterTag._id)
  $: spaceQuery = {
    archived: false,
    _id: { $in: spaces.filter((space) =>
      space.types.length === 0 || space.types.some((type) => ancestors.includes(type))
    ).map((space) => space._id) }
  }
  $: mode = configuration.mode ?? 'public'
  $: targetSpace = configuration.targetSpace
  $: enabled = configuration.enabled === true
  $: toggleDisabled = saving || (!enabled && (baseType || (mode !== 'private-auto' && targetSpace === undefined)))
  $: link = concatLink(
    getMetadata(presentation.metadata.FrontUrl) || window.location.origin,
    `${formsId}/${encodeURIComponent(getCurrentWorkspaceUrl())}/${encodeURIComponent(configuration._id)}`
  )

  async function save (mode: FormMode, space: Ref<CardSpace> | undefined, publish: boolean): Promise<void> {
    if (saving) return
    saving = true
    failed = false
    try {
      const enabled = publish && !baseType && (mode === 'private-auto' || space !== undefined)
      if (mode === 'private-auto') {
        await client.update(configuration, { mode, enabled, $unset: { targetSpace: true } })
      } else {
        await client.update(configuration, { mode, enabled, targetSpace: space })
      }
    } catch (error) {
      console.error('[FormSettingsItem.save] Failed to update form', { form: configuration._id, error })
      failed = true
    } finally {
      saving = false
    }
  }

  async function remove (): Promise<void> {
    if (saving) return
    saving = true
    failed = false
    try {
      await client.remove(configuration)
    } catch (error) {
      console.error('[FormSettingsItem.remove] Failed to delete form', { form: configuration._id, error })
      failed = true
    } finally {
      saving = false
    }
  }

  function changeMode (event: CustomEvent<string | string[]>): void {
    if (typeof event.detail === 'string' && modes.some((mode) => mode.id === event.detail)) {
      void save(event.detail as FormMode, targetSpace, enabled)
    }
  }

  function changeSpace (event: CustomEvent<Ref<Space> | undefined>): void {
    void save(mode, event.detail as Ref<CardSpace> | undefined, enabled)
  }
</script>

<div class="form-settings">
  <div class="row">
    <Label label={forms.string.FormMode} />
    <DropdownLabelsIntl
      items={modes}
      selected={mode}
      disabled={saving}
      on:selected={changeMode}
    />
  </div>
  {#if mode !== 'private-auto'}
    <div class="row">
      <Label label={forms.string.TargetSpace} />
      <SpaceSelector
        _class={card.class.CardSpace}
        query={spaceQuery}
        label={forms.string.TargetSpace}
        autoSelect={false}
        space={targetSpace}
        readonly={saving}
        on:change={changeSpace}
      />
    </div>
  {:else}<p><Label label={forms.string.AutoSpace} /></p>{/if}
  <div class="row">
    <Label label={forms.string.Enabled} />
    <Toggle on={enabled} disabled={toggleDisabled} on:change={(event) => { void save(mode, targetSpace, event.detail) }} />
  </div>
  <p><Label label={mode === 'public' ? forms.string.PublicHint : forms.string.PrivateHint} /></p>
  {#if enabled}<a href={link} target="_blank" rel="noreferrer">{link}</a>{/if}
  <Button label={forms.string.DeleteForm} kind="no-border" disabled={saving} on:click={remove} />
  {#if failed}<p role="alert"><Label label={forms.string.Failed} /></p>{/if}
</div>

<style lang="scss">
  .form-settings {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    padding: var(--spacing-2);
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-BorderRadius);
    font-size: 0.875rem;
    min-width: 0;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-2);
    min-height: 2rem;
  }
  p {
    color: var(--global-secondary-TextColor);
    margin: 0;
  }
  a {
    color: var(--theme-accent-color);
    overflow-wrap: anywhere;
  }
</style>
