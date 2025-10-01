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
  import { AnyAttribute } from '@hcengineering/core'
  import { Card, findAttributeEditor, getClient } from '@hcengineering/presentation'
  import { Component } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let attribute: AnyAttribute

  const client = getClient()
  $: editor = findAttributeEditor(client, attribute.attributeOf, attribute.name)

  const dispatch = createEventDispatcher()

  function save (): void {
    dispatch('close', value)
  }

  function onChange (val: any): void {
    value = val
  }

  let value: any | undefined = undefined
</script>

<Card width={'menu'} label={attribute.label} canSave={value != null} on:close okAction={save}>
  {value}
  {#if editor != null}
    <Component
      is={editor}
      props={{
        attribute,
        showNavigate: false,
        onChange,
        label: attribute.label,
        placeholder: attribute?.label,
        kind: 'ghost',
        size: 'large',
        width: '100%',
        justify: 'left',
        type: attribute?.type
      }}
    />
  {/if}
</Card>
