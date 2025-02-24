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
  import { createEventDispatcher } from 'svelte'
  import core, { AnyAttribute, ArrOf, AttachedDoc, Class, Collection, Doc, Ref, RefTo, Type } from '@hcengineering/core'
  import { IntlString, getResource } from '@hcengineering/platform'
  import presentation, { MessageBox, createQuery, getClient } from '@hcengineering/presentation'
  import {
    Action,
    AnySvelteComponent,
    IconDelete,
    IconEdit,
    Menu,
    getEventPositionElement,
    showPopup
  } from '@hcengineering/ui'
  import { getContextActions } from '@hcengineering/view-resources'
  import settings from '../plugin'
  import ClassAttributeRow from './ClassAttributeRow.svelte'
  import EditAttribute from './EditAttribute.svelte'

  export let _class: Ref<Class<Doc>>
  export let ofClass: Ref<Class<Doc>> | undefined = undefined
  export let notUseOfClass: boolean = false
  export let selected: AnyAttribute | undefined = undefined

  export let attributeMapper:
  | {
    component: AnySvelteComponent
    label: IntlString
    props: Record<string, any>
  }
  | undefined = undefined

  const dispatch = createEventDispatcher()

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const classQuery = createQuery()

  let clazz: Class<Doc> | undefined
  let hovered: number | null = null

  $: classQuery.query(core.class.Class, { _id: _class }, (res) => {
    clazz = res.shift()
  })
  $: attributes = getCustomAttributes(_class)

  function getCustomAttributes (_class: Ref<Class<Doc>>): AnyAttribute[] {
    const cl = hierarchy.getClass(_class)
    const attributes = Array.from(
      hierarchy.getAllAttributes(_class, _class === ofClass && !notUseOfClass ? core.class.Doc : cl.extends).values()
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

  export async function editAttribute (attribute: AnyAttribute, exist: boolean): Promise<void> {
    showPopup(EditAttribute, { attribute, exist }, 'top', update)
  }

  export async function removeAttribute (attribute: AnyAttribute, exist: boolean): Promise<void> {
    showPopup(
      MessageBox,
      {
        label: settings.string.DeleteAttribute,
        message: exist ? settings.string.DeleteAttributeExistConfirm : settings.string.DeleteAttributeConfirm,
        action: async () => {
          await client.remove(attribute)
          update()
        }
      },
      'top'
    )
  }

  async function showMenu (ev: MouseEvent, attribute: AnyAttribute, row: number): Promise<void> {
    hovered = row
    const exist = (await client.findOne(attribute.attributeOf, { [attribute.name]: { $exists: true } })) !== undefined
    const actions: Action[] = [
      {
        label: presentation.string.Edit,
        icon: IconEdit,
        action: async () => {
          dispatch('select', attribute)
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
    const extra = await getContextActions(client, attribute, { mode: 'context' }, core.class.Attribute)
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
    showPopup(Menu, { actions }, getEventPositionElement(ev), () => {
      hovered = null
    })
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
</script>

{#each attributes as attr, i}
  {@const attrType = getAttrType(attr.type)}
  <ClassAttributeRow
    attribute={attr}
    attributeType={attrType}
    selected={selected && attr._id === selected._id}
    hovered={hovered === i}
    {attributeMapper}
    clickMore={async (event) => {
      event.preventDefault()
      void showMenu(event, attr, i)
    }}
    on:contextmenu={async (event) => {
      void showMenu(event, attr, i)
    }}
    on:click={async () => {
      if (selected && selected._id === attr._id) dispatch('deselect')
      else dispatch('select', attr)
    }}
  />
{/each}
