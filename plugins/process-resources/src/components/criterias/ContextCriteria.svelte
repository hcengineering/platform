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
  import { getAttributePresenterClass, getClient } from '@hcengineering/presentation'
  import {
    Context,
    ContextId,
    Process,
    SelectedExecutionContext,
    UpdateCriteriaComponent
  } from '@hcengineering/process'
  import { AnyComponent, Component } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { getContext, getCriteriaEditor, getMockAttribute } from '../../utils'
  import ExecutionContextPresenter from '../attributeEditors/ExecutionContextPresenter.svelte'
  import { AnyAttribute } from '@hcengineering/core'

  export let process: Process
  export let value: string | undefined
  export let contextId: string
  export let readonly: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  let editor: AnyComponent | undefined
  let context: Context | undefined
  let updateCriteria: UpdateCriteriaComponent | undefined
  let attribute: AnyAttribute | undefined

  $: fill(contextId)

  function fill (contextId: string): void {
    const _ctx = process.context[contextId as ContextId]
    if (_ctx === undefined) {
      editor = undefined
      context = undefined
      attribute = undefined
      updateCriteria = undefined
      return
    }
    const type = _ctx.type
    if (type === undefined) {
      editor = undefined
      context = undefined
      attribute = undefined
      updateCriteria = undefined
      return
    }

    const presenterClass = getAttributePresenterClass(hierarchy, type)
    updateCriteria = getCriteriaEditor(presenterClass.attrClass, presenterClass.category)
    attribute = getMockAttribute(process.masterTag, type.label, type)
    editor = updateCriteria?.editor
    context = getContext(client, process, presenterClass?.attrClass, presenterClass?.category)
  }

  function onChange (e: CustomEvent<any>): void {
    if (e.detail !== undefined) {
      dispatch('change', e.detail)
    }
  }

  let contextValue: SelectedExecutionContext = {
    type: 'context',
    id: contextId as ContextId,
    key: ''
  }

  $: contextValue = {
    type: 'context',
    id: contextId as ContextId,
    key: ''
  }
</script>

{#if editor}
  <ExecutionContextPresenter {process} {contextValue} />
  <Component
    is={editor}
    props={{ value, readonly, context, process, attribute, ...updateCriteria?.props }}
    on:change={onChange}
    on:delete
  />
{/if}
