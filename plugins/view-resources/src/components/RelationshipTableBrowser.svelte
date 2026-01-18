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
  import { Class, Doc, DocumentQuery, FindOptions, Ref, generateId } from '@hcengineering/core'
  import { ActionContext } from '@hcengineering/presentation'
  import { Scroller, tableSP } from '@hcengineering/ui'
  import { BuildModelKey, Viewlet, ViewOptionModel, ViewOptions } from '@hcengineering/view'
  import { onDestroy, onMount } from 'svelte'
  import { type ViewletContext, ViewletContextStore, viewletContextStore } from '../viewletContextStore'
  import RelationshipTable from './RelationshipTable.svelte'

  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc>
  export let totalQuery: DocumentQuery<Doc> | undefined = undefined
  export let options: FindOptions<Doc> | undefined = undefined
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined
  export let config: Array<BuildModelKey | string>
  export let viewOptions: ViewOptions | undefined = undefined
  export let viewOptionsConfig: ViewOptionModel[] | undefined = undefined
  export let viewlet: Viewlet | undefined = undefined
  export let readonly = false

  const contextId = generateId()

  // Set viewlet context in store when component mounts/updates
  $: {
    viewletContextStore.update((cur) => {
      const contexts = cur.contexts
      const pos = contexts.findIndex((it) => it.id === contextId)
      const newContext: ViewletContext = {
        id: contextId,
        viewlet,
        config,
        query,
        viewOptions,
        _class
      }
      if (pos === -1) {
        return new ViewletContextStore([...contexts, newContext])
      }
      return new ViewletContextStore(contexts.map((it) => (it.id === contextId ? newContext : it)))
    })
  }

  onMount(() => {
    ;(document.activeElement as HTMLElement)?.blur()
  })

  onDestroy(() => {
    // Remove this context from store when component unmounts
    viewletContextStore.update((cur) => {
      const contexts = cur.contexts
      const pos = contexts.findIndex((it) => it.id === contextId)
      if (pos === -1) {
        return cur
      }
      return new ViewletContextStore(contexts.slice(0, pos))
    })
  })
</script>

<svelte:window />

<ActionContext
  context={{
    mode: 'browser'
  }}
/>

<Scroller fade={tableSP} horizontal>
  <RelationshipTable
    {_class}
    {config}
    {options}
    {query}
    {totalQuery}
    {baseMenuClass}
    highlightRows
    showFooter
    {viewOptions}
    viewOptionsConfig={viewOptionsConfig ?? viewlet?.viewOptions?.other}
    {readonly}
  />
</Scroller>
