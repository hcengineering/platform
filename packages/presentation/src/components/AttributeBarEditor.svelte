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
  export let vertical: boolean = false

  const _class = object._class
  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: attribute = typeof key === 'string' ? hierarchy.getAttribute(_class, key) : key.attr
  $: attributeKey = typeof key === 'string' ? key : key.key
  $: typeClassId = attribute !== undefined ? getAttributePresenterClass(attribute) : undefined

  let editor: Promise<void | AnySvelteComponent> | undefined

  function update (attribute: AnyAttribute, typeClassId?: Ref<Class<Doc>>): void {
    if (typeClassId !== undefined) {
      const typeClass = hierarchy.getClass(typeClassId)
      const editorMixin = hierarchy.as(typeClass, view.mixin.AttributeEditor)
      editor = getResource(editorMixin.editor).catch((cause) => {
        console.error(`failed to find editor for ${_class} ${attribute} ${typeClassId} cause: ${cause}`)
      })
    }
  }
  $: update(attribute, typeClassId)

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
      {#if !vertical}
        <div class="flex-row-center">
          <CircleButton icon={attribute.icon} size={'large'} />
          {#if !minimize}
            <div class="flex-col with-icon ml-2">
              {#if showHeader}
                <Label label={attribute.label} />
              {/if}
              <div class="value">
                <svelte:component
                  this={instance}
                  label={attribute?.label}
                  placeholder={attribute?.label}
                  type={attribute?.type}
                  {maxWidth}
                  value={getAttribute(client, object, { key: attributeKey, attr: attribute })}
                  space={object.space}
                  {onChange}
                  {focus}
                />
              </div>
            </div>
          {/if}
        </div>
      {:else}
        {#if showHeader}
          <span class="fs-bold overflow-label"><Label label={attribute.label} /></span>
        {/if}
        <svelte:component
          this={instance}
          label={attribute?.label}
          placeholder={attribute?.label}
          type={attribute?.type}
          kind={'link'}
          size={'large'}
          width={'100%'}
          justify={'left'}
          {maxWidth}
          value={getAttribute(client, object, { key: attributeKey, attr: attribute })}
          space={object.space}
          {onChange}
          {focus}
        />
      {/if}
    {:else if showHeader}
      {#if !vertical}
        <div class="flex-col">
          <span class="fs-bold"><Label label={attribute.label} /></span>
          <div class="value">
            <svelte:component
              this={instance}
              label={attribute?.label}
              placeholder={attribute?.label}
              type={attribute?.type}
              kind={'link'}
              size={'large'}
              width={'100%'}
              justify={'left'}
              {maxWidth}
              value={getAttribute(client, object, { key: attributeKey, attr: attribute })}
              space={object.space}
              {onChange}
              {focus}
            />
          </div>
        </div>
      {:else}
        <span class="fs-bold"><Label label={attribute.label} /></span>
        <div class="flex flex-grow">
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
          />
        </div>
      {/if}
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
        />
      </div>
    {/if}
  {/await}
{/if}
