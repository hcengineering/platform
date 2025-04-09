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
  import {
    ButtonIcon,
    CheckBox,
    closeTooltip,
    eventToHTMLElement,
    IconClose,
    IconSettings,
    Label,
    resizeObserver,
    Scroller,
    showPopup,
    Submenu
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import core, { AnyAttribute, Class, Doc, Ref } from '@hcengineering/core'
  import { Context, Func, ProcessFunction, SelectedContext } from '@hcengineering/process'
  import { getClient } from '@hcengineering/presentation'
  import { AttributeCategory } from '@hcengineering/view'
  import FallbackEditor from '../contextEditors/FallbackEditor.svelte'

  export let contextValue: SelectedContext
  export let context: Context
  export let attribute: AnyAttribute
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
    functions: Func[] | undefined,
    attrClass: Ref<Class<Doc>>,
    category: AttributeCategory
  ): Ref<ProcessFunction>[] {
    const result: Ref<ProcessFunction>[] = []
    const allFunctions = client.getModel().findAllSync(plugin.class.ProcessFunction, { of: attrClass, category })
    for (const f of allFunctions) {
      if (functions === undefined || f.allowMany === true || functions.findIndex((p) => p.func === f._id) === -1) {
        result.push(f._id)
      }
    }
    return result
  }

  $: funcs = client
    .getModel()
    .findAllSync(plugin.class.ProcessFunction, { _id: { $in: contextValue.functions?.map((it) => it.func) } })

  $: sourceFunc =
    contextValue.sourceFunction !== undefined
      ? client.getModel().findAllSync(plugin.class.ProcessFunction, { _id: contextValue.sourceFunction })[0]
      : undefined

  $: functionButtonIndex = functionsLength + (sourceFunc !== undefined ? 1 : 0)

  function onFallback (): void {
    showPopup(FallbackEditor, { contextValue, attribute }, elements[functionButtonIndex + 1], (res) => {
      if (res != null) {
        if (res.value !== undefined) {
          contextValue.fallbackValue = res.value
        } else {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete contextValue.fallbackValue
        }
        onChange(contextValue)
      }
    })
  }

  function onFunctionSelect (e: Ref<ProcessFunction>): void {
    // if editor is undefined
    const func = client.getModel().findAllSync(plugin.class.ProcessFunction, { _id: e })[0]
    if (func.editor === undefined) {
      addFunction(e, {})
      closeTooltip()
    } else {
      showPopup(
        func.editor,
        {
          func,
          context,
          attribute
        },
        elements[functionButtonIndex],
        (res) => {
          if (res != null) {
            addFunction(e, res)
          }
        }
      )
    }
  }

  function addFunction (func: Ref<ProcessFunction>, props: Record<string, any>): void {
    const arr = contextValue.functions ?? []
    arr.push({
      func,
      props
    })
    contextValue.functions = arr
    onChange(contextValue)
  }

  function onSourceFunctionSelect (e: Ref<ProcessFunction>): void {
    contextValue.sourceFunction = e
    onChange(contextValue)
  }

  function onFunctionChange (e: Ref<ProcessFunction>, i: number): void {
    if (contextValue.functions === undefined) return
    contextValue.functions[i].func = e
    contextValue.functions = contextValue.functions
    onChange(contextValue)
  }

  function getFunctionChange (i: number): (e: Ref<ProcessFunction>) => void {
    return (e: Ref<ProcessFunction>) => {
      onFunctionChange(e, i)
    }
  }

  function onFunctionRemove (pos: number): void {
    const arr = contextValue.functions ?? []
    if (pos !== -1) {
      arr.splice(pos, 1)
    }
    contextValue.functions = arr
    onChange(contextValue)
  }

  function onConfigure (e: MouseEvent, func: ProcessFunction, pos: number): void {
    if (contextValue.functions === undefined || func.editor === undefined) return
    const val = contextValue.functions[pos]
    showPopup(
      func.editor,
      {
        func,
        context,
        attribute,
        props: val?.props ?? {}
      },
      eventToHTMLElement(e),
      (res) => {
        if (res != null) {
          if (contextValue.functions !== undefined) {
            const func = contextValue.functions[pos]
            if (func === undefined) return
            func.props = res
            contextValue.functions[pos] = func
            contextValue.functions = contextValue.functions
            console.log(contextValue.functions)
            onChange(contextValue)
          }
        }
      }
    )
  }

  function onFallbackChange (): void {
    if (contextValue.fallbackValue === undefined) {
      contextValue.fallbackValue = null
    } else {
      contextValue.fallbackValue = undefined
    }
    onChange(contextValue)
  }
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
              {#if f.editor}
                <ButtonIcon
                  icon={IconSettings}
                  size="small"
                  kind="tertiary"
                  on:click={(e) => {
                    onConfigure(e, f, i)
                  }}
                />
              {/if}
              <ButtonIcon
                icon={IconClose}
                size="small"
                kind="tertiary"
                on:click={() => {
                  onFunctionRemove(i)
                }}
              />
            </div>
          </div>
        {/if}
      {/each}
      {#if availableFunctions.length > 0}
        <Submenu
          bind:element={elements[functionButtonIndex]}
          on:keydown={(event) => {
            keyDown(event, functionButtonIndex)
          }}
          on:mouseover={() => {
            elements[functionButtonIndex]?.focus()
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
    <div class="menu-separator" />
    <!-- svelte-ignore a11y-mouse-events-have-key-events -->
    <button
      bind:this={elements[functionButtonIndex + 1]}
      on:keydown={(event) => {
        keyDown(event, functionButtonIndex + 1)
      }}
      on:mouseover={() => {
        elements[functionButtonIndex + 1]?.focus()
      }}
      on:click={onFallbackChange}
      class="menu-item flex-gap-2 fallback"
    >
      <div>
        <div class="label">
          <Label label={plugin.string.Required} />
        </div>
        <div class="text-sm">
          <Label label={plugin.string.FallbackValueError} />
        </div>
      </div>
      <CheckBox
        on:click={onFallbackChange}
        checked={contextValue.fallbackValue === undefined}
        size={'medium'}
        kind={'primary'}
      />
    </button>
    {#if contextValue.fallbackValue !== undefined}
      <!-- svelte-ignore a11y-mouse-events-have-key-events -->
      <button
        bind:this={elements[functionButtonIndex + 2]}
        on:keydown={(event) => {
          keyDown(event, functionButtonIndex + 2)
        }}
        on:mouseover={() => {
          elements[functionButtonIndex + 2]?.focus()
        }}
        on:click={onFallback}
        class="menu-item"
      >
        <span class="overflow-label pr-1">
          <Label label={plugin.string.FallbackValue} />
        </span>
      </button>
    {/if}
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

  .fallback {
    padding-right: 1.25rem;
  }
</style>
