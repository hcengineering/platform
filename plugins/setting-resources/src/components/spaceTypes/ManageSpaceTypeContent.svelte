<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022, 2023 Hardcore Engineering Inc.
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
  import { onDestroy } from 'svelte'
  import core, {
    Class,
    Doc,
    IdMap,
    Ref,
    SpaceType,
    WithLookup,
    isOwnerOrMaintainer,
    toIdMap
  } from '@hcengineering/core'
  import {
    Location,
    resolvedLocationStore,
    resizeObserver,
    Breadcrumbs,
    ButtonIcon,
    Header,
    IconCopy,
    IconDelete,
    IconMoreV,
    AnySvelteComponent,
    navigate,
    getCurrentResolvedLocation,
    IconWithEmoji
  } from '@hcengineering/ui'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { showMenu } from '@hcengineering/view-resources'
  import setting, { SpaceTypeEditor } from '@hcengineering/setting'
  import { Asset, getResource } from '@hcengineering/platform'
  import view from '@hcengineering/view'

  import SpaceTypeEditorComponent from './editor/SpaceTypeEditor.svelte'
  import { clearSettingsStore } from '../../store'

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const canEdit = isOwnerOrMaintainer()

  let visibleSecondNav: boolean = true
  let type: WithLookup<SpaceType> | undefined
  let selectedTypeId: Ref<SpaceType> | undefined
  let typesMap: IdMap<SpaceType> | undefined
  let selectedSubEditorId: string | undefined
  let selectedSubObjectId: Ref<Doc> | undefined
  let subItemName: string | undefined
  let subItemIcon: Asset | undefined
  let subItemIconColor: number | undefined

  onDestroy(resolvedLocationStore.subscribe(handleLocationChanged))

  function handleLocationChanged ({ path }: Location): void {
    selectedTypeId = path[4] as Ref<SpaceType>

    if (path.length === 7) {
      selectSubItem(path[5], path[6] as Ref<Doc>)
    } else {
      selectSubItem(undefined, undefined)
    }
  }

  function selectSubItem (editorId: string | undefined, objId: Ref<Doc> | undefined): void {
    selectedSubEditorId = editorId
    selectedSubObjectId = objId
  }

  const typesQuery = createQuery()
  typesQuery.query(
    core.class.SpaceType,
    {},
    (res) => {
      typesMap = toIdMap(res)
    },
    {
      lookup: {
        descriptor: core.class.SpaceTypeDescriptor
      }
    }
  )

  $: type = selectedTypeId !== undefined && typesMap !== undefined ? typesMap.get(selectedTypeId) : undefined
  $: descriptor = type?.$lookup?.descriptor
  $: editorDescriptor =
    type !== undefined
      ? hierarchy.classHierarchyMixin<Class<SpaceType>, SpaceTypeEditor>(type._class, setting.mixin.SpaceTypeEditor)
      : undefined

  $: subEditorRes =
    selectedSubEditorId !== undefined && editorDescriptor !== undefined
      ? editorDescriptor?.subEditors?.[selectedSubEditorId]
      : undefined
  let subEditor: AnySvelteComponent | undefined
  $: if (subEditorRes !== undefined) {
    void getResource(subEditorRes).then((res) => (subEditor = res))
  } else {
    subEditor = undefined
  }

  let bcItems: Array<{ title: string, icon?: Asset | AnySvelteComponent, iconProps?: any }> = []
  $: {
    bcItems = []

    if (type !== undefined) {
      bcItems.push({ title: type.name, icon: descriptor?.icon })

      if (selectedSubObjectId) {
        bcItems.push({
          title: subItemName ?? selectedSubObjectId,
          icon: subItemIcon === view.ids.IconWithEmoji ? IconWithEmoji : subItemIcon,
          iconProps: { icon: subItemIconColor }
        })
      }
    }
  }

  function handleCrumbSelected (event: CustomEvent): void {
    if (event.detail === 0) {
      const loc = getCurrentResolvedLocation()
      loc.path.length = 5

      clearSettingsStore()
      navigate(loc)
    }
  }
</script>

<div
  class="hulyComponent"
  use:resizeObserver={(element) => {
    visibleSecondNav = element.clientWidth > 720
  }}
>
  {#if type !== undefined && descriptor !== undefined}
    <Header>
      <Breadcrumbs
        items={bcItems}
        size="large"
        selected={selectedSubObjectId ? 1 : 0}
        on:select={handleCrumbSelected}
      />
    </Header>
    {#if editorDescriptor !== undefined}
      {#if subEditor === undefined}
        {#key type._id}
          <SpaceTypeEditorComponent
            {type}
            {descriptor}
            {editorDescriptor}
            {visibleSecondNav}
            readonly={!canEdit}
            on:change
          />
        {/key}
      {:else}
        <svelte:component
          this={subEditor}
          bind:name={subItemName}
          bind:icon={subItemIcon}
          bind:color={subItemIconColor}
          readonly={!canEdit}
          spaceType={type}
          {descriptor}
          objectId={selectedSubObjectId}
        />
      {/if}
    {/if}
  {/if}
</div>
