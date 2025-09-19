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
  import core, { AnyAttribute, generateId } from '@hcengineering/core'
  import { getResource } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Process } from '@hcengineering/process'
  import { AnySvelteComponent } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import plugin from '../../plugin'
  import { getContext } from '../../utils'
  import ProcessAttribute from '../ProcessAttribute.svelte'
  import { createEventDispatcher } from 'svelte'

  export let readonly: boolean
  export let process: Process
  export let params: Record<string, any>

  const client = getClient()
  const h = client.getHierarchy()
  $: context = getContext(client, process, core.class.TypeDate, 'attribute')

  const attribute: AnyAttribute = {
    attributeOf: process.masterTag,
    name: '',
    type: {
      label: core.string.Date,
      _class: core.class.TypeDate
    },
    _id: generateId(),
    space: core.space.Model,
    modifiedOn: 0,
    modifiedBy: core.account.System,
    _class: core.class.Attribute,
    label: plugin.string.WaitUntil
  }

  let editor: AnySvelteComponent | undefined

  function getEditor (): void {
    try {
      const inlineEditor = h.as(h.getClass(core.class.TypeDate), view.mixin.AttributeEditor).inlineEditor
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

  const dispatch = createEventDispatcher()
</script>

<div class="editor-grid">
  <ProcessAttribute
    {process}
    masterTag={process.masterTag}
    {context}
    presenterClass={{
      attrClass: core.class.TypeDate,
      category: 'attribute'
    }}
    {attribute}
    {editor}
    bind:value={params.value}
    on:change={(e) => {
      params.value = e.detail
      dispatch('change', params)
    }}
  />
</div>
