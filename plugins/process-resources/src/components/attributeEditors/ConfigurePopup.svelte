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
  import core, { AnyAttribute, Class, Doc, DocumentQuery, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Context, Func, Process, ProcessFunction, SelectedContext } from '@hcengineering/process'
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
  import { AttributeCategory } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import FallbackEditor from '../contextEditors/FallbackEditor.svelte'

  export let process: Process
  export let contextValue: SelectedContext
  export let context: Context
  export let attribute: AnyAttribute
  export let attrClass: Ref<Class<Doc>>
  export let category: AttributeCategory
  export let onChange: (contextValue: SelectedContext) => void
  export let allowArray: boolean = false
  export let forbidValue: boolean = false

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

  function getReduceFunctions (): Ref<ProcessFunction>[] {
    const model = client.getModel()
    const h = client.getHierarchy()
    const res: Ref<ProcessFunction>[] = []
    const all = model.findAllSync(plugin.class.ProcessFunction, { type: 'reduce' })
    for (const f of all) {
      if (f.category === undefined || (allowArray && f.category === 'array')) {
        if (f.of === core.class.ArrOf || h.isDerived(f.of, attrClass)) {
          res.push(f._id)
        }
      }
    }
    return res
  }

  const reduceFuncs = getReduceFunctions()

  $: availableFunctions = getAvailableFunctions(contextValue.functions, attrClass, category)

  $: functionsLength = contextValue.functions?.length ?? 0

  function getAvailableFunctions (
    functions: Func[] | undefined,
    attrClass: Ref<Class<Doc>>,
    category: AttributeCategory
  ): Ref<ProcessFunction>[] {
    const result: Ref<ProcessFunction>[] = []
    const query: DocumentQuery<ProcessFunction> = {
      type: 'transform',
      category
    }
    if (category !== 'array') {
      query.of = attrClass
    }
    const allFunctions = client.getModel().findAllSync(plugin.class.ProcessFunction, query)
    for (const f of allFunctions) {
      if (functions === undefined || f.allowMany === true || functions.findIndex((p) => p.func === f._id) === -1) {
        result.push(f._id)
      }
    }
    return result
  }

  $: funcs =
    (contextValue.functions?.length ?? 0) > 0
      ? client
        .getModel()
        .findAllSync(plugin.class.ProcessFunction, { _id: { $in: contextValue.functions?.map((it) => it.func) } })
      : []

  $: sourceFunc =
    contextValue.sourceFunction !== undefined
      ? client.getModel().findAllSync(plugin.class.ProcessFunction, { _id: contextValue.sourceFunction.func })[0]
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
    onFunction(e, {}, addFunction)
  }

  function addFunction (func: Func): void {
    const arr = contextValue.functions ?? []
    arr.push(func)
    contextValue.functions = arr
    onChange(contextValue)
  }

  function onSourceFunctionSelect (e: Ref<ProcessFunction>): void {
    onFunction(e, contextValue.sourceFunction?.props ?? {}, (res) => (contextValue.sourceFunction = res))
  }

  function onSourceFunctionChange (e: Func): void {
    contextValue.sourceFunction = e
    onChange(contextValue)
  }

  function onFunction (_func: Ref<ProcessFunction>, props: Record<string, any>, cb: (res: Func) => void) {
    const func = client.getModel().findAllSync(plugin.class.ProcessFunction, { _id: _func })[0]
    if (func.editor === undefined) {
      const res: Func = { func: _func, props: {} }
      cb(res)
      onChange(contextValue)
      closeTooltip()
    } else {
      showPopup(
        func.editor,
        {
          func,
          process,
          masterTag: process.masterTag,
          context,
          attribute,
          props
        },
        elements[0],
        (res) => {
          if (res != null) {
            const result: Func = { func: _func, props: res }
            cb(result)
            onChange(contextValue)
            closeTooltip()
          }
        }
      )
    }
  }

  function onFunctionChange (e: Ref<ProcessFunction>, i: number): void {
    onFunction(e, contextValue.functions?.[i]?.props ?? {}, (res) => {
      if (contextValue.functions === undefined) {
        contextValue.functions = []
      }
      contextValue.functions[i] = res
      contextValue.functions = contextValue.functions
    })
  }

  function getFunctionSelect (i: number): (e: Ref<ProcessFunction>) => void {
    return (e: Ref<ProcessFunction>) => {
      onFunctionChange(e, i)
    }
  }

  function getFunctionChange (i: number): (e: Func) => void {
    return (e: Func) => {
      if (contextValue.functions === undefined) {
        contextValue.functions = []
      }
      contextValue.functions[i] = e
      contextValue.functions = contextValue.functions
      onChange(contextValue)
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

  function onConfigure (e: MouseEvent, func: Func, pos: number): void {
    const f = getFunction(func.func)
    if (contextValue.functions === undefined || f.editor === undefined) return
    const val = contextValue.functions[pos]
    showPopup(
      f.editor,
      {
        func: f,
        masterTag: process.masterTag,
        process,
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

  function getFunction (_id: Ref<ProcessFunction>): ProcessFunction {
    return client.getModel().findAllSync(plugin.class.ProcessFunction, { _id })[0]
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
          attribute,
          process,
          context,
          func: contextValue.sourceFunction,
          availableFunctions: reduceFuncs,
          onSelect: onSourceFunctionSelect,
          onChange: onSourceFunctionChange
        }}
        component={plugin.component.FunctionSubmenu}
        options={{ component: plugin.component.FunctionSelector }}
        withHover
      />
    {/if}
    {#if availableFunctions.length > 0 || functionsLength > 0}
      {#if sourceFunc !== undefined}
        <div class="menu-separator" />
      {/if}
      {#each contextValue.functions ?? [] as f, i}
        {#if reduceFuncs.includes(f.func)}
          <Submenu
            bind:element={elements[i + (sourceFunc !== undefined ? 1 : 0)]}
            on:keydown={(event) => {
              keyDown(event, i + (sourceFunc !== undefined ? 1 : 0))
            }}
            on:mouseover={() => {
              elements[i + (sourceFunc !== undefined ? 1 : 0)]?.focus()
            }}
            label={getFunction(f.func)?.label}
            props={{
              func: f,
              attribute,
              process,
              context,
              availableFunctions: reduceFuncs,
              onSelect: getFunctionSelect(i),
              onChange: getFunctionChange(i)
            }}
            component={plugin.component.FunctionSubmenu}
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
              <Label label={getFunction(f.func).label} />
            </div>
            <div>
              {#if getFunction(f.func).editor}
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
    {#if !forbidValue}
      {#if sourceFunc !== undefined || availableFunctions.length > 0 || functionsLength > 0}
        <div class="menu-separator" />
      {/if}
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
