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
  import type { Class, Doc, Ref } from '@hcengineering/core'
  import { BuildModelKey } from '@hcengineering/view'
  import {
    ActionContext,
    focusStore,
    ListSelectionProvider,
    SelectDirection,
    selectionStore,
    LoadingProps
  } from '@hcengineering/view-resources'
  import { Component } from '@hcengineering/tracker'
  import { onMount } from 'svelte'
  import ComponentsList from './ComponentsList.svelte'
  import ComponentTimeline from './ComponentTimeline.svelte'
  import { Scroller } from '@hcengineering/ui'

  export let _class: Ref<Class<Doc>>
  export let itemsConfig: (BuildModelKey | string)[]
  export let loadingProps: LoadingProps | undefined = undefined
  export let components: Component[] = []
  export let viewMode: 'list' | 'timeline' = 'list'

  const listProvider = new ListSelectionProvider((offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection) => {
    if (dir === 'vertical') {
      if (viewMode === 'list') componentsList.onElementSelected(offset, of)
      else componentTimeline.onElementSelected(offset, of)
    }
  })

  let componentsList: ComponentsList
  let componentTimeline: ComponentTimeline

  $: if (componentsList !== undefined) {
    listProvider.update(components)
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

{#if viewMode === 'list'}
  <Scroller>
    <ComponentsList
      bind:this={componentsList}
      {_class}
      {itemsConfig}
      {loadingProps}
      {components}
      selectedObjectIds={$selectionStore ?? []}
      selectedRowIndex={listProvider.current($focusStore)}
      on:row-focus={(event) => {
        listProvider.updateFocus(event.detail ?? undefined)
      }}
      on:check={(event) => {
        listProvider.updateSelection(event.detail.docs, event.detail.value)
      }}
    />
  </Scroller>
{:else}
  <ComponentTimeline
    bind:this={componentTimeline}
    {_class}
    {itemsConfig}
    {loadingProps}
    {components}
    selectedObjectIds={$selectionStore ?? []}
    selectedRowIndex={listProvider.current($focusStore)}
    on:row-focus={(event) => {
      listProvider.updateFocus(event.detail ?? undefined)
    }}
    on:check={(event) => {
      listProvider.updateSelection(event.detail.docs, event.detail.value)
    }}
  />
{/if}
