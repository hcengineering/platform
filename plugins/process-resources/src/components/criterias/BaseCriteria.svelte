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
  import { Context, Process } from '@hcengineering/process'
  import { Component, DropdownLabelsIntl } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { buildResult, Mode, ModeId, Modes, parseValue } from '../../query'
  import BaseCriteriaEditor from './BaseCriteriaEditor.svelte'

  export let readonly: boolean
  export let value: any
  export let process: Process
  export let context: Context
  export let attribute: AnyAttribute
  export let modes: ModeId[] = []

  const modesValues: Mode[] = modes.map((m) => Modes[m])

  let [val, selectedMode] = parseValue(modesValues, value)

  $: mode = selectedMode.id
  const dispatch = createEventDispatcher()

  $: [val, selectedMode] = parseValue(modesValues, value)

  function changeResult (value: any): void {
    const result = buildResult(selectedMode, value)
    value = result
    dispatch('change', result)
  }
</script>

<div class="flex-row-center flex-gap-4">
  <DropdownLabelsIntl
    items={modesValues}
    selected={mode}
    disabled={readonly}
    minW0={false}
    kind={'no-border'}
    width={'100%'}
    on:selected={(e) => {
      mode = e.detail
      const prevEditor = selectedMode.editor ?? selectedMode.withoutEditor ? null : undefined
      selectedMode = modesValues.find((m) => m.id === mode) ?? modesValues[0]
      const newEditor = selectedMode.editor ?? selectedMode.withoutEditor ? null : undefined
      if (prevEditor !== newEditor) {
        val = undefined
      }
      changeResult(val)
    }}
  />
  {#if selectedMode.editor}
    <div class="w-full">
      <Component
        is={selectedMode.editor}
        props={{
          process,
          attribute,
          context,
          readonly,
          val
        }}
        on:change={(e) => {
          changeResult(e.detail)
        }}
        on:delete
      />
    </div>
  {:else if !selectedMode.withoutEditor}
    <BaseCriteriaEditor
      {val}
      {attribute}
      {readonly}
      {process}
      {context}
      on:change={(e) => {
        changeResult(e.detail)
      }}
      on:delete
    />
  {/if}
</div>
