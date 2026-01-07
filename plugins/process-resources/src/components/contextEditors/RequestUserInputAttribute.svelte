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
  import core, { AnyAttribute, Class, Doc, generateId, Ref, RefTo, Space } from '@hcengineering/core'
  import { findAttributeEditor, getClient } from '@hcengineering/presentation'
  import { AnyComponent, Component, Label } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'

  export let key: string
  export let _class: Ref<Class<Doc>>
  export let value: any | undefined = undefined
  export let space: Ref<Space>

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const attribute = hierarchy.findAttribute(_class, key) ?? (key === '' ? mockAttribute(_class) : undefined)

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

  function getEditor (_class: Ref<Class<Doc>>, key: string): void {
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

  $: getEditor(_class, key)
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
        onChange,
        focus
      }}
    />
  </div>
{/if}
