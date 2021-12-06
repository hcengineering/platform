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
  import type { Class, Doc, Ref } from '@anticrm/core'
  import { getResource } from '@anticrm/platform'
  import type { AnySvelteComponent } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { getAttributePresenterClass, getClient } from '../utils'

  export let _class: Ref<Class<Doc>>
  export let key: string
  export let object: any
  export let maxWidth: string
  export let focus: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: attribute = hierarchy.getAttribute(_class, key)
  $: typeClassId = (attribute !== undefined) ? getAttributePresenterClass(attribute) : undefined

  let editor: Promise<AnySvelteComponent> | undefined

  $: if (typeClassId !== undefined) {
    const typeClass = hierarchy.getClass(typeClassId)
    const editorMixin = hierarchy.as(typeClass, view.mixin.AttributeEditor)
    editor = getResource(editorMixin.editor)
  }

  function onChange (value: any) {
    const doc = object as Doc
    client.updateDoc(_class, doc.space, doc._id, { [key]: value })
  }
</script>

{#if editor}
  {#await editor}
    ...
  {:then instance}
    <svelte:component this={instance} label={attribute?.label} placeholder={attribute?.label} {maxWidth} bind:value={object[key]} {onChange} {focus}/>
  {/await}
{/if}

