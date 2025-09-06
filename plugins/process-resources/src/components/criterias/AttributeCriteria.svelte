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
  import { Doc, DocumentQuery } from '@hcengineering/core'
  import { findAttributeEditor, getAttributePresenterClass, getClient } from '@hcengineering/presentation'
  import { Process } from '@hcengineering/process'
  import { Component, Label, tooltip } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { getCirteriaEditor, getContext } from '../../utils'

  export let readonly: boolean
  export let process: Process
  export let key: string
  export let params: DocumentQuery<Doc>

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: attribute = hierarchy.getAttribute(process.masterTag, key)
  $: presenterClass = getAttributePresenterClass(hierarchy, attribute.type)

  $: editor = getCirteriaEditor(presenterClass.attrClass, presenterClass.category)

  $: baseEditor = findAttributeEditor(client, process.masterTag, key)

  $: value = params[key]

  function onChange (e: CustomEvent<any>): void {
    if (e.detail !== undefined) {
      dispatch('change', { value: e.detail })
    }
  }

  $: context = getContext(client, process, presenterClass.attrClass, presenterClass.category)
</script>

{#if editor}
  <div
    class="labelOnPanel"
    use:tooltip={{
      props: { label: attribute.label }
    }}
  >
    <Label label={attribute.label} />
  </div>
  <Component
    is={editor}
    props={{ value, readonly, context, process, attribute, baseEditor }}
    on:change={onChange}
    on:delete
  />
{/if}
