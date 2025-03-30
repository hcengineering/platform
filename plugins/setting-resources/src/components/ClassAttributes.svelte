<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import core, { AnyAttribute, Class, Doc, Ref, Space } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import {
    ActionIcon,
    AnySvelteComponent,
    ButtonIcon,
    IconAdd,
    IconEdit,
    IconSettings,
    Label,
    ModernButton,
    deviceWidths,
    getEventPositionElement,
    resizeObserver,
    showPopup
  } from '@hcengineering/ui'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import { onDestroy } from 'svelte'
  import settings from '../plugin'
  import { clearSettingsStore, settingsStore } from '../store'
  import ClassAttributesList from './ClassAttributesList.svelte'
  import CreateAttribute from './CreateAttribute.svelte'
  import EditAttribute from './EditAttribute.svelte'
  import EditClassLabel from './EditClassLabel.svelte'
  import TypesPopup from './typeEditors/TypesPopup.svelte'

  export let _class: Ref<Class<Doc>>
  export let ofClass: Ref<Class<Doc>> | undefined = undefined
  export let showHierarchy: boolean = false
  export let showTitle: boolean = !showHierarchy
  export let showHeader: boolean = true
  export let disabled: boolean = true
  export let isCard: boolean = false
  export let attributeMapper:
  | {
    component: AnySvelteComponent
    label: IntlString
    props: Record<string, any>
  }
  | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const classQuery = createQuery()

  let clazz: Class<Doc> | undefined
  let classes: Class<Doc>[] = []
  let clazzHierarchy: Class<Doc<Space>>
  let selected: AnyAttribute | undefined = undefined

  $: classQuery.query(core.class.Class, { _id: _class }, (res) => {
    clazz = res.shift()
  })

  const attrQuery = createQuery()

  $: attributes = getCustomAttributes(_class)

  $: attrQuery.query(core.class.Attribute, { attributeOf: _class }, () => {
    attributes = getCustomAttributes(_class)
  })

  function getCustomAttributes (_class: Ref<Class<Doc>>): AnyAttribute[] {
    const cl = hierarchy.getClass(_class)
    const attributes = Array.from(
      hierarchy.getAllAttributes(_class, _class === ofClass ? core.class.Doc : cl.extends).values()
    )
    return attributes
  }

  export function createAttribute (ev: MouseEvent): void {
    if (disabled) {
      return
    }

    showPopup(TypesPopup, { _class }, getEventPositionElement(ev), (_id) => {
      if (_id !== undefined) {
        $settingsStore = { component: CreateAttribute, props: { selectedType: _id, _class, isCard } }
      }
    })
  }

  function editLabel (evt: MouseEvent): void {
    if (disabled) {
      return
    }

    showPopup(EditClassLabel, { clazz }, getEventPositionElement(evt))
  }

  const classUpdated = (_clazz: Ref<Class<Doc>>, to: Ref<Class<Doc>>): void => {
    selected = undefined
    const h = client.getHierarchy()
    const toAncestors = new Set(h.getAncestors(to))
    classes = h
      .getAncestors(_class)
      .map((it) => client.getHierarchy().getClass(it))
      .filter((it) => {
        return (
          !it.hidden &&
          it.label !== undefined &&
          !toAncestors.has(it._id) &&
          it._id !== core.class.Doc &&
          it._id !== core.class.AttachedDoc &&
          it._id !== _class
        )
      })
    clazzHierarchy = client.getHierarchy().getClass(_class)
  }
  $: classUpdated(_class, ofClass ?? core.class.Doc)

  settingsStore.subscribe((value) => {
    if ((value.id === undefined && selected !== undefined) || (value.id !== undefined && value.id !== selected?._id)) {
      selected = undefined
    }
  })
  const handleDeselect = (): void => {
    selected = undefined
    clearSettingsStore()
  }
  const handleSelect = async (event: CustomEvent): Promise<void> => {
    selected = event.detail as AnyAttribute
    if (selected?._id != null) {
      const exist = (await client.findOne(selected.attributeOf, { [selected.name]: { $exists: true } })) !== undefined
      $settingsStore = { id: selected._id, component: EditAttribute, props: { attribute: selected, exist, disabled } }
    }
  }
  onDestroy(() => {
    if (selected !== undefined) clearSettingsStore()
  })
</script>

{#if showTitle}
  {#if clazz}
    <div class="flex-row-center flex-no-shrink mb-6">
      <div class="hulyInput-body">
        <Label label={clazz.label} />
      </div>
      {#if hierarchy.hasMixin(clazz, settings.mixin.UserMixin)}
        <div class="ml-2">
          <ActionIcon icon={IconEdit} size="small" action={editLabel} {disabled} />
        </div>
      {/if}
    </div>
  {/if}
{/if}
<div
  class="hulyTableAttr-container"
  use:resizeObserver={(el) => {
    if (el.clientWidth < deviceWidths[0] && !el.classList.contains('short')) el.classList.add('short')
    else if (el.clientWidth >= deviceWidths[0] && el.classList.contains('short')) el.classList.remove('short')
  }}
>
  <div class="hulyTableAttr-header font-medium-12" class:withButton={showHierarchy}>
    {#if showHeader}
      {#if showHierarchy}
        <ModernButton icon={IconSettings} kind={'secondary'} size={'small'} {disabled} hasMenu>
          <Label label={settings.string.ClassColon} />
          <ObjectPresenter _class={clazzHierarchy._class} objectId={clazzHierarchy._id} value={clazzHierarchy} />
        </ModernButton>
      {:else}
        <IconSettings size={'small'} />
        <span><Label label={settings.string.ClassProperties} /></span>
      {/if}
    {:else}
      <div></div>
    {/if}
    <ButtonIcon
      kind={'primary'}
      icon={IconAdd}
      size={'small'}
      dataId={'btnAdd'}
      {disabled}
      on:click={(ev) => {
        createAttribute(ev)
      }}
    />
  </div>
  {#if showHierarchy}
    <div class="hulyTableAttr-content class withTitle">
      <div class="hulyTableAttr-content__title">
        <Label label={settings.string.Properties} />
      </div>
      <div class="hulyTableAttr-content__wrapper">
        <ClassAttributesList
          {_class}
          {ofClass}
          {attributeMapper}
          {selected}
          on:deselect={handleDeselect}
          on:select={handleSelect}
        />
      </div>
    </div>
    {#each classes as clazz2}
      <div class="hulyTableAttr-content class withTitle">
        <div class="hulyTableAttr-content__title">
          <Label label={clazz2.label} />
        </div>
        <div class="hulyTableAttr-content__wrapper">
          <ClassAttributesList
            _class={clazz2._id}
            {ofClass}
            {attributeMapper}
            {selected}
            notUseOfClass
            on:deselect={handleDeselect}
            on:select={handleSelect}
          />
        </div>
      </div>
    {/each}
  {:else if attributes.length > 0}
    <div class="hulyTableAttr-content class">
      <ClassAttributesList
        {_class}
        {ofClass}
        {attributeMapper}
        {selected}
        on:deselect={handleDeselect}
        on:select={handleSelect}
      />
    </div>
  {/if}
</div>

<style lang="scss">
  .hulyInput-body {
    flex-grow: 1;
    flex-shrink: 0;
    padding: var(--spacing-1) var(--spacing-2);
    font-weight: 500;
    font-size: 1.5rem;
    line-height: 2rem;
    color: var(--input-TextColor);
  }
</style>
