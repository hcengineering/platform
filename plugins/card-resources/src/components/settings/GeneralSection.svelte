<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { type Card, MasterTag } from '@hcengineering/card'
  import core, { type Class, getCurrentAccount, type Ref } from '@hcengineering/core'
  import { getDefinitionPackageInfo, type DefinitionPackageOwner } from '@hcengineering/marketplace'
  import { DefinitionPackageExportPopup, getDefinitionPackageExportItems } from '@hcengineering/marketplace-resources'
  import { TypeBoolean, TypeNumber } from '@hcengineering/model'
  import { getEmbeddedLabel, setPlatformStatus, translateCB, unknownError } from '@hcengineering/platform'
  import { getClient, IconDownload, IconWithEmoji, MessageBox } from '@hcengineering/presentation'
  import setting from '@hcengineering/setting'
  import {
    Button,
    ButtonIcon,
    ButtonMenu,
    type ColorDefinition,
    eventToHTMLElement,
    getCurrentLocation,
    getPlatformColorDef,
    IconDelete,
    IconInfo,
    IconEdit,
    Label,
    ModernEditbox,
    navigate,
    showPopup,
    TextArea,
    themeStore,
    Toggle
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { ColorsPopup, IconPicker } from '@hcengineering/view-resources'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import { exportModule, exportModulePackageSource, importModule } from '../../exporter'
  import { downloadDefinition } from '../../authoring-utils'
  import DefinitionYamlEditor from './DefinitionYamlEditor.svelte'
  import card from '../../plugin'
  import { deleteMasterTag } from '../../utils'
  import ChangeTagParentPopup from './ChangeTagParentPopup.svelte'
  import VersioningSetting from './VersioningSetting.svelte'
  import DuplicateSetting from './DuplicateSetting.svelte'

  export let masterTag: MasterTag

  let name: string = ''
  let description = masterTag.description ?? ''
  let descriptionSourceKey = ''

  $: translateCB(masterTag.label, {}, $themeStore.language, (p) => {
    name = p
  })
  $: {
    const sourceKey = `${masterTag._id}:${masterTag.description ?? ''}`
    if (descriptionSourceKey !== sourceKey) {
      descriptionSourceKey = sourceKey
      description = masterTag.description ?? ''
    }
  }

  const client = getClient()
  const h = client.getHierarchy()
  const dispatch = createEventDispatcher()
  let canChangeTagParent = false
  let parentChangeAvailabilitySource = ''

  async function attributeUpdated<T extends keyof MasterTag> (field: T, value: MasterTag[T]): Promise<void> {
    if (masterTag === undefined || masterTag[field] === value) {
      return
    }

    await client.update(masterTag, { [field]: value })
  }

  async function saveDescription (): Promise<void> {
    const trimmed = description.trim()
    const value = trimmed.length === 0 ? undefined : trimmed
    if (value !== masterTag.description) {
      masterTag.description = value
      descriptionSourceKey = `${masterTag._id}:${value ?? ''}`
      if (value !== undefined) {
        await client.update(masterTag, { description: value })
      } else {
        await client.update(masterTag, { $unset: { description: true } } as any)
      }
    }
  }

  async function handleDelete (): Promise<void> {
    await deleteMasterTag(masterTag, () => {
      const loc = getCurrentLocation()
      if (masterTag.extends !== card.class.Card && masterTag.extends !== undefined) {
        loc.path[4] = masterTag.extends
      } else {
        loc.path.length = 3
      }
      navigate(loc)
    })
  }

  function setIcon (): void {
    showPopup(
      IconPicker,
      { icon: masterTag.icon, color: masterTag.color, showEmoji: true, showColor: false },
      'top',
      async (res) => {
        if (res !== undefined) {
          await client.update(masterTag, { icon: res.icon, color: res.color })
          masterTag.icon = res.icon
          masterTag.color = res.color
        }
      }
    )
  }

  $: isEditable = h.hasMixin(masterTag, setting.mixin.Editable) && h.as(masterTag, setting.mixin.Editable).value

  $: void updateParentChangeAvailability(masterTag)

  async function canChangeParent (tag: MasterTag): Promise<boolean> {
    if (tag._class !== card.class.Tag) return false
    const cards = await client.findAll<Card>(tag._id as Ref<Class<Card>>, {}, { limit: 1 })
    return cards.length === 0
  }

  async function updateParentChangeAvailability (tag: MasterTag): Promise<void> {
    const source = `${tag._id}:${tag._class}`
    parentChangeAvailabilitySource = source
    canChangeTagParent = false
    const canChange = await canChangeParent(tag)
    if (parentChangeAvailabilitySource === source) {
      canChangeTagParent = canChange
    }
  }

  async function openChangeTagParentPopup (): Promise<void> {
    if (!(await canChangeParent(masterTag))) {
      canChangeTagParent = false
      return
    }
    showPopup(ChangeTagParentPopup, { tag: masterTag }, undefined, (result) => {
      if (result?.changed === true) {
        dispatch('change')
      }
    })
  }

  const showColorPopup = (evt: MouseEvent): void => {
    showPopup(
      ColorsPopup,
      { selected: getPlatformColorDef(masterTag.background ?? 0, $themeStore.dark).name },
      eventToHTMLElement(evt),
      async (col) => {
        if (col != null) {
          masterTag.background = col
          await client.update(masterTag, { background: col })
        }
      }
    )
  }

  async function handleExport (format: 'json' | 'yaml'): Promise<void> {
    try {
      downloadDefinition(await exportModule(masterTag._id, format), name, format)
    } catch (error) {
      await setPlatformStatus(unknownError(error))
    }
  }

  async function handlePackageExport (newVersion: boolean): Promise<void> {
    try {
      showPopup(
        DefinitionPackageExportPopup,
        {
          source: '',
          getSource: async (members: DefinitionPackageOwner[]) =>
            await exportModulePackageSource(members.map((member) => member._id as Ref<Class<Card>>)),
          definition: masterTag,
          newVersion,
          onDownload: downloadDefinition
        },
        'centered'
      )
    } catch (error) {
      await setPlatformStatus(unknownError(error))
    }
  }

  function onExportSelected (event: CustomEvent<string | number>): void {
    if (event.detail === 'make-package' || event.detail === 'new-package-version') {
      void handlePackageExport(event.detail === 'new-package-version')
    } else {
      void handleExport(event.detail === 'yaml' ? 'yaml' : 'json')
    }
  }

  async function handleYaml (): Promise<void> {
    try {
      showPopup(
        DefinitionYamlEditor,
        {
          kind: 'card',
          name,
          source: await exportModule(masterTag._id, 'yaml'),
          onApply: async (source: string) => {
            await importModule(source, true)
            return true
          }
        },
        'centered'
      )
    } catch (error) {
      await setPlatformStatus(unknownError(error))
    }
  }

  function getTagStyle (color: ColorDefinition): string {
    return `
    background: ${color.color + '33'};
    border: 1px solid ${color.color + '66'};
    color: ${color.title ?? 'var(--theme-caption-color)'};
  `
  }

  async function saveVersioning (enabled: boolean): Promise<void> {
    versioningUpdating = true
    const previous = h.classHierarchyMixin(masterTag._id, core.mixin.VersionableClass)?.enabled ?? false
    try {
      if (enabled && h.findAttribute(masterTag._id, 'version') === undefined) {
        await client.createDoc(core.class.Attribute, core.space.Model, {
          attributeOf: masterTag._id,
          _class: core.class.Attribute,
          isCustrom: false,
          label: core.string.Version,
          name: 'version',
          readonly: true,
          type: TypeNumber()
        })
      }
      if (enabled && h.findAttribute(masterTag._id, 'isEffective') === undefined) {
        await client.createDoc(core.class.Attribute, core.space.Model, {
          attributeOf: masterTag._id,
          _class: core.class.Attribute,
          isCustrom: false,
          label: card.string.Effective,
          name: 'isEffective',
          readonly: true,
          type: TypeBoolean()
        })
      }
      await client.createMixin(masterTag._id, masterTag._class, masterTag.space, core.mixin.VersionableClass, {
        enabled
      })
      versioningEnabled = enabled
    } catch (error) {
      versioningEnabled = previous
      await setPlatformStatus(unknownError(error))
    } finally {
      versioningUpdating = false
    }
  }

  function changeVersioning (event: CustomEvent<boolean>): void {
    if (h.isMixin(masterTag._id)) return
    versioningEnabled = event.detail
    if (!event.detail) {
      void saveVersioning(false)
      return
    }
    showPopup(
      MessageBox,
      {
        label: card.string.EnableVersioning,
        message: card.string.EnableVersioningConfirm,
        action: async () => {
          await saveVersioning(true)
        }
      },
      undefined,
      () => {
        versioningEnabled = h.classHierarchyMixin(masterTag._id, core.mixin.VersionableClass)?.enabled ?? false
      }
    )
  }

  function versioningSetting (): void {
    showPopup(VersioningSetting, {
      masterTag: masterTag._id
    })
  }

  function duplicateSetting (): void {
    showPopup(DuplicateSetting, {
      masterTag: masterTag._id
    })
  }

  let versioningUpdating = false
  let versioningEnabled = h.classHierarchyMixin(masterTag._id, core.mixin.VersionableClass)?.enabled ?? false
  $: versioningEnabled = h.classHierarchyMixin(masterTag._id, core.mixin.VersionableClass)?.enabled ?? false
  $: hasSubtypes = h
    .getDescendants(masterTag._id)
    .some((it) => it !== masterTag._id && !h.isMixin(it) && h.getClass(it).extends === masterTag._id)

  function handleVisibilityChange (): void {
    if (document.visibilityState === 'hidden') {
      void saveDescription()
    }
  }

  onMount(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onDestroy(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    void saveDescription()
  })
</script>

<div class="hulyComponent-content__column-group">
  <div class="hulyComponent-content__header items-center">
    <div class="flex items-center flex-grow">
      <ButtonIcon
        icon={masterTag.icon === view.ids.IconWithEmoji ? IconWithEmoji : (masterTag.icon ?? card.icon.MasterTag)}
        iconProps={masterTag.icon === view.ids.IconWithEmoji ? { icon: masterTag.color, size: 'large' } : {}}
        size={'large'}
        iconSize={'large'}
        kind={'tertiary'}
        on:click={setIcon}
      />
      <ModernEditbox
        kind="ghost"
        size="large"
        label={masterTag.label}
        value={name}
        on:blur={(evt) => {
          if (evt.detail === undefined || evt.detail.trim().length === 0) {
            return
          }
          if (name !== evt.detail) {
            const emb = getEmbeddedLabel(evt.detail)
            void attributeUpdated('label', emb)
          }
        }}
      />
      <div
        class="background-selector"
        style={getTagStyle(getPlatformColorDef(masterTag.background ?? 0, $themeStore.dark))}
        on:click={showColorPopup}
      />
    </div>
    <ButtonMenu
      icon={IconDownload}
      size={'large'}
      tooltip={{ label: card.string.Export }}
      kind={'tertiary'}
      items={[
        { id: 'json', label: getEmbeddedLabel('JSON') },
        { id: 'yaml', label: getEmbeddedLabel('YAML') },
        ...getDefinitionPackageExportItems(getDefinitionPackageInfo(masterTag), getCurrentAccount().uuid)
      ]}
      noSelection
      on:selected={onExportSelected}
    />
    <ButtonIcon
      icon={IconEdit}
      size="large"
      tooltip={{ label: card.string.YamlEditor }}
      kind="tertiary"
      on:click={handleYaml}
    />
    {#if isEditable}
      <ButtonIcon icon={IconDelete} size={'large'} kind={'tertiary'} on:click={handleDelete} />
    {/if}
  </div>
  <div class="settings-list">
    {#if masterTag._class === card.class.Tag}
      <div class="settings-row">
        <Label label={card.string.Parent} />
        <Button
          label={card.string.ChangeTagParent}
          disabled={!canChangeTagParent}
          on:click={openChangeTagParentPopup}
        />
      </div>
    {/if}
    <div class="description-field">
      <Label label={core.string.Description} />
      <TextArea
        bind:value={description}
        placeholder={core.string.Description}
        width="100%"
        height="5.5rem"
        noFocusBorder
        on:blur={() => {
          void saveDescription()
        }}
      />
    </div>
    {#if !h.isMixin(masterTag._id)}
      <div class="settings-row">
        <Label label={card.string.Versioning} />
        <div class="flex items-center gap-1">
          {#if versioningEnabled}
            <ButtonIcon icon={setting.icon.Setting} size="extra-small" on:click={versioningSetting} />
          {/if}
          <Toggle on={versioningEnabled} disabled={versioningUpdating} on:change={changeVersioning} />
        </div>
      </div>
      <div class="settings-row">
        <Label label={card.string.SingleColumn} />
        <Toggle on={masterTag.singleColumn} on:change={(e) => attributeUpdated('singleColumn', e.detail)} />
      </div>
      {#if hasSubtypes}
        <div class="settings-row">
          <div class="flex items-center gap-1">
            <Label label={card.string.BaseType} />
            <ButtonIcon
              icon={IconInfo}
              size="extra-small"
              kind="tertiary"
              tooltip={{ label: card.string.BaseTypeDescription }}
            />
          </div>
          <Toggle on={masterTag.baseType} on:change={(e) => attributeUpdated('baseType', e.detail)} />
        </div>
      {/if}
      <div class="settings-row">
        <Label label={card.string.Duplicate} />
        <div class="flex items-center gap-1">
          <ButtonIcon icon={setting.icon.Setting} size="extra-small" on:click={duplicateSetting} />
        </div>
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .background-selector {
    margin-left: auto;
    margin-right: 0.5rem;
    width: 1rem;
    height: 1rem;
    border-radius: 0.25rem;
    cursor: pointer;
  }

  .settings-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    margin: 0 var(--spacing-2);
  }

  .settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 2rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  .description-field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  .description-field :global(.textarea textarea) {
    margin: 0;
    min-height: 5.5rem;
    resize: vertical;
    padding: var(--spacing-1_5);
    color: var(--theme-content-color);
    background: var(--theme-bg-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-BorderRadius);
    font-size: 0.875rem;
    font-weight: inherit;
    line-height: 1.35rem;
  }

  .description-field :global(.textarea.no-focus-border textarea:focus),
  .description-field :global(.textarea.no-focus-border textarea:focus-visible) {
    border-color: var(--theme-divider-color);
    outline: none;
    box-shadow: none;
  }
</style>
