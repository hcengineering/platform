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
  import core, {
    AnyAttribute,
    ArrOf,
    AttachedDoc,
    Class,
    ClassifierKind,
    Collection,
    Doc,
    EnumOf,
    Ref,
    RefTo,
    Type
  } from '@hcengineering/core'
  import { IntlString, getResource } from '@hcengineering/platform'
  import presentation, { MessageBox, createQuery, getClient } from '@hcengineering/presentation'
  import {
    Action,
    ActionIcon,
    AnySvelteComponent,
    CircleButton,
    Icon,
    IconAdd,
    IconDelete,
    IconEdit,
    IconMoreV2,
    Label,
    Menu,
    getEventPositionElement,
    getEventPopupPositionElement,
    showPopup
  } from '@hcengineering/ui'
  import { getContextActions } from '@hcengineering/view-resources'
  import settings from '../plugin'
  import CreateAttribute from './CreateAttribute.svelte'
  import EditAttribute from './EditAttribute.svelte'
  import EditClassLabel from './EditClassLabel.svelte'
  import { settingsStore } from '../store'
  import TypesPopup from './typeEditors/TypesPopup.svelte'

  export let _class: Ref<Class<Doc>>
  export let ofClass: Ref<Class<Doc>> | undefined = undefined
  export let useOfClassAttributes = true
  export let showTitle = true
  export let showCreate = true

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

  $: classQuery.query(core.class.Class, { _id: _class }, (res) => {
    clazz = res.shift()
  })
  $: attributes = getCustomAttributes(_class)

  function getCustomAttributes (_class: Ref<Class<Doc>>): AnyAttribute[] {
    const cl = hierarchy.getClass(_class)
    const attributes = Array.from(
      hierarchy
        .getAllAttributes(_class, _class === ofClass && useOfClassAttributes ? core.class.Doc : cl.extends)
        .values()
    )
    return attributes
  }

  const attrQuery = createQuery()

  $: attrQuery.query(core.class.Attribute, { attributeOf: _class }, () => {
    attributes = getCustomAttributes(_class)
  })

  function update (): void {
    attributes = getCustomAttributes(_class)
  }

  export function createAttribute (ev: MouseEvent): void {
    showPopup(TypesPopup, { _class }, getEventPopupPositionElement(ev), (_id) => {
      if (_id !== undefined) $settingsStore = { component: CreateAttribute, props: { _id, _class } }
    })
  }

  export async function editAttribute (attribute: AnyAttribute, exist: boolean): Promise<void> {
    showPopup(EditAttribute, { attribute, exist }, 'top', update)
  }

  export async function removeAttribute (attribute: AnyAttribute, exist: boolean): Promise<void> {
    showPopup(
      MessageBox,
      {
        label: settings.string.DeleteAttribute,
        message: exist ? settings.string.DeleteAttributeExistConfirm : settings.string.DeleteAttributeConfirm
      },
      'top',
      async (result) => {
        if (result != null) {
          await client.remove(attribute)
          update()
        }
      }
    )
  }

  async function showMenu (ev: MouseEvent, attribute: AnyAttribute): Promise<void> {
    const exist = (await client.findOne(attribute.attributeOf, { [attribute.name]: { $exists: true } })) !== undefined

    const actions: Action[] = [
      {
        label: presentation.string.Edit,
        icon: IconEdit,
        action: async () => {
          await editAttribute(attribute, exist)
        }
      }
    ]
    if (attribute.isCustom === true) {
      actions.push({
        label: presentation.string.Remove,
        icon: IconDelete,
        action: async () => {
          await removeAttribute(attribute, exist)
        }
      })
    }
    const extra = await getContextActions(client, attribute, { mode: 'context' })
    actions.push(
      ...extra.map((it) => ({
        label: it.label,
        icon: it.icon,
        action: async (_: any, evt: Event) => {
          const r = await getResource(it.action)
          await r(attribute, evt, it.actionProps)
        }
      }))
    )
    showPopup(Menu, { actions }, getEventPositionElement(ev))
  }

  function getAttrType (type: Type<any>): IntlString | undefined {
    switch (type._class) {
      case core.class.RefTo:
        return client.getHierarchy().getClass((type as RefTo<Doc>).to).label
      case core.class.Collection:
        return client.getHierarchy().getClass((type as Collection<AttachedDoc>).of).label
      case core.class.ArrOf:
        return (type as ArrOf<Doc>).of.label
      default:
        return undefined
    }
  }

  async function getEnumName (type: Type<any>): Promise<string | undefined> {
    const ref = (type as EnumOf).of
    const res = await client.findOne(core.class.Enum, { _id: ref })
    return res?.name
  }
  function editLabel (evt: MouseEvent): void {
    showPopup(EditClassLabel, { clazz }, getEventPositionElement(evt))
  }
