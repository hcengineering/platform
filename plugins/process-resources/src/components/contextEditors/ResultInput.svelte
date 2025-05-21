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
  import { Type } from '@hcengineering/core'
  import presentation, { Card, getClient, getAttrEditor } from '@hcengineering/presentation'
  import { Component, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'

  export let type: Type<any>
  export let name: string = ''

  const dispatch = createEventDispatcher()
  const client = getClient()
  const h = client.getHierarchy()

  const editor = getAttrEditor(type, h)

  let value: any | undefined = undefined

  function onChange (val: any | undefined): void {
    value = val
  }

  export function canClose (): boolean {
    return false
  }

  function save (): void {
    dispatch('close', { value })
  }
</script>

<Card
  width={'menu'}
  on:close
  label={plugin.string.EnterValue}
  canSave={value !== undefined}
  okAction={save}
  okLabel={presentation.string.Save}
>
  <div>
    <Label label={plugin.string.Result} />: {name}
  </div>
  {#if editor}
    <div class="w-full mt-2">
      <Component
        is={editor}
        props={{
          label: plugin.string.Result,
          placeholder: plugin.string.Result,
          kind: 'ghost',
          size: 'large',
          width: '100%',
          justify: 'left',
          type,
          value,
          onChange,
          focus
        }}
      />
    </div>
  {/if}
</Card>
