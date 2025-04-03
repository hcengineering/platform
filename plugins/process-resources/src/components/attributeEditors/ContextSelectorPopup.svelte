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
  import { Context, SelectedContext } from '@hcengineering/process'
  import { Label, resizeObserver, Scroller, Submenu } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import { getValueReduceFunc } from '../../utils'

  export let context: Context
  export let attribute: AnyAttribute
  export let onSelect: (val: SelectedContext | null) => void

  const dispatch = createEventDispatcher()

  const elements: HTMLButtonElement[] = []

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

  function onClick (val: SelectedContext): void {
    onSelect(val)
    dispatch('close')
  }

  function onCustom (): void {
    onSelect(null)
    dispatch('close')
  }

  function onAttribute (val: AnyAttribute): void {
    const valueFunc = getValueReduceFunc(val, attribute)
    onClick({
      type: 'attribute',
      key: val.name,
      functions: valueFunc !== undefined ? [{ func: valueFunc, props: {} }] : []
    })
  }

  $: nested = Object.values(context.nested)
  $: relations = Object.entries(context.relations)
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="menu-space" />
  <Scroller>
    {#if context.attributes.length > 0}
      {#each context.attributes as attr, i}
        <!-- svelte-ignore a11y-mouse-events-have-key-events -->
        <button
          bind:this={elements[i]}
          on:keydown={(event) => {
            keyDown(event, i)
          }}
          on:mouseover={() => {
            elements[i]?.focus()
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
          bind:element={elements[i + context.attributes.length]}
          on:keydown={(event) => {
            keyDown(event, i + context.attributes.length)
          }}
          on:mouseover={() => {
            elements[i + context.attributes.length]?.focus()
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
        <Submenu
          bind:element={elements[i + context.attributes.length + nested.length]}
          on:keydown={(event) => {
            keyDown(event, i + context.attributes.length + nested.length)
          }}
          on:mouseover={() => {
            elements[i + context.attributes.length + nested.length]?.focus()
          }}
          text={object[0]}
          props={{
            context: object[1],
            onSelect: onClick,
            target: attribute
          }}
          options={{ component: plugin.component.RelatedContextSelector }}
          withHover
        />
      {/each}
      <div class="menu-separator" />
    {/if}
    <!-- svelte-ignore a11y-mouse-events-have-key-events -->
    <button
      bind:this={elements[context.attributes.length + nested.length + relations.length]}
      on:keydown={(event) => {
        keyDown(event, context.attributes.length + nested.length + relations.length)
      }}
      on:mouseover={() => {
        elements[context.attributes.length + nested.length + relations.length]?.focus()
      }}
      on:click={() => {
        onCustom()
      }}
      class="menu-item"
    >
      <span class="overflow-label pr-1">
        <Label label={plugin.string.CustomValue} />
      </span>
    </button>
  </Scroller>
  <div class="menu-space" />
</div>
