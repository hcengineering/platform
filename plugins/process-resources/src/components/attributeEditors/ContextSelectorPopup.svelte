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
  import { AnyAttribute, generateId } from '@hcengineering/core'
  import { Context, SelectedContext } from '@hcengineering/process'
  import { Label, resizeObserver, Scroller, Submenu } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import { getValueReduceFunc } from '../../utils'

  export let context: Context
  export let attribute: AnyAttribute
  export let onSelect: (val: SelectedContext | null) => void

  const dispatch = createEventDispatcher()

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

  function onUserRequest (): void {
    onSelect({
      type: 'userRequest',
      id: generateId(),
      _class: attribute.attributeOf,
      key: attribute.name
    })
    dispatch('close')
  }

  function getIndex (ownIndex: number, kind: 'attribute' | 'relation' | 'nested' | 'total'): number {
    if (kind === 'attribute') {
      return ownIndex + 1
    }
    if (kind === 'nested') {
      return ownIndex + context.attributes.length + 1
    }
    if (kind === 'relation') {
      return ownIndex + context.attributes.length + nested.length + 1
    }
    if (kind === 'total') {
      return ownIndex + context.attributes.length + relations.length + nested.length + 1
    }
    return ownIndex
  }
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="menu-space" />
  <Scroller>
    <button
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
    {#if context.attributes.length > 0}
      {#each context.attributes as attr, i}
        <button
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
        {@const index = getIndex(i, 'nested')}
        <Submenu
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
        {@const index = getIndex(i, 'relation')}
        <Submenu
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
