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
  import { ButtonIcon, IconClose, Label, resizeObserver, Scroller, Submenu } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import core, { Class, Doc, Ref } from '@hcengineering/core'
  import { Context, ProcessFunction, SelectedContext } from '@hcengineering/process'
  import { getClient } from '@hcengineering/presentation'
  import { AttributeCategory } from '@hcengineering/view'

  export let contextValue: SelectedContext
  export let context: Context
  export let attrClass: Ref<Class<Doc>>
  export let category: AttributeCategory
  export let onChange: (contextValue: SelectedContext) => void

  const client = getClient()

  const dispatch = createEventDispatcher()

  const elements: HTMLElement[] = []

  const keyDown = (event: KeyboardEvent, index: number): void => {
    if (event.key === 'ArrowDown') {
      elements[(index + 1) % elements.length].focus()
    }

    if (event.key === 'ArrowUp') {
      elements[(elements.length + index - 1) % elements.length].focus()
    }

    if (event.key === 'ArrowLeft') {
      dispatch('close')
    }
  }

  const reduceFuncs = client
    .getModel()
    .findAllSync(plugin.class.ProcessFunction, { of: core.class.ArrOf })
    .map((it) => it._id)

  $: availableFunctions = getAvailableFunctions(context, contextValue.functions, attrClass, category)

  $: functionsLength = contextValue.functions?.length ?? 0

  function getAvailableFunctions (
    context: Context,
    functions: Ref<ProcessFunction>[] | undefined,
    attrClass: Ref<Class<Doc>>,
    category: AttributeCategory
  ): Ref<ProcessFunction>[] {
    const result: Ref<ProcessFunction>[] = []
    const allFunctions = client.getModel().findAllSync(plugin.class.ProcessFunction, { of: attrClass, category })
    for (const f of allFunctions) {
      if (functions === undefined || functions.findIndex((p) => p === f._id) === -1) {
        result.push(f._id)
      }
    }
    return result
  }

  function onFallback (): void {}

  function onFunctionSelect (e: Ref<ProcessFunction>): void {
    const arr = contextValue.functions ?? []
    arr.push(e)
    contextValue.functions = arr
    onChange(contextValue)
  }

  function onSourceFunctionSelect (e: Ref<ProcessFunction>): void {
    contextValue.sourceFunction = e
    onChange(contextValue)
  }

  function onFunctionChange (e: Ref<ProcessFunction>, i: number): void {
    if (contextValue.functions === undefined) return
    contextValue.functions[i] = e
    contextValue.functions = contextValue.functions
    onChange(contextValue)
  }

  function getFunctionChange (i: number): (e: Ref<ProcessFunction>) => void {
    return (e: Ref<ProcessFunction>) => {
      onFunctionChange(e, i)
    }
  }

  function onFunctionRemove (id: Ref<ProcessFunction>): void {
    const arr = contextValue.functions ?? []
    const pos = arr.findIndex((p) => p === id)
    if (pos !== -1) {
      arr.splice(pos, 1)
    }
    contextValue.functions = arr
    onChange(contextValue)
  }

  $: funcs = client.getModel().findAllSync(plugin.class.ProcessFunction, { _id: { $in: contextValue.functions } })

  $: sourceFunc =
    contextValue.sourceFunction !== undefined
      ? client.getModel().findAllSync(plugin.class.ProcessFunction, { _id: contextValue.sourceFunction })[0]
      : undefined
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="menu-space" />
  <Scroller>
    {#if sourceFunc !== undefined}
      <Submenu
        bind:element={elements[0]}
        on:keydown={(event) => {
          keyDown(event, 0)
        }}
        on:mouseover={() => {
          elements[0]?.focus()
        }}
        label={sourceFunc.label}
        props={{
          availableFunctions: reduceFuncs,
          onSelect: onSourceFunctionSelect
        }}
        options={{ component: plugin.component.FunctionSelector }}
        withHover
      />
      <div class="menu-separator" />
    {/if}
    {#if availableFunctions.length > 0 || functionsLength > 0}
      {#each funcs as f, i}
        {#if reduceFuncs.includes(f._id)}
          <Submenu
            bind:element={elements[i + (sourceFunc !== undefined ? 1 : 0)]}
            on:keydown={(event) => {
              keyDown(event, i + (sourceFunc !== undefined ? 1 : 0))
            }}
            on:mouseover={() => {
              elements[i + (sourceFunc !== undefined ? 1 : 0)]?.focus()
            }}
            label={f.label}
            props={{
              availableFunctions: reduceFuncs,
              onSelect: getFunctionChange(i)
            }}
            options={{ component: plugin.component.FunctionSelector }}
            withHover
          />
        {:else}
          <!-- svelte-ignore a11y-mouse-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div
            class="menu-item"
            bind:this={elements[i + (sourceFunc !== undefined ? 1 : 0)]}
            on:keydown={(event) => {
              keyDown(event, i + (sourceFunc !== undefined ? 1 : 0))
            }}
            on:mouseover={() => {
              elements[i + (sourceFunc !== undefined ? 1 : 0)]?.focus()
            }}
          >
            <div>
              <Label label={f.label} />
            </div>
            <div>
              <ButtonIcon
                icon={IconClose}
                size="small"
                kind="tertiary"
                on:click={() => {
                  onFunctionRemove(f._id)
                }}
              />
            </div>
          </div>
        {/if}
      {/each}
      {#if availableFunctions.length > 0}
        <Submenu
          bind:element={elements[functionsLength + (sourceFunc !== undefined ? 1 : 0)]}
          on:keydown={(event) => {
            keyDown(event, functionsLength + (sourceFunc !== undefined ? 1 : 0))
          }}
          on:mouseover={() => {
            elements[functionsLength + (sourceFunc !== undefined ? 1 : 0)]?.focus()
          }}
          label={plugin.string.Functions}
          props={{
            availableFunctions,
            onSelect: onFunctionSelect
          }}
          options={{ component: plugin.component.FunctionSelector }}
          withHover
        />
        <!-- <div class="menu-separator" /> -->
      {/if}
    {/if}
    <!-- svelte-ignore a11y-mouse-events-have-key-events -->
    <!-- <button
      bind:this={elements[functionsLength + 1 + (sourceFunc !== undefined ? 1 : 0)]}
      on:keydown={(event) => {
        keyDown(event, functionsLength + 1 + (sourceFunc !== undefined ? 1 : 0))
      }}
      on:mouseover={() => {
        elements[functionsLength + 1 + (sourceFunc !== undefined ? 1 : 0)]?.focus()
      }}
      on:click={onFallback}
      class="menu-item"
    >
      <span class="overflow-label pr-1">
        <Label label={plugin.string.FallbackValue} />
      </span>
    </button> -->
  </Scroller>
  <div class="menu-space" />
</div>

<style lang="scss">
  .menu-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
</style>
