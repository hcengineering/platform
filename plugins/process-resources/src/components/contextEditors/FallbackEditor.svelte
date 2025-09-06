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
  import { AnyAttribute, Class, Doc, Ref } from '@hcengineering/core'
  import presentation, { Card, getAttributeEditor, getClient } from '@hcengineering/presentation'
  import { SelectedContext } from '@hcengineering/process'
  import { AnySvelteComponent, CheckBox, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'

  export let contextValue: SelectedContext
  export let attribute: AnyAttribute
  let value = contextValue.fallbackValue

  const dispatch = createEventDispatcher()
  const client = getClient()

  function save (): void {
    dispatch('close', { value })
  }

  function errorChange (e: CustomEvent<boolean>): void {
    if (e.detail) {
      value = undefined
    } else {
      value = null
    }
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

  $: getBaseEditor(attribute.attributeOf, attribute.name)
</script>

<Card
  on:close
  width={'menu'}
  label={plugin.string.FallbackValue}
  canSave
  okAction={save}
  okLabel={presentation.string.Save}
>
  <div class="flex-row-center flex-gap-4">
    <div>
      <div class="label">
        <Label label={plugin.string.Required} />
      </div>
      <div class="text-sm">
        <Label label={plugin.string.FallbackValueError} />
      </div>
    </div>
    <CheckBox checked={value === undefined} on:value={errorChange} size={'medium'} kind={'primary'} />
  </div>
  {#if value !== undefined && editor}
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

<style lang="scss">
  .label {
    font-size: 500;
    color: var(--caption-color);
  }
</style>
