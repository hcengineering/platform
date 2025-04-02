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
  import core, { AnyAttribute } from '@hcengineering/core'
  import { getResource } from '@hcengineering/platform'
  import presentation, { Card, getClient } from '@hcengineering/presentation'
  import { Context, ProcessFunction } from '@hcengineering/process'
  import { AnySvelteComponent } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import ProcessAttribute from '../ProcessAttribute.svelte'

  export let func: ProcessFunction
  export let context: Context
  export let attribute: AnyAttribute
  export let props: Record<string, any> = {}

  let value: number = props?.offset ?? 0

  const dispatch = createEventDispatcher()
  const client = getClient()
  const h = client.getHierarchy()

  function save (): void {
    dispatch('close', { offset: value })
  }

  let editor: AnySvelteComponent | undefined

  function getEditor (): void {
    try {
      const inlineEditor = h.as(h.getClass(core.class.TypeNumber), view.mixin.AttributeEditor).inlineEditor
      void getResource(inlineEditor)
        .then((p) => {
          editor = p
        })
        .catch((e) => {
          console.error(e)
        })
    } catch (e) {
      console.error(e)
    }
  }

  getEditor()
</script>

<Card on:close width={'menu'} label={func.label} canSave okAction={save} okLabel={presentation.string.Save}>
  <ProcessAttribute
    {context}
    {attribute}
    presenterClass={{
      attrClass: core.class.TypeNumber,
      category: 'attribute'
    }}
    {value}
    {editor}
    on:change={(e) => {
      value = e.detail
    }}
  />
</Card>
