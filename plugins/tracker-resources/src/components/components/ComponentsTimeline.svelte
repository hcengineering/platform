<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Class, Doc, DocumentQuery, FindOptions, Ref } from '@hcengineering/core'
  import { BuildModelKey, ViewOptionModel, ViewOptions, ViewQueryOption } from '@hcengineering/view'
  import {
    ActionContext,
    ListSelectionProvider,
    SelectDirection,
    selectionStore,
    focusStore,
    buildConfigLookup
  } from '@hcengineering/view-resources'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Component } from '@hcengineering/tracker'
  import { getResource } from '@hcengineering/platform'
  import Timeline from './Timeline.svelte'

  export let _class: Ref<Class<Component>>
  export let query: DocumentQuery<Component> = {}
  export let options: FindOptions<Component> | undefined = undefined
  export let config: (string | BuildModelKey)[]
  export let viewOptions: ViewOptions
  export let viewOptionsConfig: ViewOptionModel[] | undefined = undefined

  const selectionProvider = new ListSelectionProvider((offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection) => {
    if (timeline && dir === 'vertical') {
      timeline.onElementSelected(offset, of)
    }
  })

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const componentsQuery = createQuery()

  let timeline: Timeline | undefined
  let components: Component[] | undefined
  let resultOptions: FindOptions<Component> | undefined
  let resultQuery: DocumentQuery<Component> = query

  // TODO: move to "view-resources" utils
  async function getResultQuery<T extends Doc> (
    query: DocumentQuery<T>,
    viewOptions: ViewOptionModel[] | undefined,
    viewOptionsStore: ViewOptions
  ): Promise<DocumentQuery<T>> {
    if (viewOptions === undefined) return query
    let result = hierarchy.clone(query)
    for (const viewOption of viewOptions) {
      if (viewOption.actionTarget !== 'query') continue
      const queryOption = viewOption as ViewQueryOption
      const f = await getResource(queryOption.action)
      result = f(viewOptionsStore[queryOption.key] ?? queryOption.defaultValue, query)
    }
    return result
  }

  $: orderBy = viewOptions.orderBy
  $: lookup = buildConfigLookup(client.getHierarchy(), _class, config, options?.lookup)
  $: resultOptions = { ...options, lookup, sort: { [orderBy[0]]: orderBy[1] } }
  $: getResultQuery(query, viewOptionsConfig, viewOptions).then((res) => (resultQuery = { ...res, ...query }))

  $: componentsQuery.query(_class, resultQuery, (result) => (components = result), resultOptions)
</script>

<ActionContext context={{ mode: 'browser' }} />
<Timeline
  bind:this={timeline}
  {_class}
  {components}
  itemsConfig={config}
  options={resultOptions}
  selectedObjectIds={$selectionStore ?? []}
  selectedRowIndex={selectionProvider.current($focusStore)}
  on:row-focus={(event) => selectionProvider.updateFocus(event.detail ?? undefined)}
  on:check={(event) => selectionProvider.updateSelection(event.detail.docs, event.detail.value)}
/>
