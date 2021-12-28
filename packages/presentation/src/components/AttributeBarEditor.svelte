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
  import type { AttachedDoc, Doc } from '@anticrm/core'
  import core from '@anticrm/core'
  import { getResource } from '@anticrm/platform'
  import type { AnySvelteComponent } from '@anticrm/ui'
  import { CircleButton, Label } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { getAttribute, KeyedAttribute, updateAttribute } from '../attributes'
  import { getAttributePresenterClass, getClient } from '../utils'

  // export let _class: Ref<Class<Doc>>
  export let key: KeyedAttribute | string
  export let object: Doc
  export let maxWidth: string | undefined = undefined
  export let focus: boolean = false
  export let minimize: boolean = false
  export let showHeader: boolean = true

  const _class = object._class
  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: attribute = typeof key === 'string' ? hierarchy.getAttribute(_class, key) : key.attr
  $: attributeKey = typeof key === 'string' ? key : key.key
  $: typeClassId = (attribute !== undefined) ? getAttributePresenterClass(attribute) : undefined

  let editor: Promise<AnySvelteComponent> | undefined

  $: if (typeClassId !== undefined) {
    const typeClass = hierarchy.getClass(typeClassId)
    const editorMixin = hierarchy.as(typeClass, view.mixin.AttributeEditor)
    editor = getResource(editorMixin.editor)
  }

  function onChange (value: any) {
    const doc = object as Doc
    updateAttribute(client, doc, _class, { key: attributeKey, attr: attribute }, value)
  }
</script>

{#if editor}
  {#await editor}
    ...
  {:then instance}

    {#if attribute.icon}
      <div class="flex-row-center">
        <CircleButton icon={attribute.icon} size={'large'} />
        {#if !minimize}
          <div class="flex-col with-icon ml-2">
            {#if showHeader}
              <Label label={attribute.label} />
            {/if}
            <div class="value"><svelte:component this={instance} label={attribute?.label} placeholder={attribute?.label} {maxWidth} value={getAttribute(client, object, key)} {onChange} {focus}/></div>
          </div>
        {/if}
      </div>
    {:else if showHeader}
      <div class="flex-col">
        <Label label={attribute.label} />
        <div class="value"><svelte:component this={instance} label={attribute?.label} placeholder={attribute?.label} {maxWidth} value={getAttribute(client, object, key)} {onChange} {focus}/></div>
      </div>
    {:else}
      <svelte:component this={instance} {maxWidth} value={getAttribute(client, object, key)} {onChange} {focus}/>
    {/if}

  {/await}
{/if}

