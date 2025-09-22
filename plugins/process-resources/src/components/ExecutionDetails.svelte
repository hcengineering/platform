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
  import { Doc, WithLookup } from '@hcengineering/core'
  import presentation, { ActionContext, createQuery } from '@hcengineering/presentation'
  import { Execution } from '@hcengineering/process'
  import { Modal, registerFocus } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference, ViewOptions } from '@hcengineering/view'
  import {
    List,
    ListSelectionProvider,
    noCategory,
    SelectDirection,
    ViewletsSettingButton
  } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import NextTriggers from './NextTriggers.svelte'
  import process from '../plugin'
  import ExecutionAllToDos from './ExecutionAllToDos.svelte'

  export let execution: Execution

  const dispatch = createEventDispatcher()

  let list: List

  const listProvider = new ListSelectionProvider(
    (offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection, noScroll?: boolean) => {
      if (dir === 'vertical') {
        // Select next
        list?.select(offset, of, noScroll)
      }
    }
  )
  let docs: Doc[] = []
  function select (): void {
    listProvider.update(docs)
    listProvider.updateFocus(docs[0])
    list?.select(0, undefined)
  }
  const selection = listProvider.selection

  // Focusable control with index
  let focused = false
  export let focusIndex = -1
  registerFocus(focusIndex, {
    focus: () => {
      ;(window.document.activeElement as HTMLElement).blur()
      focused = true
      select()
      return true
    },
    isFocus: () => focused
  })

  let viewlet: WithLookup<Viewlet> | undefined
  let viewOptions: ViewOptions | undefined
  let preference: ViewletPreference | undefined = undefined

  const query = createQuery()
  const viewletId = process.viewlet.ExecutionLogList

  $: query.query(
    view.class.Viewlet,
    {
      _id: viewletId
    },
    (res) => {
      viewlet = res[0]
    },
    {
      lookup: {
        descriptor: view.class.ViewletDescriptor
      }
    }
  )

  const preferenceQuery = createQuery()

  $: if (viewlet != null) {
    preferenceQuery.query(
      view.class.ViewletPreference,
      {
        attachedTo: viewletId
      },
      (res) => {
        preference = res[0]
      },
      { limit: 1 }
    )
  } else {
    preferenceQuery.unsubscribe()
    preference = undefined
  }

  $: selectedConfig = preference?.config ?? viewlet?.config ?? []
  $: config = selectedConfig?.filter((p) =>
    typeof p === 'string'
      ? !p.includes('$lookup') && !p.startsWith('@')
      : !p.key.includes('$lookup') && !p.key.startsWith('@')
  )
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>

<Modal
  type={'type-popup'}
  width={'large'}
  okLabel={presentation.string.Close}
  okAction={() => {
    dispatch('close')
  }}
  canSave={true}
  showCancelButton={false}
  on:close
>
  <NextTriggers {execution} />
  <ExecutionAllToDos value={execution} />
  <div class="flex-row-reverse">
    <ViewletsSettingButton bind:viewOptions viewletQuery={{ _id: viewletId }} kind={'tertiary'} bind:viewlet />
  </div>
  {#if viewlet && viewOptions}
    <List
      bind:this={list}
      baseMenuClass={process.class.ExecutionLog}
      _class={process.class.ExecutionLog}
      space={execution.space}
      query={{
        execution: execution._id
      }}
      {config}
      {viewOptions}
      disableHeader={viewOptions.groupBy?.length === 0 || viewOptions.groupBy[0] === noCategory}
      configurations={undefined}
      flatHeaders={true}
      {listProvider}
      selectedObjectIds={$selection ?? []}
      on:row-focus={(event) => {
        listProvider.updateFocus(event.detail ?? undefined)
      }}
      on:check={(event) => {
        listProvider.updateSelection(event.detail.docs, event.detail.value)
      }}
      on:content={(evt) => {
        docs = evt.detail
        listProvider.update(evt.detail)
        dispatch('docs', docs)
      }}
    />
  {/if}
</Modal>
