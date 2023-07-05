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
  import { AnySvelteComponent } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { getAttribute, KeyedAttribute, updateAttribute } from '../attributes'
  import { getAttributeEditor, getClient } from '../utils'

  export let key: KeyedAttribute | string
  export let object: Doc | Record<string, any>
  export let _class: Ref<Class<Doc>>
  export let maxWidth: string | undefined = undefined
  export let focus: boolean = false
  export let readonly = false
  export let draft = false
  export let extraProps: Record<string, any> = {}

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  let editor: Promise<void | AnySvelteComponent> | undefined

  function onChange (value: any) {
    const doc = object as Doc
    if (draft) {
      ;(doc as any)[attributeKey] = value
      dispatch('update', { key, value })
    } else {
      updateAttribute(client, doc, _class, { key: attributeKey, attr: attribute }, value)
    }
  }

  $: attribute = typeof key === 'string' ? hierarchy.getAttribute(_class, key) : key.attr
  $: attributeKey = typeof key === 'string' ? key : key.key
  $: editor = getAttributeEditor(client, _class, key)
  $: isReadonly = (attribute.readonly ?? false) || readonly
</script>

{#if editor}
  {#await editor then instance}
    {#if instance}
      <div class="flex min-w-0">
        <svelte:component
          this={instance}
          {...extraProps}
          readonly={isReadonly}
          label={attribute?.label}
          placeholder={attribute?.label}
          kind={'regular'}
          size={'large'}
          width={'100%'}
          justify={'left'}
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
    {/if}
  {/await}
{/if}
