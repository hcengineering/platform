<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import core, { AnyAttribute, Class, Doc, generateId, Ref, RefTo } from '@hcengineering/core'
  import { getAttributeEditor, getAttributePresenterClass, getClient } from '@hcengineering/presentation'
  import { Process, SlotModel } from '@hcengineering/process'
  import { AnySvelteComponent } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { getContext } from '../../utils'
  import ProcessAttribute from '../ProcessAttribute.svelte'

  export let process: Process
  export let _class: Ref<Class<Doc>>
  export let key: string
  export let object: Record<string, any>
  export let allowRemove: boolean = false
  export let forbidValue: boolean = false
  export let allowArray: boolean = false
  export let objectKey: string | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  function onChange (value: any | undefined): void {
    if (value === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (object as any)[objectKey ?? key]
    } else {
      ;(object as any)[objectKey ?? key] = value
    }
    dispatch('change', { value, object })
  }

  let attribute: AnyAttribute | undefined

  $: value = object[objectKey ?? key]

  $: slot = process.requiredSlots?.[key] as any

  function getAttr (_class: Ref<Class<Doc>>, key: string, slot: SlotModel | undefined): AnyAttribute | undefined {
    if (slot !== undefined) return { name: key, label: slot.label, _id: key, type: slot } as any
    const attr = hierarchy.findAttribute(_class, key)
    if (attr !== undefined) return attr
    if (key === '') return mockAttribute(_class)
    return undefined
  }

  function mockAttribute (_class: Ref<Class<Doc>>): AnyAttribute {
    const type: RefTo<Doc> = {
      label: core.string.Ref,
      _class: core.class.RefTo,
      to: _class
    }
    return {
      attributeOf: _class,
      name: '',
      type,
      _id: generateId(),
      space: core.space.Model,
      modifiedOn: 0,
      modifiedBy: core.account.System,
      _class: core.class.Attribute,
      label: core.string.Object
    }
  }
  $: attribute = getAttr(_class, key, slot)
  $: presenterClass = attribute && getAttributePresenterClass(hierarchy, attribute.type)
  $: context =
    attribute &&
    presenterClass &&
    getContext(client, process, presenterClass.attrClass, presenterClass.category, attribute._id, true)

  let editor: AnySvelteComponent | undefined

  function getBaseEditor (_class: Ref<Class<Doc>>, key: string): void {
    void getAttributeEditor(client, _class, key).then((p) => {
      editor = p
    })
  }

  $: getBaseEditor(_class, key)
</script>

{#if attribute && presenterClass && context}
  <ProcessAttribute
    {process}
    {context}
    {editor}
    {attribute}
    {presenterClass}
    {value}
    masterTag={process.masterTag}
    {allowRemove}
    {allowArray}
    {forbidValue}
    on:remove
    on:change={(e) => {
      onChange(e.detail)
    }}
  />
{/if}
