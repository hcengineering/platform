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
  import { getResource, IntlString } from '@hcengineering/platform'
  import presentation, { createQuery, getClient, MessageBox } from '@hcengineering/presentation'
  import {
    Action,
    ActionIcon,
    AnySvelteComponent,
    CircleButton,
    Component,
    getEventPositionElement,
    Icon,
    IconAdd,
    IconDelete,
    IconEdit,
    IconMoreV,
    Label,
    Menu,
    showPopup
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { getContextActions } from '@hcengineering/view-resources/src/actions'
  import settings from '../plugin'
  import CreateAttribute from './CreateAttribute.svelte'
  import EditAttribute from './EditAttribute.svelte'
  import EditClassLabel from './EditClassLabel.svelte'

  export let _class: Ref<Class<Doc>>
  export let ofClass: Ref<Class<Doc>> | undefined

  export let attributeMapper:
    | {
        component: AnySvelteComponent
        label: IntlString
        props: Record<string, any>
      }
    | undefined

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
      hierarchy.getAllAttributes(_class, _class === ofClass ? core.class.Doc : cl.extends).values()
    )
    // const filtred = attributes.filter((p) => !p.hidden)
    return attributes
  }

  const attrQuery = createQuery()

  $: attrQuery.query(core.class.Attribute, { attributeOf: _class }, () => {
    attributes = getCustomAttributes(_class)
  })

  function update () {
    attributes = getCustomAttributes(_class)
  }

  function createAttribute () {
    showPopup(CreateAttribute, { _class }, 'top', update)
  }

  async function editAttribute (attribute: AnyAttribute, exist: boolean): Promise<void> {
    showPopup(EditAttribute, { attribute, exist }, 'top', update)
  }

  async function removeAttribute (attribute: AnyAttribute, exist: boolean): Promise<void> {
    showPopup(
      MessageBox,
      {
        label: settings.string.DeleteAttribute,
        message: exist ? settings.string.DeleteAttributeExistConfirm : settings.string.DeleteAttributeConfirm
      },
      'top',
      async (result) => {
        if (result) {
          await client.remove(attribute)
          update()
        }
      }
    )
  }

  async function showMenu (ev: MouseEvent, attribute: AnyAttribute) {
    const exist = (await client.findOne(attribute.attributeOf, { [attribute.name]: { $exists: true } })) !== undefined

    const actions: Action[] = [
      {
        label: presentation.string.Edit,
        icon: IconEdit,
        action: async () => {
          editAttribute(attribute, exist)
        }
      }
    ]
    if (attribute.isCustom) {
      actions.push({
        label: presentation.string.Remove,
        icon: IconDelete,
        action: async () => {
          removeAttribute(attribute, exist)
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
          r(attribute, evt, it.actionProps)
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
<div class="flex-between trans-title mb-3">
  <Label label={settings.string.Attributes} />
  <CircleButton icon={IconAdd} size="medium" on:click={createAttribute} />
</div>
<table class="antiTable">
  <thead class="scroller-thead">
    <tr class="scroller-thead__tr">
      <!-- <th>Field name</th> -->
      <th>
        <div class="antiTable-cells">
          <Label label={settings.string.Attribute} />
        </div>
      </th>
      <th>
        <div class="antiTable-cells">
          <Label label={settings.string.Type} />
        </div>
      </th>
      <th>
        <div class="antiTable-cells">
          <Label label={settings.string.Visibility} />
        </div>
      </th>
      <th>
        <div class="antiTable-cells">
          <Label label={settings.string.Custom} />
        </div>
      </th>
      {#if attributeMapper}
        <th>
          <Label label={attributeMapper.label} />
        </th>
      {/if}
    </tr>
  </thead>
  <tbody>
    {#each attributes as attr}
      {@const attrType = getAttrType(attr.type)}
      <tr
        class="antiTable-body__row"
        on:contextmenu={(ev) => {
          ev.preventDefault()
          showMenu(ev, attr)
        }}
      >
        <td>
          <div class="antiTable-cells__firstCell whitespace-nowrap">
            <Label label={attr.label} />
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div id="context-menu" class="antiTable-cells__firstCell-menuRow" on:click={(ev) => showMenu(ev, attr)}>
              <IconMoreV size={'small'} />
            </div>
          </div>
        </td>
        <td class="select-text whitespace-nowrap">
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
        <td>
          {#if attr.hidden}
            <Label label={settings.string.Hidden} />
          {/if}
        </td>
        <td>
          <Component is={view.component.BooleanTruePresenter} props={{ value: attr.isCustom ?? false }} />
        </td>
        {#if attributeMapper}
          <td>
            <svelte:component this={attributeMapper.component} {...attributeMapper.props} attribute={attr} />
          </td>
        {/if}
      </tr>
    {/each}
  </tbody>
</table>
