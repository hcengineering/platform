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
  import core, { AnyAttribute } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Context, parseContext, Process, SelectedContext } from '@hcengineering/process'
  import {
    AnyComponent,
    Button,
    Component,
    DropdownIntlItem,
    DropdownLabelsIntl,
    eventToHTMLElement,
    IconAdd,
    IconClose,
    showPopup
  } from '@hcengineering/ui'
  import view from '@hcengineering/view-resources/src/plugin'
  import { createEventDispatcher } from 'svelte'
  import { getContext } from '../../utils'
  import ContextSelectorPopup from '../attributeEditors/ContextSelectorPopup.svelte'
  import ContextValue from '../attributeEditors/ContextValue.svelte'

  export let readonly: boolean
  export let value: any
  export let process: Process
  export let context: Context
  export let attribute: AnyAttribute
  export let baseEditor: AnyComponent | undefined

  const client = getClient()

  $: numberContext = getContext(client, process, core.class.TypeNumber, 'attribute')

  const modes: DropdownIntlItem[] = [
    { id: 'all', label: view.string.FilterArrayAll },
    { id: 'any', label: view.string.FilterArrayAny },
    { id: 'notall', label: view.string.NotContains },
    { id: 'size', label: view.string.ArraySizeEquals },
    { id: 'sizeGt', label: view.string.ArraySizeGt },
    { id: 'sizeGte', label: view.string.ArraySizeGte },
    { id: 'sizeLt', label: view.string.ArraySizeLt },
    { id: 'sizeLte', label: view.string.ArraySizeLte }
  ]

  let mode =
    value == null
      ? 'all'
      : value.$all !== undefined
        ? 'all'
        : value.$in !== undefined
          ? 'any'
          : value.$nin !== undefined
            ? 'notIncludes'
            : value.$size !== undefined
              ? typeof value.$size === 'object'
                ? Object.keys(value.$size)[0] === '$gt'
                  ? 'sizeGt'
                  : Object.keys(value.$size)[0] === '$gte'
                    ? 'sizeGte'
                    : Object.keys(value.$size)[0] === '$lt'
                      ? 'sizeLt'
                      : 'sizeLte'
                : 'size'
              : 'all'

  const dispatch = createEventDispatcher()

  let contextValue: SelectedContext | undefined = undefined
  let val: any = undefined

  function selectContext (e: MouseEvent): void {
    showPopup(
      ContextSelectorPopup,
      {
        process,
        masterTag: process.masterTag,
        context: isSize(mode) ? numberContext : context,
        attribute,
        onSelect
      },
      eventToHTMLElement(e)
    )
  }

  $: parseValue(value)

  function parseValue (value: any) {
    if (value?.$all !== undefined) {
      mode = 'all'
      val = value.$all
    } else if (value?.$in !== undefined) {
      mode = 'any'
      val = value.$in
    } else if (value?.$nin !== undefined) {
      mode = 'notIncludes'
      val = value.$nin
    } else if (value?.$size !== undefined) {
      if (typeof value.$size === 'object') {
        const operator = Object.keys(value.$size)[0]
        val = value.$size[operator]
        mode =
          operator === '$gt' ? 'sizeGt' : operator === '$gte' ? 'sizeGte' : operator === '$lt' ? 'sizeLt' : 'sizeLte'
      } else {
        mode = 'size'
        val = value.$size
      }
    } else {
      mode = 'all'
      val = undefined
    }
    contextValue = parseContext(val)
  }

  function onSelect (res: SelectedContext | null): void {
    buildResult(res === null ? undefined : '$' + JSON.stringify(res))
  }

  function onChange (value: any | undefined): void {
    buildResult(value)
  }

  function buildResult (val: any | undefined) {
    if (val === undefined || val === '') {
      dispatch('change', null)
      return
    }

    let result: any
    if (mode === 'all') {
      result = { $all: val }
    } else if (mode === 'any') {
      result = { $in: val }
    } else if (mode === 'notIncludes') {
      result = { $nin: val }
    } else if (mode === 'size') {
      result = { $size: val }
    } else if (mode.startsWith('size')) {
      const operator = mode === 'sizeGt' ? '$gt' : mode === 'sizeGte' ? '$gte' : mode === 'sizeLt' ? '$lt' : '$lte'
      result = { $size: { [operator]: val } }
    }
    value = result
    dispatch('change', result)
  }

  function isSize (mode: string): boolean {
    return mode.startsWith('size')
  }
</script>

<div class="flex-row-center flex-gap-4">
  <DropdownLabelsIntl
    items={modes}
    selected={mode}
    disabled={readonly}
    minW0={false}
    kind={'no-border'}
    width={'100%'}
    on:selected={(e) => {
      mode = e.detail
      buildResult(val)
    }}
  />

  <div class="text-input" class:context={contextValue}>
    {#if !isSize(mode)}
      {#if contextValue}
        <ContextValue
          {process}
          masterTag={process.masterTag}
          {contextValue}
          {context}
          {attribute}
          category={'attribute'}
          attrClass={core.class.ArrOf}
          on:update={(e) => {
            onSelect(e.detail)
          }}
        />
      {:else}
        <div class="w-full">
          {#if baseEditor}
            <Component
              is={baseEditor}
              props={{
                label: attribute?.label,
                placeholder: attribute?.label,
                kind: 'ghost',
                size: 'large',
                width: '100%',
                justify: 'left',
                readonly,
                type: attribute?.type,
                value: val,
                onChange,
                focus
              }}
            />
          {/if}
        </div>
      {/if}
    {:else if contextValue}
      <ContextValue
        {process}
        masterTag={process.masterTag}
        {contextValue}
        context={numberContext}
        {attribute}
        category={'attribute'}
        attrClass={core.class.TypeNumber}
        on:update={(e) => {
          onSelect(e.detail)
        }}
      />
    {:else if !Number.isNaN(val)}
      <div class="w-full">
        <Component
          is={view.component.NumberEditor}
          props={{
            label: attribute?.label,
            placeholder: attribute?.label,
            kind: 'ghost',
            size: 'large',
            width: '100%',
            justify: 'left',
            readonly,
            type: core.class.TypeNumber,
            value: val,
            onChange,
            focus
          }}
        />
      </div>
    {/if}
    <div class="button flex-row-center">
      <Button
        icon={IconAdd}
        kind="ghost"
        on:click={(e) => {
          selectContext(e)
        }}
      />
      <Button
        icon={IconClose}
        kind="ghost"
        on:click={() => {
          dispatch('delete')
        }}
      />
    </div>
  </div>
</div>

<style lang="scss">
  .text-input {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    border: 1px solid var(--theme-refinput-border);
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
