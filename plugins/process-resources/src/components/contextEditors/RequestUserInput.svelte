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
  import { Class, Doc, Ref } from '@hcengineering/core'
  import presentation, { Card, getAttributeEditor, getClient } from '@hcengineering/presentation'
  import { AnySvelteComponent } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'

  export let key: string
  export let _class: Ref<Class<Doc>>

  let value: any | undefined = undefined

  const dispatch = createEventDispatcher()
  const client = getClient()
  const attribute = client.getHierarchy().findAttribute(_class, key)

  function save (): void {
    dispatch('close', { value })
  }

  let editor: AnySvelteComponent | undefined

  function getBaseEditor (_class: Ref<Class<Doc>>, key: string): void {
    void getAttributeEditor(client, _class, key).then((p) => {
      editor = p
    })
  }

  function onChange (val: any | undefined): void {
    value = val
  }

  export function canClose (): boolean {
    return false
  }

  $: getBaseEditor(_class, key)
</script>

<Card
  on:close
  width={'menu'}
  label={plugin.string.EnterValue}
  canSave
  okAction={save}
  okLabel={presentation.string.Save}
>
  {#if editor}
    <div class="w-full mt-2">
      <svelte:component
        this={editor}
        label={attribute?.label}
        placeholder={attribute?.label}
        kind={'ghost'}
        size={'large'}
        width={'100%'}
        justify={'left'}
        type={attribute?.type}
        {value}
        {onChange}
        {focus}
      />
    </div>
  {/if}
</Card>
