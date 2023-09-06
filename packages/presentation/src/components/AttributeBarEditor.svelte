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
  import type { Class, Doc, Ref } from '@hcengineering/core'
  import type { AnySvelteComponent, ButtonKind, ButtonSize } from '@hcengineering/ui'
  import { Label, tooltip } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { getAttribute, KeyedAttribute, updateAttribute } from '../attributes'
  import { getAttributeEditor, getClient } from '../utils'

  export let key: KeyedAttribute | string
  export let object: Doc | Record<string, any>
  export let _class: Ref<Class<Doc>>
  export let maxWidth: string | undefined = undefined
  export let focus: boolean = false
  export let showHeader: boolean = true
  export let readonly = false
  export let draft = false

  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let width: string | undefined = '100%'
  export let justify: 'left' | 'center' = 'left'

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()
  let editor: AnySvelteComponent | undefined

  function onChange (value: any) {
    const doc = object as Doc

    dispatch('update', { key, value })

    if (draft) {
      ;(doc as any)[attributeKey] = value
    } else {
      updateAttribute(client, doc, doc._class, { key: attributeKey, attr: attribute }, value)
    }
  }

  function getEditor (_class: Ref<Class<Doc>>, key: KeyedAttribute | string) {
    getAttributeEditor(client, _class, key).then((p) => (editor = p))
  }

  $: getEditor(_class, key)

  $: attribute = typeof key === 'string' ? hierarchy.getAttribute(_class, key) : key.attr
  $: attributeKey = typeof key === 'string' ? key : key.key
  $: isReadonly = (attribute.readonly ?? false) || readonly
</script>

{#if editor}
  {#if showHeader}
    <span
      class="labelOnPanel"
      use:tooltip={{
        component: Label,
        props: { label: attribute.label }
      }}><Label label={attribute.label} /></span
    >
    <div class="flex flex-grow min-w-0">
      <svelte:component
        this={editor}
        readonly={isReadonly}
        editable={!isReadonly}
        disabled={isReadonly}
        label={attribute?.label}
        placeholder={attribute?.label}
        {kind}
        {size}
        {width}
        {justify}
        type={attribute?.type}
        {maxWidth}
        {attributeKey}
        value={getAttribute(client, object, { key: attributeKey, attr: attribute })}
        space={object.space}
        {onChange}
        {focus}
        {object}
      />
    </div>
  {:else}
    <div style="grid-column: 1/3;">
      <svelte:component
        this={editor}
        type={attribute?.type}
        {maxWidth}
        {attributeKey}
        value={getAttribute(client, object, { key: attributeKey, attr: attribute })}
        readonly={isReadonly}
        disabled={isReadonly}
        space={object.space}
        {onChange}
        {focus}
        {object}
        {size}
      />
    </div>
  {/if}
{/if}
