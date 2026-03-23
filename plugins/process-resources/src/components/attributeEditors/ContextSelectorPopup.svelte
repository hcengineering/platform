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
  import { MasterTag, Tag } from '@hcengineering/card'
  import { AnyAttribute, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import {
    Context,
    Process,
    ProcessExecutionContext,
    ProcessFunction,
    RelatedContext,
    SelectedContext
  } from '@hcengineering/process'
  import { eventToHTMLElement, Label, resizeObserver, Scroller, showPopup, Submenu } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import { generateContextId, getRelationObjectReduceFunc, getValueReduceFunc } from '../../utils'
  import ExecutionContextPresenter from './ExecutionContextPresenter.svelte'
  import ConstValuePopup from './ConstValuePopup.svelte'

  export let process: Process
  export let masterTag: Ref<MasterTag | Tag>
  export let context: Context
  export let attribute: AnyAttribute
  export let onSelect: (val: SelectedContext | null) => void
  export let forbidValue: boolean = false

  const dispatch = createEventDispatcher()

  function onClick (val: SelectedContext): void {
    onSelect(val)
    dispatch('close')
  }

  function onAttribute (val: AnyAttribute): void {
    const valueFunc = getValueReduceFunc(val, attribute)
    onClick({
      type: 'attribute',
      key: val.name,
      functions: valueFunc !== undefined ? [valueFunc] : []
    })
  }

  $: processContext = Object.values(context.executionContext)

  $: nested = Object.values(context.nested)
  $: relations = Object.entries(context.relations)
  $: convertible = (context as any).convertible ?? []

  function onUserRequest (): void {
    onSelect({
      type: 'userRequest',
      id: generateContextId(),
      _class: attribute.attributeOf,
      key: attribute.name
    })
    dispatch('close')
  }

  function onFunc (func: Ref<ProcessFunction>): void {
    onSelect({
      type: 'function',
      key: attribute.name,
      func,
      props: {}
    })
    dispatch('close')
  }

  function onProcessContext (ctx: ProcessExecutionContext): void {
    onSelect(ctx.value)
    dispatch('close')
  }

  function getFunc (func: Ref<ProcessFunction>): ProcessFunction {
    const client = getClient()
    const f = client.getModel().getObject(func)
    return f
  }

  function onRelation (val: RelatedContext): void {
    const client = getClient()
    const reduceFunc = getRelationObjectReduceFunc(client, val.association, val.direction, attribute)
    onSelect({
      type: 'relation',
      key: '_id',
      association: val.association,
      direction: val.direction,
      name: val.name,
      functions: [],
      sourceFunction: reduceFunc
    })
    dispatch('close')
  }

  function onConst (e: MouseEvent): void {
    showPopup(ConstValuePopup, { attribute }, eventToHTMLElement(e), (res) => {
      if (res != null) {
        onSelect({
          type: 'const',
          key: attribute.name,
          value: res
        })
      }
      dispatch('close')
    })
  }

  function onConvertSelect (val: SelectedContext | null, func: Ref<ProcessFunction>): void {
    if (val !== null) {
      onClick({
        ...val,
        functions: [{ func, props: {} }, ...(val.functions ?? [])]
      })
    }
  }

  const elements: HTMLElement[] = []

  const keyDown = (event: KeyboardEvent, index: number): void => {
    if (event.key === 'ArrowDown') {
      elements[(index + 1) % elements.length]?.focus()
    }

    if (event.key === 'ArrowUp') {
      elements[(elements.length + index - 1) % elements.length]?.focus()
    }

    if (event.key === 'ArrowLeft') {
      dispatch('close')
    }
  }

  function getOnConvertSelect (func: Ref<ProcessFunction>): (val: SelectedContext | null) => void {
    return (val: SelectedContext | null) => {
      onConvertSelect(val, func)
    }
  }

  $: functionsOffset = 1
  $: processContextOffset = functionsOffset + context.functions.length
  $: attributesOffset = processContextOffset + processContext.length
  $: nestedOffset = attributesOffset + context.attributes.length
  $: relationsOffset = nestedOffset + nested.length
  $: convertibleOffset = relationsOffset + relations.length
  $: customValueIndex = convertibleOffset + convertible.length
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="menu-space" />
  <Scroller>
    <!-- svelte-ignore a11y-mouse-events-have-key-events -->
    <button
      bind:this={elements[0]}
      on:keydown={(event) => {
        keyDown(event, 0)
      }}
      on:mouseover={() => {
        elements[0]?.focus()
      }}
      on:click={() => {
        onUserRequest()
      }}
      class="menu-item"
    >
      <span class="overflow-label pr-1">
        <Label label={plugin.string.RequestFromUser} />
      </span>
    </button>
    <div class="menu-separator" />
    {#if context.functions.length > 0}
      {#each context.functions as f, i}
        {@const func = getFunc(f)}
        {#if func.editor !== undefined}
          <Submenu
            bind:element={elements[functionsOffset + i]}
            on:keydown={(event) => {
              keyDown(event, functionsOffset + i)
            }}
            on:mouseover={() => {
              elements[functionsOffset + i]?.focus()
            }}
            label={func.label}
            props={{
              masterTag,
              context: func,
              target: attribute,
              onSelect: onClick
            }}
            options={{ component: func.editor }}
            withHover
          />
        {:else}
          <!-- svelte-ignore a11y-mouse-events-have-key-events -->
          <button
            bind:this={elements[functionsOffset + i]}
            on:keydown={(event) => {
              keyDown(event, functionsOffset + i)
            }}
            on:mouseover={() => {
              elements[functionsOffset + i]?.focus()
            }}
            on:click={() => {
              onFunc(func._id)
            }}
            class="menu-item"
          >
            <span class="overflow-label pr-1">
              <Label label={func.label} />
            </span>
          </button>
        {/if}
      {/each}
      <div class="menu-separator" />
    {/if}
    {#if processContext.length > 0}
      {#each processContext as pc, i}
        {#if pc.attributes.length > 0}
          <Submenu
            bind:element={elements[processContextOffset + i]}
            on:keydown={(event) => {
              keyDown(event, processContextOffset + i)
            }}
            on:mouseover={() => {
              elements[processContextOffset + i]?.focus()
            }}
            component={ExecutionContextPresenter}
            props={{
              context: pc,
              target: attribute,
              contextValue: pc.value,
              process,
              onSelect: onClick
            }}
            options={{ component: plugin.component.ExecutionContextSelector }}
            withHover
          />
        {:else}
          <!-- svelte-ignore a11y-mouse-events-have-key-events -->
          <button
            bind:this={elements[processContextOffset + i]}
            on:keydown={(event) => {
              keyDown(event, processContextOffset + i)
            }}
            on:mouseover={() => {
              elements[processContextOffset + i]?.focus()
            }}
            on:click={() => {
              onProcessContext(pc)
            }}
            class="menu-item"
          >
            <ExecutionContextPresenter {process} contextValue={pc.value} />
          </button>
        {/if}
      {/each}
      <div class="menu-separator" />
    {/if}
    {#if context.attributes.length > 0}
      {#each context.attributes as attr, i}
        <!-- svelte-ignore a11y-mouse-events-have-key-events -->
        <button
          bind:this={elements[attributesOffset + i]}
          on:keydown={(event) => {
            keyDown(event, attributesOffset + i)
          }}
          on:mouseover={() => {
            elements[attributesOffset + i]?.focus()
          }}
          on:click={() => {
            onAttribute(attr)
          }}
          class="menu-item"
        >
          <span class="overflow-label pr-1">
            <Label label={attr.label} />
          </span>
        </button>
      {/each}
      <div class="menu-separator" />
    {/if}
    {#if nested.length > 0}
      {#each nested as object, i}
        <Submenu
          bind:element={elements[nestedOffset + i]}
          on:keydown={(event) => {
            keyDown(event, nestedOffset + i)
          }}
          on:mouseover={() => {
            elements[nestedOffset + i]?.focus()
          }}
          label={object.attribute.label}
          props={{
            context: object,
            target: attribute,
            onSelect: onClick
          }}
          options={{ component: plugin.component.NestedContextSelector }}
          withHover
        />
      {/each}
      <div class="menu-separator" />
    {/if}
    {#if relations.length > 0}
      {#each relations as object, i}
        {#if object[1].attributes.length === 0}
          <!-- svelte-ignore a11y-mouse-events-have-key-events -->
          <button
            bind:this={elements[relationsOffset + i]}
            on:keydown={(event) => {
              keyDown(event, relationsOffset + i)
            }}
            on:mouseover={() => {
              elements[relationsOffset + i]?.focus()
            }}
            on:click={() => {
              onRelation(object[1])
            }}
            class="menu-item"
          >
            <span class="overflow-label pr-1">
              {object[1].name}
            </span>
          </button>
        {:else}
          <Submenu
            bind:element={elements[relationsOffset + i]}
            on:keydown={(event) => {
              keyDown(event, relationsOffset + i)
            }}
            on:mouseover={() => {
              elements[relationsOffset + i]?.focus()
            }}
            text={object[1].name}
            props={{
              context: object[1],
              onSelect: onClick,
              target: attribute
            }}
            options={{ component: plugin.component.RelatedContextSelector }}
            withHover
          />
        {/if}
      {/each}
    {/if}
    {#if convertible.length > 0}
      {#each convertible as conv, i}
        <Submenu
          bind:element={elements[convertibleOffset + i]}
          on:keydown={(event) => {
            keyDown(event, convertibleOffset + i)
          }}
          on:mouseover={() => {
            elements[convertibleOffset + i]?.focus()
          }}
          label={getFunc(conv.func).label}
          props={{
            process,
            masterTag,
            context: conv.context,
            attribute,
            onSelect: getOnConvertSelect(conv.func)
          }}
          options={{ component: plugin.component.ContextSelectorPopup }}
          withHover
        />
      {/each}
      <div class="menu-separator" />
    {/if}
    {#if !forbidValue}
      <!-- svelte-ignore a11y-mouse-events-have-key-events -->
      <button
        bind:this={elements[customValueIndex]}
        on:keydown={(event) => {
          keyDown(event, customValueIndex)
        }}
        on:mouseover={() => {
          elements[customValueIndex]?.focus()
        }}
        on:click={onConst}
        class="menu-item"
      >
        <span class="overflow-label pr-1">
          <Label label={plugin.string.CustomValue} />
        </span>
      </button>
    {/if}
  </Scroller>
  <div class="menu-space" />
</div>
