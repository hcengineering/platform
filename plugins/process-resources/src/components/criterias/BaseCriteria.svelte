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
  import { getAttributePresenterClass, getClient } from '@hcengineering/presentation'
  import { Context, parseContext, Process, SelectedContext } from '@hcengineering/process'
  import {
    AnyComponent,
    Button,
    Component,
    DropdownLabelsIntl,
    eventToHTMLElement,
    IconAdd,
    IconClose,
    showPopup
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { buildResult, Mode, parseValue } from '../../query'
  import ContextSelectorPopup from '../attributeEditors/ContextSelectorPopup.svelte'
  import ContextValue from '../attributeEditors/ContextValue.svelte'

  export let readonly: boolean
  export let value: any
  export let process: Process
  export let context: Context
  export let attribute: AnyAttribute
  export let baseEditor: AnyComponent | undefined
  export let modes: Mode[] = []

  let [val, selectedMode] = parseValue(modes, value)

  $: mode = selectedMode.id
  const dispatch = createEventDispatcher()

  $: [val, selectedMode] = parseValue(modes, value)
  $: contextValue = parseContext(val)

  function selectContext (e: MouseEvent): void {
    showPopup(
      ContextSelectorPopup,
      {
        process,
        masterTag: process.masterTag,
        context,
        attribute,
        onSelect
      },
      eventToHTMLElement(e)
    )
  }

  function onSelect (res: SelectedContext | null): void {
    val = res === null ? undefined : '$' + JSON.stringify(res)
    changeResult()
  }

  function onChange (value: any | undefined): void {
    val = value
    changeResult()
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: presenterClass = getAttributePresenterClass(hierarchy, attribute.type)

  function changeResult () {
    if (!selectedMode.withoutEditor && (val === undefined || val === '')) {
      dispatch('change', null)
      return
    }

    const result = buildResult(selectedMode, val)

    dispatch('change', result)
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
      selectedMode = modes.find((m) => m.id === mode) ?? modes[0]
      changeResult()
    }}
  />
  {#if !selectedMode.withoutEditor}
    <div class="text-input" class:context={contextValue}>
      {#if contextValue}
        <ContextValue
          {process}
          masterTag={process.masterTag}
          {contextValue}
          {context}
          {attribute}
          category={presenterClass.category}
          attrClass={presenterClass.attrClass}
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
  {/if}
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
      border-color: var(--primary-button-default);
    }
  }
</style>
