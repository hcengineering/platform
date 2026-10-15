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
  import card from '@hcengineering/card'
  import core, { AnyAttribute, Class, Doc, DocumentQuery, generateId, Ref, RefTo, Space } from '@hcengineering/core'
  import { findAttributeEditor, getAttrEditor, getClient } from '@hcengineering/presentation'
  import { AnyComponent, Component, Label } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'

  export let key: string
  export let _class: Ref<Class<Doc>>
  export let value: any | undefined = undefined
  export let space: Ref<Space>
  export let selectionSpace: Ref<Space> | undefined = undefined

  export let multiple: boolean = false
  export let docQuery: DocumentQuery<Doc> | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  $: baseAttribute = key === '' || key === '_id' ? mockAttribute(_class) : hierarchy.findAttribute(_class, key)
  $: attribute =
    multiple && baseAttribute !== undefined
      ? { ...baseAttribute, type: { _class: core.class.ArrOf, label: core.string.Array, of: baseAttribute.type } }
      : baseAttribute

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

  let editor: AnyComponent | undefined

  function getEditor (
    _class: Ref<Class<Doc>>,
    key: string,
    multiple: boolean,
    attribute: AnyAttribute | undefined,
    docQuery: DocumentQuery<Doc> | undefined
  ): void {
    if (
      docQuery !== undefined &&
      Object.keys(docQuery).length > 0 &&
      (key === '' || key === '_id') &&
      hierarchy.isDerived(_class, card.class.Card)
    ) {
      editor = hierarchy.classHierarchyMixin(
        card.class.Card as Ref<Class<Doc>>,
        multiple ? view.mixin.ArrayEditor : view.mixin.AttributeEditor
      )?.inlineEditor
      return
    }
    if (multiple && attribute !== undefined) {
      editor = getAttrEditor(attribute.type, hierarchy)
      return
    }
    if (key === '' || key === '_id') {
      const mixin = hierarchy.classHierarchyMixin(_class, view.mixin.AttributeEditor)
      if (mixin?.inlineEditor !== undefined) {
        editor = mixin.inlineEditor
        return
      }
    }
    editor = findAttributeEditor(client, _class, key)
  }

  const dispatch = createEventDispatcher()
  function onChange (val: any | undefined): void {
    value = val
    dispatch('change', val)
  }

  $: getEditor(_class, key, multiple, attribute, docQuery)
</script>

{#if attribute}
  <div>
    <Label label={attribute.label} />:
  </div>
{/if}
{#if editor}
  <div class="w-full">
    <Component
      is={editor}
      props={{
        label: attribute?.label,
        placeholder: attribute?.label,
        kind: 'ghost',
        size: 'large',
        width: '100%',
        justify: 'left',
        type: attribute?.type,
        showNavigate: false,
        value,
        attribute,
        space,
        docQuery: docQuery ?? (selectionSpace !== undefined ? { space: selectionSpace } : undefined),
        onChange,
        onInput: onChange,
        focus
      }}
    />
  </div>
{/if}
