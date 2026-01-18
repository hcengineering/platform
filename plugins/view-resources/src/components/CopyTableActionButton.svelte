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
  import { Button } from '@hcengineering/ui'
  import { Class, Doc, DocumentQuery, Ref, WithLookup, mergeQueries } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Viewlet, ViewOptions, ViewOptionModel } from '@hcengineering/view'
  import view from '../plugin'
  import { getResultQuery } from '../viewOptions'
  import { CopyAsMarkdownTable, type CopyAsMarkdownTableProps } from '../copyAsMarkdownTable'

  export let _class: Ref<Class<Doc>> | undefined = undefined
  export let query: DocumentQuery<Doc> | undefined = undefined
  export let resultQuery: DocumentQuery<Doc> | undefined = undefined
  export let config: (string | any)[] | undefined = undefined
  export let viewletConfig: (string | any)[] | undefined = undefined
  export let viewlet: WithLookup<Viewlet> | undefined = undefined
  export let viewOptions: ViewOptions | undefined = undefined
  export let viewOptionsConfig: ViewOptionModel[] | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  // Determine viewlet type from descriptor - only regular tables supported via fallback
  $: isRegularTable = viewlet?.descriptor === view.viewlet.Table
  $: canCopy =
    isRegularTable &&
    (query !== undefined || resultQuery !== undefined) &&
    viewlet !== undefined &&
    _class !== undefined

  async function handleCopy (evt: Event): Promise<void> {
    if (query === undefined && resultQuery === undefined) return
    if (viewlet === undefined || _class === undefined || !isRegularTable) return

    // Use resultQuery if provided (already has filters applied), otherwise compute from query + viewOptions
    let actualQuery: DocumentQuery<Doc>
    if (resultQuery !== undefined) {
      actualQuery = resultQuery
    } else if (query !== undefined) {
      // Compute resultQuery from query + viewOptions if filters are available
      if (viewOptions !== undefined) {
        const p = await getResultQuery(hierarchy, query, viewOptionsConfig, viewOptions)
        actualQuery = mergeQueries(p, query)
      } else {
        actualQuery = query
      }
    } else {
      return
    }

    const docs = await client.findAll(_class, actualQuery, { limit: 1000 })
    if (docs.length === 0) return

    const props: CopyAsMarkdownTableProps = {
      cardClass: _class,
      viewlet,
      config: viewletConfig ?? config,
      query: actualQuery
    }

    await CopyAsMarkdownTable(docs, evt, props)
  }
</script>

{#if canCopy}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <Button
    label={view.string.CopyAsMarkdownTable}
    icon={view.icon.Print}
    kind={'ghost'}
    size={'small'}
    on:click={handleCopy}
  />
{/if}
