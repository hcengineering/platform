<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  // import core from '@hcengineering/core'
  import type { Class, Doc, Ref } from '@hcengineering/core'
  import { getResource } from '@hcengineering/platform'
  import type { AnySvelteComponent, EditStyle } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { KeyedAttribute, getAttribute, updateAttribute } from '../attributes'
  import { getAttributePresenterClass, getClient } from '../utils'

  export let _class: Ref<Class<Doc>>
  export let key: KeyedAttribute | string
  export let object: any
  export let maxWidth: string | undefined = undefined
  export let focus: boolean = false
  export let editable = true
  export let focusIndex = -1
  export let editKind: EditStyle | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: attribute = typeof key === 'string' ? hierarchy.getAttribute(_class, key) : key.attr
  $: attributeKey = typeof key === 'string' ? key : key.key
  $: presenterClass = attribute !== undefined ? getAttributePresenterClass(hierarchy, attribute) : undefined

  let editor: Promise<AnySvelteComponent> | undefined

  $: if (presenterClass !== undefined) {
    const typeClass = hierarchy.getClass(presenterClass.attrClass)
    const editorMixin = hierarchy.as(typeClass, view.mixin.AttributeEditor)
    if (editorMixin.inlineEditor !== undefined) {
      editor = getResource(editorMixin.inlineEditor)
    }
  }

  $: isReadonly = (attribute.readonly ?? false) || !editable

  function onChange (value: any): void {
    if (isReadonly) return
    const doc = object as Doc
    void updateAttribute(client, doc, _class, { key: attributeKey, attr: attribute }, value)
  }
</script>

{#if editor}
  {#await editor}
    ...
  {:then instance}
    <svelte:component
      this={instance}
      label={attribute?.label}
      placeholder={attribute?.label}
      type={attribute?.type}
      readonly={isReadonly}
      editable={!isReadonly}
      disabled={isReadonly}
      {maxWidth}
      {attributeKey}
      value={getAttribute(client, object, { key: attributeKey, attr: attribute })}
      {onChange}
      {focus}
      {focusIndex}
      {editKind}
    />
  {/await}
{/if}
