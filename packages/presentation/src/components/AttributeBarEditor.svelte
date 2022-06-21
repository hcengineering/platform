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
  import type { AnyAttribute, Class, Doc, Ref } from '@anticrm/core'
  import { getResource } from '@anticrm/platform'
  import { AnySvelteComponent, Label, tooltip } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { getAttribute, KeyedAttribute, updateAttribute } from '../attributes'
  import { AttributeCategory, getAttributePresenterClass, getClient } from '../utils'

  export let key: KeyedAttribute | string
  export let object: Doc
  export let _class: Ref<Class<Doc>>
  export let maxWidth: string | undefined = undefined
  export let focus: boolean = false
  export let showHeader: boolean = true

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: attribute = typeof key === 'string' ? hierarchy.getAttribute(_class, key) : key.attr
  $: attributeKey = typeof key === 'string' ? key : key.key
  $: presenterClass = attribute !== undefined ? getAttributePresenterClass(hierarchy, attribute) : undefined

  let editor: Promise<void | AnySvelteComponent> | undefined

  function update (
    attribute: AnyAttribute,
    presenterClass?: { attrClass: Ref<Class<Doc>>; category: AttributeCategory }
  ): void {
    if (presenterClass?.attrClass === undefined) {
      return
    }
    const category = presenterClass.category
    let mixinRef = view.mixin.AttributeEditor
    if (category === 'collection') {
      mixinRef = view.mixin.CollectionEditor
    }
    if (category === 'array') {
      mixinRef = view.mixin.ArrayEditor
    }

    const typeClass = hierarchy.getClass(presenterClass.attrClass)
    const editorMixin = hierarchy.as(typeClass, mixinRef)
    if (category === 'array' && editorMixin.inlineEditor === undefined) {
      return
    }
    editor = getResource(editorMixin.inlineEditor).catch((cause) => {
      console.error(`failed to find editor for ${_class} ${attribute} ${presenterClass.attrClass} cause: ${cause}`)
    })
  }
  $: update(attribute, presenterClass)

  function onChange (value: any) {
    const doc = object as Doc
    updateAttribute(client, doc, _class, { key: attributeKey, attr: attribute }, value)
  }
</script>

{#if editor}
  {#await editor then instance}
    {#if showHeader}
      <span
        class="fs-bold overflow-label"
        use:tooltip={{
          component: Label,
          props: { label: attribute.label }
        }}><Label label={attribute.label} /></span
      >
      <div class="flex flex-grow min-w-0">
        <svelte:component
          this={instance}
          label={attribute?.label}
          placeholder={attribute?.label}
          kind={'link'}
          size={'large'}
          width={'100%'}
          justify={'left'}
          type={attribute?.type}
          {maxWidth}
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
          this={instance}
          type={attribute?.type}
          {maxWidth}
          value={getAttribute(client, object, { key: attributeKey, attr: attribute })}
          space={object.space}
          {onChange}
          {focus}
          {object}
        />
      </div>
    {/if}
  {/await}
{/if}
