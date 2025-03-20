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
  import { getAttributeEditor, getAttributePresenterClass, getClient } from '@hcengineering/presentation'
  import { parseContext, Process, SelectedContext, State } from '@hcengineering/process'
  import { AnySvelteComponent, Button, eventToHTMLElement, IconAdd, Label, showPopup, tooltip } from '@hcengineering/ui'
  import { getContext } from '../utils'
  import ContextSelectorPopup from './attributeEditors/ContextSelectorPopup.svelte'
  import ContextValue from './attributeEditors/ContextValue.svelte'

  export let process: Process
  export let state: State
  export let _class: Ref<Class<Doc>>
  export let key: string
  export let object: Record<string, any>

  const client = getClient()
  const hierarchy = client.getHierarchy()

  function onChange (value: any | undefined): void {
    if (value === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (object as any)[key]
    } else {
      ;(object as any)[key] = value
    }
  }

  $: value = object[key]

  $: attribute = hierarchy.getAttribute(_class, key)
  $: presenterClass = getAttributePresenterClass(hierarchy, attribute)
  $: context = getContext(client, process, presenterClass.attrClass, presenterClass.category, attribute._id)

  let editor: AnySvelteComponent | undefined

  function getBaseEditor (_class: Ref<Class<Doc>>, key: string): void {
    void getAttributeEditor(client, _class, key).then((p) => {
      editor = p
    })
  }

  $: getBaseEditor(_class, key)

  $: contextValue = parseContext(value)

  function selectContext (e: MouseEvent): void {
    showPopup(
      ContextSelectorPopup,
      {
        context,
        attribute,
        onSelect
      },
      eventToHTMLElement(e)
    )
  }

  function onSelect (res: SelectedContext | null): void {
    value = res === null ? undefined : '$' + JSON.stringify(res)
    onChange(value)
  }
</script>

{#if editor}
  <span
    class="labelOnPanel"
    use:tooltip={{
      props: { label: attribute.label }
    }}
  >
    <Label label={attribute.label} />
  </span>
  <div class="text-input" class:context={contextValue}>
    {#if contextValue}
      <ContextValue
        {contextValue}
        {context}
        category={presenterClass.category}
        attrClass={presenterClass.attrClass}
        on:update={(e) => {
          onSelect(e.detail)
        }}
      />
    {:else}
      <div class="w-full">
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
    <div class="button">
      <Button
        icon={IconAdd}
        kind="ghost"
        on:click={(e) => {
          selectContext(e)
        }}
      />
    </div>
  </div>
{/if}

<style lang="scss">
  .text-input {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    min-height: 2.5rem;
    border: 0.0625rem solid var(--theme-refinput-border);
    border-radius: 0.375rem;
    max-width: 100%;
    width: 100%;

    .button {
      flex-shrink: 0;
    }

    &.context {
      background: #3575de33;
      padding-left: 0.75rem;
      border-color: var(--primary-button-default);
    }
  }
</style>
