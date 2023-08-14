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
  import type { Class, Doc, DocumentQuery, FindOptions, Ref } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Scroller, tableSP, FadeOptions } from '@hcengineering/ui'
  import { BuildModelKey } from '@hcengineering/view'
  import { onMount } from 'svelte'
  import { focusStore, ListSelectionProvider, SelectDirection, selectionStore } from '../selection'
  import { LoadingProps } from '../utils'
  import SourcePresenter from './inference/SourcePresenter.svelte'
  import Table from './Table.svelte'
  import { ActionContext } from '@hcengineering/presentation'

  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc>
  export let totalQuery: DocumentQuery<Doc> | undefined = undefined
  export let showNotification: boolean = false
  export let options: FindOptions<Doc> | undefined = undefined
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined
  export let config: (BuildModelKey | string)[]
  export let showFilterBar = true
  export let enableChecking = true
  export let tableId: string | undefined = undefined
  export let fade: FadeOptions = tableSP

  // If defined, will show a number of dummy items before real data will appear.
  export let loadingProps: LoadingProps | undefined = undefined

  let table: Table
  const listProvider = new ListSelectionProvider(
    (offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection, noScroll?: boolean) => {
      if (dir === 'vertical') {
        // Select next
        table?.select(offset, of, noScroll)
      }
    }
  )

  onMount(() => {
    ;(document.activeElement as HTMLElement)?.blur()
  })

  // Search config
  let _config = config

  let prefferedSorting: string = 'modifiedOn'

  function updateConfig (config: (BuildModelKey | string)[], search?: string): void {
    const useSearch = search !== '' && search != null
    _config = [
      ...(useSearch
        ? [
            {
              key: '',
              presenter: SourcePresenter,
              label: getEmbeddedLabel('#'),
              sortingKey: '#score',
              props: { search }
            }
          ]
        : []),
      ...config
    ]
    prefferedSorting = !useSearch ? 'modifiedOn' : '#score'
  }

  $: updateConfig(config, query.$search)
</script>

<svelte:window />

<ActionContext
  context={{
    mode: 'browser'
  }}
/>
<Scroller {fade} horizontal={true}>
  <Table
    bind:this={table}
    {_class}
    config={_config}
    {options}
    {query}
    {totalQuery}
    {showNotification}
    {baseMenuClass}
    {loadingProps}
    highlightRows={true}
    {enableChecking}
    showFooter
    checked={$selectionStore ?? []}
    {prefferedSorting}
    {tableId}
    selection={listProvider.current($focusStore)}
    on:row-focus={(evt) => {
      listProvider.updateFocus(evt.detail)
    }}
    on:content={(evt) => {
      listProvider.update(evt.detail)
    }}
    on:check={(evt) => {
      listProvider.updateSelection(evt.detail.docs, evt.detail.value)
    }}
  />
</Scroller>
