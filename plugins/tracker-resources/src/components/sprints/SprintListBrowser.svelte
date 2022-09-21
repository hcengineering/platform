<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import type { Class, Doc, Ref, WithLookup } from '@hcengineering/core'
  import { Sprint } from '@hcengineering/tracker'
  import { BuildModelKey } from '@hcengineering/view'
  import {
    ActionContext,
    focusStore,
    ListSelectionProvider,
    LoadingProps,
    SelectDirection,
    selectionStore
  } from '@hcengineering/view-resources'
  import { onMount } from 'svelte'
  import SprintList from './SprintList.svelte'

  export let _class: Ref<Class<Doc>>
  export let itemsConfig: (BuildModelKey | string)[]
  export let loadingProps: LoadingProps | undefined = undefined
  export let sprints: WithLookup<Sprint>[] = []

  const listProvider = new ListSelectionProvider((offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection) => {
    if (dir === 'vertical') {
      sprintsList.onElementSelected(offset, of)
    }
  })

  let sprintsList: SprintList

  $: if (sprintsList !== undefined) {
    listProvider.update(sprints)
  }

  onMount(() => {
    ;(document.activeElement as HTMLElement)?.blur()
  })
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>

<SprintList
  bind:this={sprintsList}
  {_class}
  {itemsConfig}
  {loadingProps}
  {sprints}
  selectedObjectIds={$selectionStore ?? []}
  selectedRowIndex={listProvider.current($focusStore)}
  on:row-focus={(event) => {
    listProvider.updateFocus(event.detail ?? undefined)
  }}
  on:check={(event) => {
    listProvider.updateSelection(event.detail.docs, event.detail.value)
  }}
/>