</script>

{#if showTitle}
  <div class="flex-row-center fs-title mb-3">
    {#if clazz?.icon}
      <div class="mr-2 flex">
        <Icon icon={clazz.icon} size={'medium'} />
        {#if clazz.kind === ClassifierKind.MIXIN && hierarchy.hasMixin(clazz, settings.mixin.UserMixin)}
          <Icon icon={IconAdd} size={'x-small'} />
        {/if}
      </div>
    {/if}
    {#if clazz}
      <Label label={clazz.label} />
      {#if clazz.kind === ClassifierKind.MIXIN && hierarchy.hasMixin(clazz, settings.mixin.UserMixin)}
        <div class="ml-2">
          <ActionIcon icon={IconEdit} size="small" action={editLabel} />
        </div>
      {/if}
    {/if}
  </div>
{/if}
{#if showCreate}
  <div class="flex-between trans-title mb-3">
    <Label label={settings.string.Attributes} />
    <CircleButton icon={IconAdd} size="medium" on:click={createAttribute} />
  </div>
{/if}
{#each attributes as attr, i}
  {@const attrType = getAttrType(attr.type)}
  <tr
    class="antiTable-body__row"
    on:contextmenu={(ev) => {
      ev.preventDefault()
      void showMenu(ev, attr)
    }}
  >
    <td>
      {#if i === 0 && clazz?.label !== undefined}
        <div class="trans-title">
          <Label label={clazz.label} />
        </div>
      {/if}
    </td>
    <td>
      <div class="antiTable-cells__firstCell whitespace-nowrap flex-row-center">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div id="context-menu" on:click={(ev) => showMenu(ev, attr)}>
          <div class="p-1">
            <IconMoreV2 size={'medium'} />
          </div>
        </div>
        {#if attr.icon !== undefined}
          <div class="p-1">
            <Icon icon={attr.icon} size={'small'} />
          </div>
        {/if}
        {#if attr.isCustom}
          <div class="trans-title p-1">
            <Label label={settings.string.Custom} />
          </div>
        {/if}
        <div class:accent={!attr.hidden}>
          <Label label={attr.label} />
        </div>
      </div>
    </td>
    <td class="select-text whitespace-nowrap trans-title text-xs text-right" style:padding-right={'1rem !important'}>
      <Label label={attr.type.label} />
      {#if attrType !== undefined}
        : <Label label={attrType} />
      {/if}
      {#if attr.type._class === core.class.EnumOf}
        {#await getEnumName(attr.type) then name}
          {#if name}
            : {name}
          {/if}
        {/await}
      {/if}
    </td>
    {#if attributeMapper}
      <td>
        <svelte:component this={attributeMapper.component} {...attributeMapper.props} attribute={attr} />
      </td>
    {/if}
  </tr>
{/each}
{#if attributes.length === 0}
  <tr class="antiTable-body__row">
    <td>
      <div class="trans-title">
        {#if clazz}
          <Label label={clazz.label} />
        {/if}
      </div>
    </td>
    <td class="select-text whitespace-nowrap"> </td>
    <td> </td>
    {#if attributeMapper}
      <td> </td>
    {/if}
  </tr>
{/if}
